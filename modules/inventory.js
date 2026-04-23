// ============================================================
// INVENTORY.JS — Inventory rendering and management
// ============================================================
import { state }                      from "./state.js";
import { inventoryContainer, newItemName,
         newItemType, addItemButton }  from "./ui.js";

let debouncedSave = () => {};
export function setDebouncedSave(fn) { debouncedSave = fn; }

function itemSummary(item) {
    switch (item.type) {
        case "weapon":     return `${item.data.damage ?? "—"}, ${item.data.stat ?? "STR"}${item.data.proficient ? ", proficient" : ""}`;
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
            const row = document.createElement("div");
            row.className = "inventory-item";
            row.innerHTML = `
                <span class="inventory-item-name">${item.name}</span>
                <span class="inventory-item-summary">${itemSummary(item)}</span>
                <button class="inventory-delete">✕</button>
            `;
            row.querySelector(".inventory-delete").onclick = () => {
                state.items = state.items.filter(i => i.id !== item.id);
                renderInventory();
                debouncedSave();
            };
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
            data: defaultItemData(type)
        });
        newItemName.value = "";
        renderInventory();
        debouncedSave();
    };
}
