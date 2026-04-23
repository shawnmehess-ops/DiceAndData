// ============================================================
// SHOP.JS — Item shop modal: browse, filter, buy, add free
// ============================================================
import {
    collection, getDocs, addDoc, query, where, orderBy
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

import { db, auth }               from "./firebase.js";
import { state }                  from "./state.js";
import { renderInventory }        from "./inventory.js";
import {
    canAfford, deductCost, formatCost,
    purseFromState, pursToState
} from "./currency.js";
import { renderSheet }            from "./sheet.js";

// ============================================================
// CAMPAIGN HOOK STUB
// When campaign support lands, pass a campaignId here.
// filterForCampaign will apply per-item overrides (hidden/disabled).
// ============================================================
function filterForCampaign(items, campaignId = null) {
    if (!campaignId) return items;
    // TODO: filter items by campaignOverrides[campaignId].status
    return items;
}

// ---- Category config ---------------------------------------
export const SHOP_CATEGORIES = [
    { id: "all",        label: "All Items" },
    { id: "weapon",     label: "Weapons"   },
    { id: "armor",      label: "Armor"     },
    { id: "consumable", label: "Consumables" },
    { id: "misc",       label: "Misc / Equipment" },
    { id: "magic",      label: "Magic Items" },
    { id: "spell",      label: "Spells / Scrolls" },
];

// ---- State -------------------------------------------------
let allItems      = [];     // approved items from Firestore
let activeCategory = "all";
let searchQuery    = "";
let debouncedSave  = () => {};

export function setDebouncedSave(fn) { debouncedSave = fn; }

// ---- Load items from Firestore -----------------------------
export async function loadShopItems() {
    const q = query(
        collection(db, "items"),
        where("status", "==", "approved"),
        orderBy("name")
    );
    const snap = await getDocs(q);
    allItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Apply campaign filter (no-op until campaigns are built)
    allItems = filterForCampaign(allItems);
    return allItems;
}

// ---- Filter helpers ----------------------------------------
function filteredItems() {
    return allItems.filter(item => {
        const matchCat    = activeCategory === "all" || item.category === activeCategory;
        const matchSearch = !searchQuery ||
            item.name.toLowerCase().includes(searchQuery) ||
            (item.description ?? "").toLowerCase().includes(searchQuery);
        return matchCat && matchSearch;
    });
}

// ---- Convert shop item → inventory item --------------------
function shopItemToInventoryItem(shopItem) {
    // Map shop category to inventory type (legacy inventory uses simpler types)
    const typeMap = {
        weapon:     "weapon",
        armor:      "armor",
        consumable: "consumable",
        magic:      "misc",
        spell:      "misc",
        misc:       "misc",
    };

    return {
        id:           `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name:         shopItem.name,
        type:         typeMap[shopItem.category] ?? "misc",
        sourceItemId: shopItem.id, // campaign hook: track origin
        data:         buildInventoryData(shopItem),
    };
}

function buildInventoryData(shopItem) {
    switch (shopItem.category) {
        case "weapon":
            return {
                stat:       shopItem.stats?.stat       ?? "STR",
                damage:     shopItem.stats?.damage     ?? "1d4",
                proficient: shopItem.stats?.proficient ?? false,
            };
        case "armor":
            return {
                baseAC: shopItem.stats?.baseAC ?? 10,
                dexCap: shopItem.stats?.dexCap ?? null,
            };
        case "consumable":
            return { effect: shopItem.stats?.effect ?? shopItem.description ?? "" };
        default:
            return { description: shopItem.description ?? "" };
    }
}

// ---- Buy / Add Free ----------------------------------------
function addItemToCharacter(shopItem) {
    state.items.push(shopItemToInventoryItem(shopItem));
    renderInventory();
    debouncedSave();
}

function handleBuy(shopItem) {
    const purse = purseFromState(state);
    if (!canAfford(purse, shopItem.cost ?? {})) {
        showShopMsg("You can't afford that!", "error");
        return;
    }
    const newPurse = deductCost(purse, shopItem.cost ?? {});
    pursToState(state, newPurse);
    addItemToCharacter(shopItem);
    renderSheet();   // refresh coin fields
    showShopMsg(`Purchased: ${shopItem.name}`, "success");
    renderShopItems(); // refresh affordability indicators
}

function handleAddFree(shopItem) {
    addItemToCharacter(shopItem);
    showShopMsg(`Added: ${shopItem.name}`, "success");
}

// ---- Status message ----------------------------------------
function showShopMsg(text, type = "success") {
    const el = document.getElementById("shopStatusMsg");
    if (!el) return;
    el.textContent  = text;
    el.className    = `shop-msg shop-msg--${type}`;
    el.classList.remove("shop-msg--visible");
    void el.offsetWidth;
    el.classList.add("shop-msg--visible");
    clearTimeout(el._timeout);
    el._timeout = setTimeout(() => el.classList.remove("shop-msg--visible"), 3000);
}

// ---- Render item cards -------------------------------------
function renderShopItems() {
    const grid = document.getElementById("shopItemGrid");
    if (!grid) return;

    const items = filteredItems();
    grid.innerHTML = "";

    if (!items.length) {
        grid.innerHTML = `<p class="shop-empty">No items found.</p>`;
        return;
    }

    const purse    = purseFromState(state);
    const fragment = document.createDocumentFragment();

    items.forEach(item => {
        const cost      = item.cost ?? {};
        const costStr   = formatCost(cost);
        const isFree    = !Object.values(cost).some(v => parseInt(v) > 0);
        const affordable = isFree || canAfford(purse, cost);
        const catLabel  = SHOP_CATEGORIES.find(c => c.id === item.category)?.label ?? item.category;

        const card = document.createElement("div");
        card.className = `shop-card shop-card--${item.category}`;

        // Stats summary line
        const statsLine = buildStatsLine(item);

        card.innerHTML = `
            <div class="shop-card-header">
                <span class="shop-card-name">${item.name}</span>
                <span class="shop-card-cat">${catLabel}</span>
            </div>
            ${item.description ? `<p class="shop-card-desc">${item.description}</p>` : ""}
            ${statsLine ? `<p class="shop-card-stats">${statsLine}</p>` : ""}
            <div class="shop-card-footer">
                <span class="shop-card-cost ${isFree ? "shop-card-cost--free" : ""}">${costStr}</span>
                <div class="shop-card-actions">
                    <button class="shop-btn-free">+ Add Free</button>
                    ${!isFree ? `
                        <button class="shop-btn-buy ${!affordable ? "shop-btn-buy--cant" : ""}"
                                ${!affordable ? "title='Not enough coins'" : ""}>
                            Buy
                        </button>` : ""}
                </div>
            </div>
        `;

        card.querySelector(".shop-btn-free").onclick = () => handleAddFree(item);
        card.querySelector(".shop-btn-buy")?.addEventListener("click", () => {
            if (affordable) handleBuy(item);
        });

        fragment.appendChild(card);
    });

    grid.appendChild(fragment);
}

function buildStatsLine(item) {
    const s = item.stats ?? {};
    switch (item.category) {
        case "weapon":
            return [
                s.damage   ? `Damage: ${s.damage}` : null,
                s.stat     ? `(${s.stat})`         : null,
                s.proficient !== undefined ? (s.proficient ? "Proficient" : "") : null,
            ].filter(Boolean).join(" · ");
        case "armor":
            return [
                s.baseAC != null ? `AC ${s.baseAC}` : null,
                s.dexCap != null ? `Dex cap ${s.dexCap}` : null,
            ].filter(Boolean).join(" · ");
        case "consumable":
            return s.effect ?? "";
        case "magic":
            return [
                s.attunement ? "Requires attunement" : null,
                s.charges != null ? `${s.charges} charges` : null,
            ].filter(Boolean).join(" · ");
        case "spell":
            return [
                s.level != null ? `Level ${s.level}` : null,
                s.school        ? s.school           : null,
                s.castingTime   ? `Cast: ${s.castingTime}` : null,
                s.range         ? `Range: ${s.range}` : null,
            ].filter(Boolean).join(" · ");
        default:
            return s.description ?? "";
    }
}

// ---- Modal open/close --------------------------------------
export async function openShop() {
    const modal = document.getElementById("shopModal");
    if (!modal) return;

    modal.classList.add("shop-modal--open");
    document.body.classList.add("modal-open");

    const grid = document.getElementById("shopItemGrid");
    grid.innerHTML = `<p class="shop-loading">Loading items…</p>`;

    await loadShopItems();
    renderShopItems();
}

export function closeShop() {
    const modal = document.getElementById("shopModal");
    if (!modal) return;
    modal.classList.remove("shop-modal--open");
    document.body.classList.remove("modal-open");
}

// ---- Submit new item (player submission for admin approval) -
export async function submitNewItem(formData) {
    const user = auth.currentUser;
    if (!user) return { ok: false, error: "Not signed in." };

    const required = ["name", "category"];
    for (const k of required) {
        if (!formData[k]?.trim()) return { ok: false, error: `Missing required field: ${k}` };
    }

    await addDoc(collection(db, "items"), {
        ...formData,
        status:      "pending",   // awaits admin approval
        submittedBy: user.uid,
        submittedAt: Date.now(),
        approvedBy:  null,
        // Campaign override hook (reserved for future DM campaign feature):
        // campaignOverrides: {}
    });

    return { ok: true };
}

// ---- Init --------------------------------------------------
export function initShop() {
    // Open button (injected into sheet header by sheet.js caller)
    document.getElementById("openShopButton")?.addEventListener("click", openShop);

    // Close button / backdrop
    document.getElementById("shopCloseBtn")?.addEventListener("click", closeShop);
    document.getElementById("shopModal")?.addEventListener("click", e => {
        if (e.target === document.getElementById("shopModal")) closeShop();
    });

    // Category tabs
    document.querySelectorAll(".shop-cat-tab").forEach(btn => {
        btn.addEventListener("click", () => {
            activeCategory = btn.dataset.cat;
            document.querySelectorAll(".shop-cat-tab")
                .forEach(b => b.classList.toggle("shop-cat-tab--active", b === btn));
            renderShopItems();
        });
    });

    // Search
    const searchEl = document.getElementById("shopSearch");
    if (searchEl) {
        searchEl.addEventListener("input", () => {
            searchQuery = searchEl.value.toLowerCase().trim();
            renderShopItems();
        });
    }

    // Submit form toggle
    document.getElementById("shopSubmitToggle")?.addEventListener("click", () => {
        const panel = document.getElementById("shopSubmitPanel");
        if (panel) panel.classList.toggle("shop-submit--open");
    });

    // Submit form
    document.getElementById("shopSubmitForm")?.addEventListener("submit", async e => {
        e.preventDefault();
        const fd = new FormData(e.target);
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
            msgEl.textContent  = result.ok
                ? "Submitted! Awaiting admin approval."
                : `Error: ${result.error}`;
            msgEl.className    = `shop-submit-msg ${result.ok ? "ok" : "err"}`;
        }
        if (result.ok) e.target.reset();
    });
}

function buildStatsFromForm(fd) {
    const cat = fd.get("category");
    switch (cat) {
        case "weapon":
            return {
                stat:       fd.get("stat")  || "STR",
                damage:     fd.get("damage") || "1d4",
                proficient: fd.get("proficient") === "on",
            };
        case "armor":
            return {
                baseAC: parseInt(fd.get("baseAC")) || 10,
                dexCap: fd.get("dexCap") !== "" ? parseInt(fd.get("dexCap")) : null,
            };
        case "consumable":
            return { effect: fd.get("effect") || "" };
        case "magic":
            return {
                attunement: fd.get("attunement") === "on",
                charges:    fd.get("charges") !== "" ? parseInt(fd.get("charges")) : null,
            };
        case "spell":
            return {
                level:       parseInt(fd.get("spellLevel")) || 0,
                school:      fd.get("school") || "",
                castingTime: fd.get("castingTime") || "",
                range:       fd.get("range") || "",
            };
        default:
            return { description: fd.get("miscDesc") || "" };
    }
}
