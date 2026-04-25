// ============================================================
// SPELLBOOK.JS — Character spellbook: known spells, prepared
//               toggle, forget, slot tracking, tooltips
// ============================================================
import { state }            from "./state.js";
import { componentsStr,
         LEVEL_LABELS,
         meetsRequirements } from "./spells.js";

let debouncedSave = () => {};
let _spellDbCache = [];

export function setDebouncedSave(fn) { debouncedSave = fn; }
export function setSpellDbCache(spells) { _spellDbCache = spells; }

// ---- Find source spell in DB cache -------------------------
function findDbSpell(charSpell) {
    if (charSpell.sourceSpellId) {
        const byId = _spellDbCache.find(s => s.id === charSpell.sourceSpellId);
        if (byId) return byId;
    }
    return _spellDbCache.find(
        s => s.name.toLowerCase() === charSpell.name.toLowerCase()
    ) ?? null;
}

// ---- Tooltip -----------------------------------------------
let _tooltip = null;

const SCHOOL_COLORS = {
    Abjuration:   "#5070c0", Conjuration:  "#50a070", Divination:   "#c0a030",
    Enchantment:  "#c05090", Evocation:    "#c05050", Illusion:     "#9060c0",
    Necromancy:   "#507060", Transmutation:"#806040",
};

function getTooltip() {
    if (!_tooltip) {
        _tooltip = document.createElement("div");
        _tooltip.className = "inv-tooltip";
        _tooltip.setAttribute("role", "tooltip");
        document.body.appendChild(_tooltip);
    }
    return _tooltip;
}

function buildTooltipHTML(charSpell, dbSpell) {
    if (!dbSpell) {
        return `
            <div class="inv-tt-header">
                <span class="inv-tt-name">${charSpell.name}</span>
            </div>
            <div class="inv-tt-desc inv-tt-unlinked">Not linked to the spell database.</div>
        `;
    }

    const color    = SCHOOL_COLORS[dbSpell.school] ?? "#807060";
    const lvlLabel = LEVEL_LABELS[dbSpell.level] ?? dbSpell.level;
    const compStr  = componentsStr(dbSpell);
    const tags     = [];
    if (dbSpell.concentration) tags.push("Concentration");
    if (dbSpell.ritual)        tags.push("Ritual");

    return `
        <div class="inv-tt-header">
            <span class="inv-tt-name">${dbSpell.name}</span>
            <span class="inv-tt-cat" style="color:${color}">${dbSpell.school ?? "?"}</span>
        </div>
        <div class="inv-tt-desc">${dbSpell.description ?? ""}</div>
        <div class="inv-tt-stats">
            <span class="inv-tt-label">Level</span> ${dbSpell.level === 0 ? "Cantrip" : lvlLabel}<br>
            <span class="inv-tt-label">Cast Time</span> ${dbSpell.castingTime ?? "—"}<br>
            <span class="inv-tt-label">Range</span> ${dbSpell.range ?? "—"}<br>
            <span class="inv-tt-label">Duration</span> ${dbSpell.duration ?? "—"}<br>
            <span class="inv-tt-label">Components</span> ${compStr}
            ${tags.length ? `<br><span class="inv-tt-label">Tags</span> ${tags.join(", ")}` : ""}
        </div>
    `;
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

function showTooltip(e, charSpell) {
    const dbSpell = findDbSpell(charSpell);
    const tt      = getTooltip();
    tt.innerHTML  = buildTooltipHTML(charSpell, dbSpell);
    tt.classList.add("inv-tooltip--visible");
    positionTooltip(e);
}

function hideTooltip() {
    getTooltip().classList.remove("inv-tooltip--visible");
}

// ---- Spell slot section ------------------------------------
// state.spellSlots shape:
// { 1: { max: 2, used: 1 }, 2: { max: 0, used: 0 }, ... }
// Cantrips have no slots.

function renderSpellSlots() {
    const container = document.getElementById("spellSlotsContainer");
    if (!container) return;
    container.innerHTML = "";

    for (let lvl = 1; lvl <= 9; lvl++) {
        const slotData = state.spellSlots[lvl] ?? { max: 0, used: 0 };
        const max  = Math.max(0, slotData.max  ?? 0);
        const used = Math.min(max, slotData.used ?? 0);

        const row = document.createElement("div");
        row.className = "spell-slot-row";

        // Level label
        const label = document.createElement("span");
        label.className   = "spell-slot-label";
        label.textContent = `${LEVEL_LABELS[lvl]}`;
        row.appendChild(label);

        // Max input
        const maxInput = document.createElement("input");
        maxInput.type      = "number";
        maxInput.className = "spell-slot-max";
        maxInput.value     = max;
        maxInput.min       = 0;
        maxInput.max       = 9;
        maxInput.title     = "Max slots";
        maxInput.oninput = () => {
            const parsed = parseInt(maxInput.value);
            if (!isNaN(parsed) && parsed >= 0) {
                if (!state.spellSlots[lvl]) state.spellSlots[lvl] = { max: 0, used: 0 };
                state.spellSlots[lvl].max = parsed;
                // Clamp used to new max
                if (state.spellSlots[lvl].used > parsed) state.spellSlots[lvl].used = parsed;
                renderSpellSlots();
                debouncedSave();
            }
        };
        maxInput.onblur = () => {
            const parsed = parseInt(maxInput.value);
            if (isNaN(parsed) || parsed < 0) {
                maxInput.value = 0;
                if (!state.spellSlots[lvl]) state.spellSlots[lvl] = { max: 0, used: 0 };
                state.spellSlots[lvl].max = 0;
                debouncedSave();
            }
        };
        row.appendChild(maxInput);

        // Checkboxes (up to max)
        const boxWrap = document.createElement("div");
        boxWrap.className = "spell-slot-boxes";

        if (max === 0) {
            const none = document.createElement("span");
            none.className   = "spell-slot-none";
            none.textContent = "—";
            boxWrap.appendChild(none);
        } else {
            for (let i = 0; i < max; i++) {
                const cb = document.createElement("input");
                cb.type    = "checkbox";
                cb.className = "spell-slot-checkbox";
                cb.checked = i < used;
                cb.title   = cb.checked ? "Slot used — click to restore" : "Slot available — click to expend";
                cb.onchange = () => {
                    if (!state.spellSlots[lvl]) state.spellSlots[lvl] = { max, used: 0 };
                    // Count how many are now checked
                    const allBoxes = boxWrap.querySelectorAll(".spell-slot-checkbox");
                    state.spellSlots[lvl].used = [...allBoxes].filter(b => b.checked).length;
                    debouncedSave();
                };
                boxWrap.appendChild(cb);
            }
        }

        row.appendChild(boxWrap);

        // Reset button (only if any used)
        if (used > 0) {
            const resetBtn = document.createElement("button");
            resetBtn.className   = "spell-slot-reset";
            resetBtn.textContent = "↺";
            resetBtn.title       = "Long rest: restore all slots";
            resetBtn.onclick = () => {
                if (!state.spellSlots[lvl]) state.spellSlots[lvl] = { max, used: 0 };
                state.spellSlots[lvl].used = 0;
                renderSpellSlots();
                debouncedSave();
            };
            row.appendChild(resetBtn);
        }

        container.appendChild(row);
    }

    // "Restore All" button
    const anyUsed = Object.values(state.spellSlots).some(s => s.used > 0);
    if (anyUsed) {
        const restoreAll = document.createElement("button");
        restoreAll.className   = "btn-secondary spell-slot-restore-all";
        restoreAll.textContent = "↺ Long Rest — Restore All Slots";
        restoreAll.onclick = () => {
            for (const lvl of Object.keys(state.spellSlots)) {
                state.spellSlots[lvl].used = 0;
            }
            renderSpellSlots();
            debouncedSave();
        };
        container.appendChild(restoreAll);
    }
}

// ---- Known spells list -------------------------------------
export function renderSpellbook() {
    renderSpellSlots();

    const container = document.getElementById("spellbookContainer");
    if (!container) return;
    container.innerHTML = "";

    if (!state.spells.length) {
        const empty = document.createElement("p");
        empty.className   = "spellbook-empty";
        empty.textContent = "No spells known. Open the Spellbook to learn spells.";
        container.appendChild(empty);
        return;
    }

    // Group by level
    const groups = {};
    state.spells.forEach(sp => {
        const lvl = sp.level ?? 0;
        if (!groups[lvl]) groups[lvl] = [];
        groups[lvl].push(sp);
    });

    const levels = Object.keys(groups).map(Number).sort((a, b) => a - b);

    levels.forEach(lvl => {
        const heading = document.createElement("div");
        heading.className   = "inventory-group-heading";
        heading.textContent = lvl === 0 ? "Cantrips" : `${LEVEL_LABELS[lvl]}-Level Spells`;
        container.appendChild(heading);

        groups[lvl].forEach(charSpell => {
            const dbSpell  = findDbSpell(charSpell);
            const isLinked = dbSpell !== null;
            const isCantrip = lvl === 0;

            const row = document.createElement("div");
            row.className = `inventory-item spell-row${isLinked ? "" : " inventory-item--unlinked"}`;

            // Name + unlinked badge
            const nameEl = document.createElement("span");
            nameEl.className   = "inventory-item-name";
            nameEl.textContent = charSpell.name;
            if (!isLinked) {
                const badge = document.createElement("span");
                badge.className   = "inventory-unlinked-badge";
                badge.textContent = "?";
                badge.title       = "Not in spell database";
                nameEl.appendChild(badge);
            }

            // School tag
            const schoolEl = document.createElement("span");
            schoolEl.className = "inventory-item-summary spell-school-tag";
            if (dbSpell?.school) {
                const color = SCHOOL_COLORS[dbSpell.school] ?? "#807060";
                schoolEl.textContent = dbSpell.school;
                schoolEl.style.color = color;
            }

            // Prepared toggle (cantrips always prepared, no toggle)
            const prepWrap = document.createElement("span");
            prepWrap.className = "spell-prepared-wrap";

            if (isCantrip) {
                const cantripLabel = document.createElement("span");
                cantripLabel.className   = "spell-always-prepared";
                cantripLabel.textContent = "Always";
                prepWrap.appendChild(cantripLabel);
            } else {
                const prepLabel = document.createElement("label");
                prepLabel.className = "spell-prepared-label";
                prepLabel.title     = charSpell.prepared ? "Prepared — click to unprepare" : "Unprepared — click to prepare";

                const prepCb = document.createElement("input");
                prepCb.type    = "checkbox";
                prepCb.checked = charSpell.prepared ?? false;
                prepCb.onchange = () => {
                    charSpell.prepared = prepCb.checked;
                    prepLabel.title = charSpell.prepared ? "Prepared — click to unprepare" : "Unprepared — click to prepare";
                    row.classList.toggle("spell-row--unprepared", !charSpell.prepared);
                    debouncedSave();
                };

                prepLabel.appendChild(prepCb);
                prepLabel.appendChild(document.createTextNode(charSpell.prepared ? "Prepared" : "Unprepared"));
                prepWrap.appendChild(prepLabel);

                if (!charSpell.prepared) row.classList.add("spell-row--unprepared");
            }

            // Forget button
            const forgetBtn = document.createElement("button");
            forgetBtn.className   = "inventory-delete";
            forgetBtn.textContent = "✕";
            forgetBtn.title       = "Forget this spell";
            forgetBtn.onclick = () => {
                if (!confirm(`Forget "${charSpell.name}"?`)) return;
                state.spells = state.spells.filter(s => s.id !== charSpell.id);
                renderSpellbook();
                debouncedSave();
            };

            row.appendChild(nameEl);
            row.appendChild(schoolEl);
            row.appendChild(prepWrap);
            row.appendChild(forgetBtn);

            row.addEventListener("mouseenter", e => showTooltip(e, charSpell));
            row.addEventListener("mousemove",  e => positionTooltip(e));
            row.addEventListener("mouseleave", hideTooltip);

            container.appendChild(row);
        });
    });
}
