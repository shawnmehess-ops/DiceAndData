// ============================================================
// INVENTORY.JS — Inventory rendering, tooltips, shop linking
// ============================================================
import { state }                      from "./state.js";
import { inventoryContainer, newItemName,
         newItemType, addItemButton }  from "./ui.js";
import { formatCost }                 from "./currency.js";

let debouncedSave  = () => {};
let _shopItemCache = [];

export function setDebouncedSave(fn) { debouncedSave = fn; }
export function setShopItemCache(items) { _shopItemCache = items; }

function findShopItem(invItem) {
    if (invItem.sourceItemId) {
        const byId = _shopItemCache.find(s => s.id === invItem.sourceItemId);
        if (byId) return byId;
    }
    return _shopItemCache.find(
        s => s.name.toLowerCase() === invItem.name.toLowerCase()
    ) ?? null;
}

// ---- Tooltip -----------------------------------------------
let _tooltip = null;

function getTooltip() {
    if (!_tooltip) {
        _tooltip = document.createElement("div");
        _tooltip.className = "inv-tooltip";
        _tooltip.setAttribute("role", "tooltip");
        document.body.appendChild(_tooltip);
    }
    return _tooltip;
}

function buildTooltipHTML(shopItem) {
    if (!shopItem) {
        return `<div class="inv-tt-header"><span class="inv-tt-name">Unknown Item</span></div>
                <div class="inv-tt-desc inv-tt-unlinked">Not linked to the item database.</div>`;
    }

    const s = shopItem.stats ?? {};
    const statsLines = [];

    switch (shopItem.category) {
        case "weapon":
            if (s.damage) statsLines.push(`<span class="inv-tt-label">Damage</span> ${s.damage} (${s.stat ?? "STR"})`);
            if (s.proficient) statsLines.push(`<span class="inv-tt-label">Proficiency</span> Yes`);
            break;
        case "armor":
            if (s.baseAC != null) statsLines.push(`<span class="inv-tt-label">Base AC</span> ${s.baseAC}`);
            if (s.dexCap != null) statsLines.push(`<span class="inv-tt-label">Dex Cap</span> ${s.dexCap}`);
            break;
        case "consumable":
            if (s.effect) statsLines.push(`<span class="inv-tt-label">Effect</span> ${s.effect}`);
            break;
        case "magic":
            if (s.attunement) statsLines.push(`<span class="inv-tt-label">Attunement</span> Required`);
            if (s.charges != null) statsLines.push(`<span class="inv-tt-label">Charges</span> ${s.charges}`);
            break;
        case "spell":
            if (s.level != null)  statsLines.push(`<span class="inv-tt-label">Level</span> ${s.level}`);
            if (s.school)         statsLines.push(`<span class="inv-tt-label">School</span> ${s.school}`);
            if (s.castingTime)    statsLines.push(`<span class="inv-tt-label">Cast Time</span> ${s.castingTime}`);
            if (s.range)          statsLines.push(`<span class="inv-tt-label">Range</span> ${s.range}`);
            break;
        default:
            if (s.description) statsLines.push(s.description);
    }

    const catColors = { weapon: "#c05050", armor: "#5070c0", consumable: "#50a070", magic: "#9060c0", spell: "#4090c0", misc: "#807060" };
    const catColor = catColors[shopItem.category] ?? "#807060";
    const costStr  = formatCost(shopItem.cost ?? {});

    return `
        <div class="inv-tt-header">
            <span class="inv-tt-name">${shopItem.name}</span>
            <span class="inv-tt-cat" style="color:${catColor}">${shopItem.category}</span>
        </div>
        ${shopItem.description ? `<div class="inv-tt-desc">${shopItem.description}</div>` : ""}
        ${statsLines.length ? `<div class="inv-tt-stats">${statsLines.join("<br>")}</div>` : ""}
        <div class="inv-tt-cost">${costStr}</div>
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

function showTooltip(e, invItem) {
    const shopItem = findShopItem(invItem);
    const tt = getTooltip();
    tt.innerHTML = buildTooltipHTML(shopItem);
    tt.classList.add("inv-tooltip--visible");
    positionTooltip(e);
}

function hideTooltip() {
    getTooltip().classList.remove("inv-tooltip--visible");
}

// ---- Summary line ------------------------------------------
function itemSummary(item) {
    switch (item.type) {
        case "weapon":     return `${item.data.damage ?? "—"}, ${item.data.stat ?? "STR"}${item.data.proficient ? ", prof." : ""}`;
        case "armor":      return `AC ${item.data.baseAC ?? "—"}${item.data.dexCap != null ? `, Dex cap ${item.data.dexCap}` : ""}`;
        case "consumable": return item.data.effect ?? "";
        case "misc":       return item.data.description ?? "";
        default:           return "";
    }
}

function defaultItemData(type) {
    switch (type) {
        case "weapon":     return { stat: "STR", damage: "1d4", proficient: false };
        case "armor":      return { baseAC: 10, dexCap: null };
        case "consumable": return { effect: "" };
        case "misc":       return { description: "" };
        default:           return {};
    }
}

// ---- Render ------------------------------------------------
export function renderInventory() {
    if (!inventoryContainer) return;
    inventoryContainer.innerHTML = "";

    const TYPE_ORDER  = ["weapon", "armor", "consumable", "misc"];
    const TYPE_LABELS = { weapon: "Weapons", armor: "Armor", consumable: "Consumables", misc: "Misc" };

    TYPE_ORDER.forEach(type => {
        const group = state.items.filter(i => i.type === type);
        if (!group.length) return;

        const heading = document.createElement("div");
        heading.className   = "inventory-group-heading";
        heading.textContent = TYPE_LABELS[type];
        inventoryContainer.appendChild(heading);

        group.forEach(item => {
            const shopItem = findShopItem(item);
            const isLinked = shopItem !== null;

            const row = document.createElement("div");
            row.className = `inventory-item${isLinked ? "" : " inventory-item--unlinked"}`;

            const nameEl = document.createElement("span");
            nameEl.className   = "inventory-item-name";
            nameEl.textContent = item.name;
            if (!isLinked) {
                const badge = document.createElement("span");
                badge.className   = "inventory-unlinked-badge";
                badge.textContent = "?";
                badge.title       = "Not in item database";
                nameEl.appendChild(badge);
            }

            const summaryEl = document.createElement("span");
            summaryEl.className   = "inventory-item-summary";
            summaryEl.textContent = itemSummary(item);

            const delBtn = document.createElement("button");
            delBtn.className   = "inventory-delete";
            delBtn.textContent = "✕";
            delBtn.onclick = () => {
                state.items = state.items.filter(i => i.id !== item.id);
                renderInventory();
                debouncedSave();
            };

            row.appendChild(nameEl);
            row.appendChild(summaryEl);
            row.appendChild(delBtn);

            row.addEventListener("mouseenter", e => showTooltip(e, item));
            row.addEventListener("mousemove",  e => positionTooltip(e));
            row.addEventListener("mouseleave", hideTooltip);

            inventoryContainer.appendChild(row);
        });
    });
}

export function initAddItem() {
    if (!addItemButton) return;
    addItemButton.onclick = () => {
        const name = newItemName.value.trim();
        const type = newItemType.value;
        if (!name) return;
        state.items.push({
            id:   `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            name, type,
            data: defaultItemData(type),
        });
        newItemName.value = "";
        renderInventory();
        debouncedSave();
    };
}
