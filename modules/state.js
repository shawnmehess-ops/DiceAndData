// ============================================================
// STATE.JS — Shared mutable state
// ============================================================
import { cloneSchema } from "./schema.js";

export const DEFAULT_ITEMS = [
    { id: "di_1",  name: "Longsword",      type: "weapon",     data: { stat: "STR", damage: "1d8",  proficient: true  } },
    { id: "di_2",  name: "Shortbow",       type: "weapon",     data: { stat: "DEX", damage: "1d6",  proficient: true  } },
    { id: "di_3",  name: "Dagger",         type: "weapon",     data: { stat: "DEX", damage: "1d4",  proficient: false } },
    { id: "di_4",  name: "Leather Armor",  type: "armor",      data: { baseAC: 11,  dexCap: null } },
    { id: "di_5",  name: "Chain Shirt",    type: "armor",      data: { baseAC: 13,  dexCap: 2    } },
    { id: "di_6",  name: "Plate Armor",    type: "armor",      data: { baseAC: 18,  dexCap: 0    } },
    { id: "di_7",  name: "Healing Potion", type: "consumable", data: { effect: "Restores HP"      } },
    { id: "di_8",  name: "Antidote",       type: "consumable", data: { effect: "Cures poison"     } },
    { id: "di_9",  name: "Energy Drink",   type: "consumable", data: { effect: "Temporary boost"  } },
    { id: "di_10", name: "Rope (50 ft)",   type: "misc",       data: { description: "50 ft of hempen rope" } },
    { id: "di_11", name: "Torch",          type: "misc",       data: { description: "Burns for 1 hour"    } },
    { id: "di_12", name: "Strange Key",    type: "misc",       data: { description: "Unknown origin"      } },
];

export const state = {
    currentCharId: null,
    blocks:  [],        // array of block objects (the live sheet schema + values)
    items:   [],        // inventory
};

export function resetState() {
    state.currentCharId = null;
    state.blocks  = cloneSchema();
    state.items   = JSON.parse(JSON.stringify(DEFAULT_ITEMS));
}

// ---- Flat field lookup by id (used by formula engine) ----
export function getFieldById(id) {
    for (const block of state.blocks) {
        const f = block.fields.find(f => f.id === id);
        if (f) return f;
    }
    return null;
}
