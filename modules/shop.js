// ============================================================
// SHOP.JS — Item shop modal: sortable table, tooltips, buy/add
// ============================================================
import {
    collection, getDocs, addDoc, query, where, orderBy
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

import { db, auth }                   from "./firebase.js";
import { state }                      from "./state.js";
import { renderInventory,
         setShopItemCache }            from "./inventory.js";
import {
    canAfford, deductCost, formatCost,
    purseFromState, pursToState, costToCP
} from "./currency.js";
import { renderSheet }                from "./sheet.js";

// ============================================================
// CAMPAIGN HOOK STUB
// ============================================================
function filterForCampaign(items, campaignId = null) {
    if (!campaignId) return items;
    // TODO: filter items by campaignOverrides[campaignId].status
    return items;
}

// ---- Category config ---------------------------------------
export const SHOP_CATEGORIES = [
    { id: "all",        label: "All Items"        },
    { id: "weapon",     label: "Weapons"          },
    { id: "armor",      label: "Armor"            },
    { id: "consumable", label: "Consumables"      },
    { id: "misc",       label: "Misc / Equipment" },
    { id: "magic",      label: "Magic Items"      },
    { id: "spell",      label: "Spells / Scrolls" },
];

const CAT_COLORS = {
    weapon: "#c05050", armor: "#5070c0", consumable: "#50a070",
    magic:  "#9060c0", spell: "#4090c0", misc: "#807060",
};

// ---- Module state ------------------------------------------
let allItems       = [];
let activeCategory = "all";
let searchQuery    = "";
let sortCol        = "name";
let sortAsc        = true;
let expandedId     = null;
let debouncedSave  = () => {};

export function setDebouncedSave(fn) { debouncedSave = fn; }

// ---- Load from Firestore -----------------------------------
export async function loadShopItems() {
    const q = query(
        collection(db, "items"),
        where("status", "==", "approved"),
        orderBy("name")
    );
    const snap = await getDocs(q);
    allItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    allItems = filterForCampaign(allItems);
    setShopItemCache(allItems);
    return allItems;
}

// ---- Filter + sort -----------------------------------------
function filteredSorted() {
    let items = allItems.filter(item => {
        const matchCat    = activeCategory === "all" || item.category === activeCategory;
        const matchSearch = !searchQuery ||
            item.name.toLowerCase().includes(searchQuery) ||
            (item.description ?? "").toLowerCase().includes(searchQuery);
        return matchCat && matchSearch;
    });

    items = [...items].sort((a, b) => {
        let av, bv;
        switch (sortCol) {
            case "name":
                av = a.name.toLowerCase();
                bv = b.name.toLowerCase();
                break;
            case "category":
                av = a.category.toLowerCase();
                bv = b.category.toLowerCase();
                break;
            case "cost":
                av = costToCP(a.cost ?? {});
                bv = costToCP(b.cost ?? {});
                break;
            case "stats":
                av = primaryStatValue(a);
                bv = primaryStatValue(b);
                break;
            default:
                av = a.name.toLowerCase();
                bv = b.name.toLowerCase();
        }
        if (av < bv) return sortAsc ? -1 :  1;
        if (av > bv) return sortAsc ?  1 : -1;
        return 0;
    });

    return items;
}

function primaryStatValue(item) {
    const s = item.stats ?? {};
    switch (item.category) {
        case "weapon":     return parseDieMax(s.damage ?? "");
        case "armor":      return s.baseAC ?? 0;
        case "magic":      return s.charges ?? (s.attunement ? 1 : 0);
        case "spell":      return s.level ?? 0;
        default:           return 0;
    }
}

function parseDieMax(dieStr) {
    const m = dieStr.match(/(\d+)d(\d+)([+-]\d+)?/);
    if (!m) return 0;
    return parseInt(m[1]) * parseInt(m[2]) + parseInt(m[3] ?? 0);
}

// ---- Stats summary (short, for table cell) -----------------
function statsSummary(item) {
    const s = item.stats ?? {};
    switch (item.category) {
        case "weapon":     return `${s.damage ?? "—"} ${s.stat ?? "STR"}`;
        case "armor":      return `AC ${s.baseAC ?? "—"}${s.dexCap != null ? `, Dex ≤${s.dexCap}` : ""}`;
        case "consumable": {
            const e = s.effect ?? "";
            return e.length > 42 ? e.slice(0, 42) + "…" : e;
        }
        case "magic":      return [s.attunement ? "Attune" : null, s.charges != null ? `${s.charges} ch.` : null].filter(Boolean).join(", ") || "—";
        case "spell":      return `Lvl ${s.level ?? 0} ${s.school ?? ""}`.trim();
        default: {
            const d = s.description ?? "";
            return d.length > 42 ? d.slice(0, 42) + "…" : d;
        }
    }
}

// ---- Expanded row detail -----------------------------------
function expandedDetailHTML(item) {
    const s = item.stats ?? {};
    const rows = [];

    switch (item.category) {
        case "weapon":
            rows.push(["Damage",      s.damage ?? "—"]);
            rows.push(["Ability",     s.stat ?? "STR"]);
            rows.push(["Proficiency", s.proficient ? "Yes" : "No"]);
            break;
        case "armor":
            rows.push(["Base AC",  s.baseAC ?? "—"]);
            rows.push(["Dex Cap",  s.dexCap != null ? s.dexCap : "None"]);
            break;
        case "consumable":
            rows.push(["Effect", s.effect ?? "—"]);
            break;
        case "magic":
            rows.push(["Attunement", s.attunement ? "Required" : "Not required"]);
            if (s.charges != null) rows.push(["Charges", s.charges]);
            break;
        case "spell":
            rows.push(["Level",     s.level ?? 0]);
            rows.push(["School",    s.school ?? "—"]);
            rows.push(["Cast Time", s.castingTime ?? "—"]);
            rows.push(["Range",     s.range ?? "—"]);
            break;
        default:
            if (s.description) rows.push(["Notes", s.description]);
    }

    const tableRows = rows.map(([k, v]) =>
        `<tr><td class="exp-key">${k}</td><td class="exp-val">${v}</td></tr>`
    ).join("");

    return `
        <div class="shop-row-expanded">
            ${item.description ? `<p class="exp-desc">${item.description}</p>` : ""}
            ${tableRows ? `<table class="exp-table"><tbody>${tableRows}</tbody></table>` : ""}
        </div>
    `;
}

// ---- Hover tooltip (on shop rows) --------------------------
let _shopTooltip = null;

function getShopTooltip() {
    if (!_shopTooltip) {
        _shopTooltip = document.createElement("div");
        _shopTooltip.className = "shop-row-tooltip";
        document.body.appendChild(_shopTooltip);
    }
    return _shopTooltip;
}

function showShopTooltip(e, item) {
    const tt = getShopTooltip();
    const catColor = CAT_COLORS[item.category] ?? "#807060";
    tt.innerHTML = `
        <div class="stt-header">
            <span class="stt-name">${item.name}</span>
            <span class="stt-cat" style="color:${catColor}">${item.category}</span>
        </div>
        ${item.description ? `<div class="stt-desc">${item.description}</div>` : ""}
        <div class="stt-cost">${formatCost(item.cost ?? {})}</div>
    `;
    tt.classList.add("shop-row-tooltip--visible");
    positionShopTooltip(e);
}

function positionShopTooltip(e) {
    const tt  = getShopTooltip();
    const pad = 14;
    let x = e.clientX + pad;
    let y = e.clientY + pad;
    const rect = tt.getBoundingClientRect();
    if (x + rect.width  > window.innerWidth)  x = e.clientX - rect.width  - pad;
    if (y + rect.height > window.innerHeight) y = e.clientY - rect.height - pad;
    tt.style.left = `${x + window.scrollX}px`;
    tt.style.top  = `${y + window.scrollY}px`;
}

function hideShopTooltip() {
    getShopTooltip()?.classList.remove("shop-row-tooltip--visible");
}

// ---- Buy / Add free ----------------------------------------
function addItemToCharacter(shopItem) {
    const typeMap = {
        weapon: "weapon", armor: "armor", consumable: "consumable",
        magic: "misc", spell: "misc", misc: "misc",
    };
    state.items.push({
        id:           `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name:         shopItem.name,
        type:         typeMap[shopItem.category] ?? "misc",
        sourceItemId: shopItem.id,
        data:         buildInventoryData(shopItem),
    });
    renderInventory();
    debouncedSave();
}

function buildInventoryData(shopItem) {
    switch (shopItem.category) {
        case "weapon":
            return { stat: shopItem.stats?.stat ?? "STR", damage: shopItem.stats?.damage ?? "1d4", proficient: shopItem.stats?.proficient ?? false };
        case "armor":
            return { baseAC: shopItem.stats?.baseAC ?? 10, dexCap: shopItem.stats?.dexCap ?? null };
        case "consumable":
            return { effect: shopItem.stats?.effect ?? shopItem.description ?? "" };
        default:
            return { description: shopItem.description ?? "" };
    }
}

function handleBuy(shopItem) {
    const purse = purseFromState(state);
    if (!canAfford(purse, shopItem.cost ?? {})) {
        showShopMsg("You can't afford that!", "error");
        return;
    }
    pursToState(state, deductCost(purse, shopItem.cost ?? {}));
    addItemToCharacter(shopItem);
    renderSheet();
    showShopMsg(`Purchased: ${shopItem.name}`, "success");
    renderShopTable();
}

function handleAddFree(shopItem) {
    addItemToCharacter(shopItem);
    showShopMsg(`Added: ${shopItem.name}`, "success");
}

// ---- Status message ----------------------------------------
function showShopMsg(text, type = "success") {
    const el = document.getElementById("shopStatusMsg");
    if (!el) return;
    el.textContent = text;
    el.className   = `shop-msg shop-msg--${type}`;
    el.classList.remove("shop-msg--visible");
    void el.offsetWidth;
    el.classList.add("shop-msg--visible");
    clearTimeout(el._timeout);
    el._timeout = setTimeout(() => el.classList.remove("shop-msg--visible"), 3000);
}

// ---- Table header ------------------------------------------
function renderTableHeader() {
    const thead = document.getElementById("shopTableHead");
    if (!thead) return;

    const cols = [
        { key: "name",     label: "Name",     sortable: true  },
        { key: "category", label: "Category", sortable: true  },
        { key: "stats",    label: "Stats",    sortable: true  },
        { key: "cost",     label: "Cost",     sortable: true  },
        { key: "actions",  label: "",         sortable: false },
    ];

    thead.innerHTML = "";
    const tr = document.createElement("tr");

    cols.forEach(col => {
        const th = document.createElement("th");
        th.className = `shop-th shop-th--${col.key}`;
        if (col.sortable) {
            th.classList.add("shop-th--sortable");
            const isActive = sortCol === col.key;
            const arrow = isActive ? (sortAsc ? " ▲" : " ▼") : " ↕";
            th.innerHTML = `${col.label}<span class="sort-arrow">${arrow}</span>`;
            th.onclick = () => {
                sortCol = col.key;
                sortAsc = sortCol === col.key ? !sortAsc : true;
                // re-read sortCol since we just set it
                sortAsc = (sortCol === col.key && sortAsc === false) ? false : (sortCol !== col.key ? true : !sortAsc);
                renderShopTable();
            };
            // Fix the toggle logic cleanly
            th.onclick = () => {
                if (sortCol === col.key) {
                    sortAsc = !sortAsc;
                } else {
                    sortCol = col.key;
                    sortAsc = true;
                }
                renderShopTable();
            };
        } else {
            th.textContent = col.label;
        }
        tr.appendChild(th);
    });

    thead.appendChild(tr);
}

// ---- Table body --------------------------------------------
export function renderShopTable() {
    renderTableHeader();

    const tbody = document.getElementById("shopTableBody");
    if (!tbody) return;

    const items = filteredSorted();
    tbody.innerHTML = "";

    if (!items.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="shop-empty">No items found.</td></tr>`;
        return;
    }

    const purse    = purseFromState(state);
    const fragment = document.createDocumentFragment();

    items.forEach(item => {
        const cost       = item.cost ?? {};
        const costStr    = formatCost(cost);
        const isFree     = !Object.values(cost).some(v => parseInt(v) > 0);
        const affordable = isFree || canAfford(purse, cost);
        const isExpanded = expandedId === item.id;
        const catColor   = CAT_COLORS[item.category] ?? "#807060";

        // Main row
        const tr = document.createElement("tr");
        tr.className  = `shop-row shop-row--${item.category}${isExpanded ? " shop-row--active" : ""}`;
        tr.dataset.itemId = item.id;

        tr.innerHTML = `
            <td class="shop-td shop-td--name">
                <span class="shop-expand-icon">${isExpanded ? "▾" : "▸"}</span>
                <span class="shop-item-name">${item.name}</span>
            </td>
            <td class="shop-td shop-td--category">
                <span class="shop-cat-pill" style="border-color:${catColor};color:${catColor}">${item.category}</span>
            </td>
            <td class="shop-td shop-td--stats">${statsSummary(item)}</td>
            <td class="shop-td shop-td--cost ${isFree ? "shop-td--free" : ""}">${isFree ? "Free" : costStr}</td>
            <td class="shop-td shop-td--actions">
                <button class="shop-btn-sm shop-btn-free-sm">+ Free</button>
                ${!isFree ? `<button class="shop-btn-sm shop-btn-buy-sm ${!affordable ? "shop-btn-cant" : ""}"
                    ${!affordable ? "disabled title='Not enough coins'" : ""}>Buy</button>` : ""}
            </td>
        `;

        // Row click → expand/collapse
        tr.addEventListener("click", e => {
            if (e.target.closest("button")) return;
            expandedId = isExpanded ? null : item.id;
            hideShopTooltip();
            renderShopTable();
        });

        // Tooltip only when collapsed
        if (!isExpanded) {
            tr.addEventListener("mouseenter", e => showShopTooltip(e, item));
            tr.addEventListener("mousemove",  e => positionShopTooltip(e));
            tr.addEventListener("mouseleave", hideShopTooltip);
        }

        tr.querySelector(".shop-btn-free-sm").onclick = e => { e.stopPropagation(); handleAddFree(item); };
        tr.querySelector(".shop-btn-buy-sm")?.addEventListener("click", e => {
            e.stopPropagation();
            if (affordable) handleBuy(item);
        });

        fragment.appendChild(tr);

        // Expanded detail row
        if (isExpanded) {
            const expTr = document.createElement("tr");
            expTr.className = `shop-detail-row shop-detail-row--${item.category}`;
            expTr.innerHTML = `<td colspan="5">${expandedDetailHTML(item)}</td>`;
            fragment.appendChild(expTr);
        }
    });

    tbody.appendChild(fragment);
}

// ---- Modal open / close ------------------------------------
export async function openShop() {
    const modal = document.getElementById("shopModal");
    if (!modal) return;
    modal.classList.add("shop-modal--open");
    document.body.classList.add("modal-open");

    const tbody = document.getElementById("shopTableBody");
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="shop-loading">Loading items…</td></tr>`;

    await loadShopItems();
    renderShopTable();
}

export function closeShop() {
    const modal = document.getElementById("shopModal");
    if (!modal) return;
    modal.classList.remove("shop-modal--open");
    document.body.classList.remove("modal-open");
    hideShopTooltip();
}

// ---- Submit item -------------------------------------------
export async function submitNewItem(formData) {
    const user = auth.currentUser;
    if (!user) return { ok: false, error: "Not signed in." };
    for (const k of ["name", "category"]) {
        if (!formData[k]?.trim()) return { ok: false, error: `Missing: ${k}` };
    }
    await addDoc(collection(db, "items"), {
        ...formData,
        status: "pending", submittedBy: user.uid,
        submittedAt: Date.now(), approvedBy: null,
    });
    return { ok: true };
}

// ---- Init --------------------------------------------------
export function initShop() {
    document.getElementById("openShopButton")?.addEventListener("click", openShop);
    document.getElementById("shopCloseBtn")?.addEventListener("click", closeShop);
    document.getElementById("shopModal")?.addEventListener("click", e => {
        if (e.target === document.getElementById("shopModal")) closeShop();
    });

    document.querySelectorAll(".shop-cat-tab").forEach(btn => {
        btn.addEventListener("click", () => {
            if (btn.dataset.cat === "admin") return;
            activeCategory = btn.dataset.cat;
            expandedId     = null;
            document.querySelectorAll(".shop-cat-tab")
                .forEach(b => b.classList.toggle("shop-cat-tab--active", b === btn));
            renderShopTable();
        });
    });

    document.getElementById("shopSearch")?.addEventListener("input", e => {
        searchQuery = e.target.value.toLowerCase().trim();
        expandedId  = null;
        renderShopTable();
    });

    document.getElementById("shopSubmitToggle")?.addEventListener("click", () => {
        document.getElementById("shopSubmitPanel")?.classList.toggle("shop-submit--open");
    });

    document.getElementById("shopSubmitForm")?.addEventListener("submit", async e => {
        e.preventDefault();
        const fd   = new FormData(e.target);
        const data = {
            name:        fd.get("name")?.trim(),
            category:    fd.get("category"),
            description: fd.get("description")?.trim(),
            cost: {
                cp: parseInt(fd.get("cost_cp")) || 0,
                sp: parseInt(fd.get("cost_sp")) || 0,
                ep: parseInt(fd.get("cost_ep")) || 0,
                gp: parseInt(fd.get("cost_gp")) || 0,
                pp: parseInt(fd.get("cost_pp")) || 0,
            },
            stats: buildStatsFromForm(fd),
        };
        const result = await submitNewItem(data);
        const msgEl  = document.getElementById("shopSubmitMsg");
        if (msgEl) {
            msgEl.textContent = result.ok ? "Submitted! Awaiting admin approval." : `Error: ${result.error}`;
            msgEl.className   = `shop-submit-msg ${result.ok ? "ok" : "err"}`;
        }
        if (result.ok) e.target.reset();
    });
}

function buildStatsFromForm(fd) {
    switch (fd.get("category")) {
        case "weapon":
            return { stat: fd.get("stat") || "STR", damage: fd.get("damage") || "1d4", proficient: fd.get("proficient") === "on" };
        case "armor":
            return { baseAC: parseInt(fd.get("baseAC")) || 10, dexCap: fd.get("dexCap") !== "" ? parseInt(fd.get("dexCap")) : null };
        case "consumable":
            return { effect: fd.get("effect") || "" };
        case "magic":
            return { attunement: fd.get("attunement") === "on", charges: fd.get("charges") !== "" ? parseInt(fd.get("charges")) : null };
        case "spell":
            return { level: parseInt(fd.get("spellLevel")) || 0, school: fd.get("school") || "", castingTime: fd.get("castingTime") || "", range: fd.get("range") || "" };
        default:
            return { description: fd.get("miscDesc") || "" };
    }
}
