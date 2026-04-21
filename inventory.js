import { state, DEFAULT_ITEMS }              from "./state.js";
import { inventoryContainer, newItemName,
         newItemType, addItemButton }         from "./ui.js";
import { rerenderAll }                        from "./ui.js";

// debouncedSave injected by app.js
let debouncedSave = () => {};
export function setDebouncedSave(fn) { debouncedSave = fn; }

// ---------------- ITEM HELPERS ----------------
export function itemSummary(item) {
    switch (item.type) {
        case "weapon":     return `${item.data.damage ?? "—"}, ${(item.data.stat ?? "str").toUpperCase()}${item.data.proficient ? ", proficient" : ""}`;
        case "armor":      return `AC ${item.data.baseAC ?? "—"}${item.data.dexCap != null ? `, Dex cap ${item.data.dexCap}` : ""}`;
        case "consumable": return item.data.effect ?? "";
        case "misc":       return item.data.description ?? "";
        default:           return "";
    }
}

export function defaultItemData(type) {
    switch (type) {
        case "weapon":     return { stat: "str", damage: "1d4", proficient: false };
        case "armor":      return { baseAC: 10, dexCap: null };
        case "consumable": return { effect: "" };
        case "misc":       return { description: "" };
        default:           return {};
    }
}

// ---------------- RENDER INVENTORY ----------------
export function renderInventory() {
    inventoryContainer.innerHTML = "";

    const TYPE_ORDER  = ["weapon", "armor", "consumable", "misc"];
    const TYPE_LABELS = { weapon: "Weapons", armor: "Armor", consumable: "Consumables", misc: "Misc" };

    TYPE_ORDER.forEach(type => {
        const group = state.currentItems.filter(i => i.type === type);
        if (!group.length) return;

        const heading = document.createElement("div");
        heading.className = "inventory-group-heading";
        heading.textContent = TYPE_LABELS[type];
        inventoryContainer.appendChild(heading);

        group.forEach(item => {
            const row = document.createElement("div");
            row.className = "inventory-item";

            const summary = itemSummary(item);

            row.innerHTML = `
                <span class="inventory-item-name">${item.name}</span>
                <span class="inventory-item-summary">${summary}</span>
                <button class="inventory-delete">✕</button>
            `;

            row.querySelector(".inventory-delete").onclick = () => {
                state.currentItems = state.currentItems.filter(i => i.id !== item.id);
                rerenderAll();
                debouncedSave();
            };

            inventoryContainer.appendChild(row);
        });
    });
}

// ---------------- ADD ITEM ----------------
export function initAddItem() {
    addItemButton.onclick = () => {
        const name = newItemName.value.trim();
        const type = newItemType.value;
        if (!name) return;

        state.currentItems.push({
            id:   `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            name,
            type,
            data: defaultItemData(type)
        });

        newItemName.value = "";
        rerenderAll();
        debouncedSave();
    };
}
