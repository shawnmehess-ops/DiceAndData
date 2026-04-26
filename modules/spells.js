// ============================================================
// SPELLS.JS — Spell database: load, filter, sort, learn
//
// Firestore collection: "spells"
// Each spell document shape:
// {
//   name:         string,
//   level:        0–9  (0 = cantrip),
//   school:       string  (e.g. "Evocation"),
//   castingTime:  string  (e.g. "1 action"),
//   range:        string  (e.g. "60 ft"),
//   duration:     string  (e.g. "Instantaneous"),
//   components: {
//     verbal:     bool,
//     somatic:    bool,
//     material:   bool,
//     materials:  string  (description of material components),
//   },
//   concentration: bool,
//   ritual:        bool,
//   description:   string,
//   requirements:  [{ stat: "f_level", min: 3 }, ...]  — any field ID
//   status:        "pending" | "approved" | "hidden"
//   submittedBy:   uid
//   submittedAt:   timestamp
//   approvedBy:    uid | null
//   approvedAt:    timestamp | null
// }
// ============================================================
import {
    collection, getDocs, addDoc, query, where, orderBy
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

import { db, auth }       from "./firebase.js";
import { state }          from "./state.js";
import { getFieldById }   from "./state.js";
import { renderSpellbook, setSpellDbCache } from "./spellbook.js";

// ---- Module state ------------------------------------------
let allSpells      = [];
let activeLevel    = "all";
let activeSchool   = "all";
let searchQuery    = "";
let sortCol        = "level";
let sortAsc        = true;
let expandedId     = null;
let debouncedSave  = () => {};

export function setDebouncedSave(fn) { debouncedSave = fn; }

export const SPELL_SCHOOLS = [
    "Abjuration", "Conjuration", "Divination", "Enchantment",
    "Evocation", "Illusion", "Necromancy", "Transmutation",
];

export const LEVEL_LABELS = {
    0: "Cantrip", 1: "1st", 2: "2nd", 3: "3rd",
    4: "4th", 5: "5th", 6: "6th", 7: "7th", 8: "8th", 9: "9th",
};

const SCHOOL_COLORS = {
    Abjuration:   "#5070c0", Conjuration:  "#50a070", Divination:   "#c0a030",
    Enchantment:  "#c05090", Evocation:    "#c05050", Illusion:     "#9060c0",
    Necromancy:   "#507060", Transmutation:"#806040",
};

// ---- Normalize spell document to internal format -----------
// Handles both the legacy flat format and the uploaded nested
// "player.*" format, mapping whichever is present to the fields
// the rest of the app expects.
function normalizeSpell(raw) {
    const p = raw.player ?? {};

    // Level: prefer flat raw.level, fall back to player.level
    const level = raw.level != null
        ? parseInt(raw.level) || 0
        : parseInt(p.level)  || 0;

    // School: prefer flat raw.school, fall back to player.school
    const school = raw.school
        ?? (Array.isArray(p.school) ? p.school[0] : p.school)
        ?? "";

    // Casting time: prefer flat string, fall back to player.castingTime.raw
    const castingTime = (typeof raw.castingTime === "string" ? raw.castingTime : null)
        ?? p.castingTime?.raw
        ?? p.castingTime
        ?? "";

    // Range: prefer flat raw.range, fall back to player.range
    const range = raw.range ?? p.range ?? "";

    // Duration: prefer flat string, fall back to player.duration.raw
    const duration = (typeof raw.duration === "string" ? raw.duration : null)
        ?? p.duration?.raw
        ?? p.duration
        ?? "";

    // Description: prefer flat raw.description, fall back to player.description
    const description = raw.description ?? p.description ?? "";

    // Components: prefer existing nested object, fall back to player.components
    let components = raw.components;
    if (!components || typeof components !== "object") {
        const pc = p.components;
        if (pc && typeof pc === "object") {
            // player.components may be { V: true, S: true, M: "bat fur..." } or similar
            components = {
                verbal:    !!(pc.verbal   ?? pc.V ?? pc.v),
                somatic:   !!(pc.somatic  ?? pc.S ?? pc.s),
                material:  !!(pc.material ?? pc.M ?? pc.m),
                materials: pc.materials ?? (typeof pc.M === "string" ? pc.M : "") ?? "",
            };
        } else {
            components = { verbal: false, somatic: false, material: false, materials: "" };
        }
    }

    // concentration / ritual
    const concentration = raw.concentration ?? p.concentration ?? false;
    const ritual        = raw.ritual        ?? p.ritual        ?? false;

    // classes (informational only — stored for future filtering)
    const classes = raw.classes ?? p.classes ?? [];

    return {
        // Preserve all original fields so nothing is lost
        ...raw,
        // Then overwrite with normalised values
        level,
        school,
        castingTime,
        range,
        duration,
        description,
        components,
        concentration: !!concentration,
        ritual:        !!ritual,
        classes,
    };
}

// ---- Load from Firestore -----------------------------------
// NOTE: orderBy is intentionally omitted. Combining where("status")
// with orderBy("level") requires a composite Firestore index that may
// not exist, silently returning nothing. Sorting is handled client-side
// by filteredSorted() instead.
export async function loadSpells() {
    const q = query(
        collection(db, "spells"),
        where("status", "==", "approved")
    );
    const snap = await getDocs(q);
    allSpells = snap.docs.map(d => normalizeSpell({ id: d.id, ...d.data() }));
    setSpellDbCache(allSpells);
    return allSpells;
}

// ---- Requirement checking ----------------------------------
// requirements: [{ stat: "f_level", min: 5 }, { stat: "f_int", min: 14 }]
export function meetsRequirements(spell) {
    const reqs = spell.requirements ?? [];
    if (!reqs.length) return { ok: true, failures: [] };

    const failures = [];
    for (const req of reqs) {
        const field = getFieldById(req.stat);
        const val   = field ? (parseInt(field.value) || 0) : 0;
        if (val < req.min) {
            failures.push({
                label: field?.label ?? req.stat,
                need:  req.min,
                have:  val,
            });
        }
    }
    return { ok: failures.length === 0, failures };
}

// ---- Already known? ----------------------------------------
export function alreadyKnows(spellId) {
    return state.spells.some(s => s.sourceSpellId === spellId);
}

// ---- Learn spell -------------------------------------------
export function learnSpell(spell) {
    if (alreadyKnows(spell.id)) return { ok: false, error: "Already known." };

    const { ok, failures } = meetsRequirements(spell);
    if (!ok) {
        const detail = failures.map(f => `${f.label} ${f.have}/${f.need}`).join(", ");
        return { ok: false, error: `Requirements not met: ${detail}` };
    }

    state.spells.push({
        id:            `sp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        sourceSpellId: spell.id,
        name:          spell.name,
        level:         spell.level,
        prepared:      spell.level === 0, // cantrips are always prepared
        learnedAt:     Date.now(),
    });

    renderSpellbook();
    debouncedSave();
    return { ok: true };
}

// ---- Filter + sort -----------------------------------------
function filteredSorted() {
    let spells = allSpells.filter(sp => {
        const matchLevel  = activeLevel  === "all" || sp.level  === parseInt(activeLevel);
        const matchSchool = activeSchool === "all" || sp.school === activeSchool;
        const matchSearch = !searchQuery ||
            sp.name.toLowerCase().includes(searchQuery) ||
            (sp.description ?? "").toLowerCase().includes(searchQuery) ||
            (sp.school ?? "").toLowerCase().includes(searchQuery);
        return matchLevel && matchSchool && matchSearch;
    });

    spells = [...spells].sort((a, b) => {
        let av, bv;
        switch (sortCol) {
            case "name":   av = a.name.toLowerCase();   bv = b.name.toLowerCase();   break;
            case "level":  av = a.level;                bv = b.level;                break;
            case "school": av = (a.school ?? "").toLowerCase(); bv = (b.school ?? "").toLowerCase(); break;
            default:       av = a.level; bv = b.level;
        }
        if (av < bv) return sortAsc ? -1 :  1;
        if (av > bv) return sortAsc ?  1 : -1;
        return 0;
    });

    return spells;
}

// ---- Components string helper ------------------------------
export function componentsStr(spell) {
    const c = spell.components ?? {};
    const parts = [];
    if (c.verbal)   parts.push("V");
    if (c.somatic)  parts.push("S");
    if (c.material) parts.push("M");
    let str = parts.join(", ");
    if (c.material && c.materials) str += ` (${c.materials})`;
    return str || "—";
}

// ---- Expanded row detail HTML ------------------------------
function expandedDetailHTML(spell) {
    const reqs       = spell.requirements ?? [];
    const reqStr     = reqs.length
        ? reqs.map(r => {
            const f = getFieldById(r.stat);
            return `${f?.label ?? r.stat} ≥ ${r.min}`;
          }).join(", ")
        : "None";

    const { ok, failures } = meetsRequirements(spell);
    const reqClass = ok ? "spell-req-ok" : "spell-req-fail";
    const reqNote  = ok
        ? `<span class="${reqClass}">✓ Requirements met</span>`
        : `<span class="${reqClass}">✗ ${failures.map(f => `${f.label} ${f.have}/${f.need}`).join(", ")}</span>`;

    const rows = [
        ["Level",         spell.level === 0 ? "Cantrip" : `${LEVEL_LABELS[spell.level]} level`],
        ["School",        spell.school ?? "—"],
        ["Casting Time",  spell.castingTime ?? "—"],
        ["Range",         spell.range ?? "—"],
        ["Duration",      spell.duration ?? "—"],
        ["Components",    componentsStr(spell)],
        ["Concentration", spell.concentration ? "Yes" : "No"],
        ["Ritual",        spell.ritual ? "Yes" : "No"],
        ["Requirements",  reqStr],
    ];

    const tableRows = rows.map(([k, v]) =>
        `<tr><td class="exp-key">${k}</td><td class="exp-val">${v}</td></tr>`
    ).join("");

    return `
        <div class="shop-row-expanded spell-detail-expanded">
            ${spell.description ? `<p class="exp-desc">${spell.description}</p>` : ""}
            <table class="exp-table"><tbody>${tableRows}</tbody></table>
            <div class="spell-req-note">${reqNote}</div>
        </div>
    `;
}

// ---- Tooltip -----------------------------------------------
let _tooltip = null;

function getTooltip() {
    if (!_tooltip) {
        _tooltip = document.createElement("div");
        _tooltip.className = "shop-row-tooltip";
        document.body.appendChild(_tooltip);
    }
    return _tooltip;
}

function showTooltip(e, spell) {
    const tt       = getTooltip();
    const color    = SCHOOL_COLORS[spell.school] ?? "#807060";
    const lvlLabel = LEVEL_LABELS[spell.level] ?? spell.level;
    const { ok }   = meetsRequirements(spell);

    tt.innerHTML = `
        <div class="stt-header">
            <span class="stt-name">${spell.name}</span>
            <span class="stt-cat" style="color:${color}">${spell.school ?? "?"}</span>
        </div>
        <div class="stt-desc">${spell.level === 0 ? "Cantrip" : `${lvlLabel}-level`} · ${spell.castingTime ?? "—"} · ${spell.range ?? "—"}</div>
        ${spell.concentration ? `<div class="stt-tag">Concentration</div>` : ""}
        ${spell.ritual ? `<div class="stt-tag">Ritual</div>` : ""}
        ${!ok ? `<div class="stt-tag stt-tag--warn">Requirements not met</div>` : ""}
    `;
    tt.classList.add("shop-row-tooltip--visible");
    positionTooltip(e);
}

function positionTooltip(e) {
    const tt  = getTooltip();
    const pad = 14;
    let x = e.clientX + pad;
    let y = e.clientY + pad;
    const rect = tt.getBoundingClientRect();
    if (x + rect.width  > window.innerWidth)  x = e.clientX - rect.width  - pad;
    if (y + rect.height > window.innerHeight) y = e.clientY - rect.height - pad;
    tt.style.left = `${x + window.scrollX}px`;
    tt.style.top  = `${y + window.scrollY}px`;
}

function hideTooltip() {
    getTooltip()?.classList.remove("shop-row-tooltip--visible");
}

// ---- Table header ------------------------------------------
function renderTableHeader() {
    const thead = document.getElementById("spellTableHead");
    if (!thead) return;

    const cols = [
        { key: "name",   label: "Name",   sortable: true },
        { key: "level",  label: "Level",  sortable: true },
        { key: "school", label: "School", sortable: true },
        { key: "info",   label: "Info",   sortable: false },
        { key: "action", label: "",       sortable: false },
    ];

    thead.innerHTML = "";
    const tr = document.createElement("tr");

    cols.forEach(col => {
        const th = document.createElement("th");
        th.className = `shop-th shop-th--${col.key}`;
        if (col.sortable) {
            th.classList.add("shop-th--sortable");
            const isActive = sortCol === col.key;
            const arrow    = isActive ? (sortAsc ? " ▲" : " ▼") : " ↕";
            th.innerHTML   = `${col.label}<span class="sort-arrow">${arrow}</span>`;
            th.onclick = () => {
                if (sortCol === col.key) { sortAsc = !sortAsc; } else { sortCol = col.key; sortAsc = true; }
                renderSpellTable();
            };
        } else {
            th.textContent = col.label;
        }
        tr.appendChild(th);
    });

    thead.appendChild(tr);
}

// ---- Table body --------------------------------------------
export function renderSpellTable() {
    renderTableHeader();

    const tbody = document.getElementById("spellTableBody");
    if (!tbody) return;

    const spells   = filteredSorted();
    tbody.innerHTML = "";

    if (!spells.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="shop-empty">No spells found.</td></tr>`;
        return;
    }

    const fragment = document.createDocumentFragment();

    spells.forEach(spell => {
        const isExpanded = expandedId === spell.id;
        const known      = alreadyKnows(spell.id);
        const { ok }     = meetsRequirements(spell);
        const color      = SCHOOL_COLORS[spell.school] ?? "#807060";
        const lvlLabel   = LEVEL_LABELS[spell.level] ?? spell.level;

        const tr = document.createElement("tr");
        tr.className  = `shop-row${isExpanded ? " shop-row--active" : ""}${!ok ? " shop-row--locked" : ""}`;
        tr.dataset.spellId = spell.id;

        const tags = [];
        if (spell.concentration) tags.push(`<span class="spell-tag spell-tag--conc">C</span>`);
        if (spell.ritual)        tags.push(`<span class="spell-tag spell-tag--ritual">R</span>`);

        tr.innerHTML = `
            <td class="shop-td shop-td--name">
                <span class="shop-expand-icon">${isExpanded ? "▾" : "▸"}</span>
                <span class="shop-item-name">${spell.name}</span>
                ${tags.join("")}
            </td>
            <td class="shop-td shop-td--level">
                <span class="spell-level-pill">${lvlLabel}</span>
            </td>
            <td class="shop-td shop-td--school">
                <span class="shop-cat-pill" style="border-color:${color};color:${color}">${spell.school ?? "—"}</span>
            </td>
            <td class="shop-td shop-td--info">${spell.castingTime ?? "—"} · ${spell.range ?? "—"}</td>
            <td class="shop-td shop-td--actions">
                ${known
                    ? `<span class="spell-known-badge">✓ Known</span>`
                    : `<button class="shop-btn-sm shop-btn-learn-sm ${!ok ? "shop-btn-cant" : ""}"
                        ${!ok ? `disabled title="Requirements not met"` : ""}>Learn</button>`
                }
            </td>
        `;

        // Expand / collapse
        tr.addEventListener("click", e => {
            if (e.target.closest("button")) return;
            expandedId = isExpanded ? null : spell.id;
            hideTooltip();
            renderSpellTable();
        });

        // Tooltip when collapsed
        if (!isExpanded) {
            tr.addEventListener("mouseenter", e => showTooltip(e, spell));
            tr.addEventListener("mousemove",  e => positionTooltip(e));
            tr.addEventListener("mouseleave", hideTooltip);
        }

        // Learn button
        tr.querySelector(".shop-btn-learn-sm")?.addEventListener("click", e => {
            e.stopPropagation();
            const result = learnSpell(spell);
            showSpellMsg(result.ok ? `Learned: ${spell.name}` : result.error, result.ok ? "success" : "error");
            if (result.ok) renderSpellTable();
        });

        fragment.appendChild(tr);

        // Expanded detail row
        if (isExpanded) {
            const expTr = document.createElement("tr");
            expTr.className = "shop-detail-row shop-detail-row--spell";
            expTr.innerHTML = `<td colspan="5">${expandedDetailHTML(spell)}</td>`;
            fragment.appendChild(expTr);
        }
    });

    tbody.appendChild(fragment);
}

// ---- Status message ----------------------------------------
function showSpellMsg(text, type = "success") {
    const el = document.getElementById("spellStatusMsg");
    if (!el) return;
    el.textContent = text;
    el.className   = `shop-msg shop-msg--${type}`;
    el.classList.remove("shop-msg--visible");
    void el.offsetWidth;
    el.classList.add("shop-msg--visible");
    clearTimeout(el._timeout);
    el._timeout = setTimeout(() => el.classList.remove("shop-msg--visible"), 3500);
}

// ---- Modal open / close ------------------------------------
export async function openSpellbook() {
    const modal = document.getElementById("spellModal");
    if (!modal) return;
    modal.classList.add("shop-modal--open");
    document.body.classList.add("modal-open");

    const tbody = document.getElementById("spellTableBody");
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="shop-loading">Loading spells…</td></tr>`;

    expandedId = null;
    await loadSpells();
    renderSpellTable();
}

export function closeSpellbookModal() {
    const modal = document.getElementById("spellModal");
    if (!modal) return;
    modal.classList.remove("shop-modal--open");
    document.body.classList.remove("modal-open");
    hideTooltip();
}

// ---- Submit spell (user-submitted, pending approval) -------
export async function submitNewSpell(data) {
    const user = auth.currentUser;
    if (!user) return { ok: false, error: "Not signed in." };
    if (!data.name?.trim()) return { ok: false, error: "Name is required." };

    await addDoc(collection(db, "spells"), {
        ...data,
        status:      "pending",
        submittedBy: user.uid,
        submittedAt: Date.now(),
        approvedBy:  null,
        approvedAt:  null,
    });
    return { ok: true };
}

// ---- Init --------------------------------------------------
export function initSpellModal() {
    document.getElementById("openSpellbookButton")
        ?.addEventListener("click", openSpellbook);
    document.getElementById("spellModalCloseBtn")
        ?.addEventListener("click", closeSpellbookModal);
    document.getElementById("spellModal")
        ?.addEventListener("click", e => {
            if (e.target === document.getElementById("spellModal")) closeSpellbookModal();
        });

    // Level filter tabs
    document.querySelectorAll(".spell-level-tab").forEach(btn => {
        btn.addEventListener("click", () => {
            activeLevel = btn.dataset.level;
            expandedId  = null;
            document.querySelectorAll(".spell-level-tab")
                .forEach(b => b.classList.toggle("shop-cat-tab--active", b === btn));
            renderSpellTable();
        });
    });

    // School filter
    document.getElementById("spellSchoolFilter")?.addEventListener("change", e => {
        activeSchool = e.target.value;
        expandedId   = null;
        renderSpellTable();
    });

    // Search
    document.getElementById("spellSearch")?.addEventListener("input", e => {
        searchQuery = e.target.value.toLowerCase().trim();
        expandedId  = null;
        renderSpellTable();
    });

    // Submit form toggle
    document.getElementById("spellSubmitToggle")?.addEventListener("click", () => {
        document.getElementById("spellSubmitPanel")?.classList.toggle("shop-submit--open");
    });

    // Submit form
    document.getElementById("spellSubmitForm")?.addEventListener("submit", async e => {
        e.preventDefault();
        const fd = new FormData(e.target);

        // Parse requirements: rows of [stat, min]
        const reqStats = fd.getAll("req_stat[]");
        const reqMins  = fd.getAll("req_min[]");
        const requirements = reqStats
            .map((stat, i) => ({ stat: stat.trim(), min: parseInt(reqMins[i]) || 0 }))
            .filter(r => r.stat);

        const data = {
            name:          fd.get("name")?.trim(),
            level:         parseInt(fd.get("level")) || 0,
            school:        fd.get("school") || "",
            castingTime:   fd.get("castingTime")?.trim() || "",
            range:         fd.get("range")?.trim() || "",
            duration:      fd.get("duration")?.trim() || "",
            components: {
                verbal:    fd.get("comp_v") === "on",
                somatic:   fd.get("comp_s") === "on",
                material:  fd.get("comp_m") === "on",
                materials: fd.get("materials")?.trim() || "",
            },
            concentration: fd.get("concentration") === "on",
            ritual:        fd.get("ritual") === "on",
            description:   fd.get("description")?.trim() || "",
            requirements,
        };

        const result = await submitNewSpell(data);
        const msgEl  = document.getElementById("spellSubmitMsg");
        if (msgEl) {
            msgEl.textContent = result.ok
                ? "Submitted! Awaiting admin approval."
                : `Error: ${result.error}`;
            msgEl.className = `shop-submit-msg ${result.ok ? "ok" : "err"}`;
        }
        if (result.ok) e.target.reset();
    });
}
