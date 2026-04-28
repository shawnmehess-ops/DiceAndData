// ============================================================
// STATE.JS — Shared mutable state
// ============================================================
import { cloneSchema } from "./schema.js";
import { registry }    from "./registry.js";

// DEFAULT_ITEMS names match the seeded shop items so inventory.js
// can link them by name when the shop cache loads.
export const DEFAULT_ITEMS = [
    { id: "di_1",  name: "Longsword",           type: "weapon",     data: { stat: "STR", damage: "1d8",  proficient: false } },
    { id: "di_2",  name: "Shortbow",            type: "weapon",     data: { stat: "DEX", damage: "1d6",  proficient: false } },
    { id: "di_3",  name: "Handaxe",             type: "weapon",     data: { stat: "STR", damage: "1d6",  proficient: false } },
    { id: "di_4",  name: "Leather Armor",       type: "armor",      data: { baseAC: 11,  dexCap: null  } },
    { id: "di_5",  name: "Chain Mail",          type: "armor",      data: { baseAC: 16,  dexCap: 0     } },
    { id: "di_6",  name: "Half Plate",          type: "armor",      data: { baseAC: 15,  dexCap: 2     } },
    { id: "di_7",  name: "Healing Potion",      type: "consumable", data: { effect: "Restores 2d4+2 HP when drunk."  } },
    { id: "di_8",  name: "Antitoxin",           type: "consumable", data: { effect: "Advantage on saving throws against poison for 1 hour." } },
    { id: "di_9",  name: "Thunderstone",        type: "consumable", data: { effect: "DC 13 CON save or deafened for 1 minute." } },
    { id: "di_10", name: "Rope, Hempen (50 ft)",type: "misc",       data: { description: "50 ft. 2 HP per section, DC 17 STR to break." } },
    { id: "di_11", name: "Tinderbox",           type: "misc",       data: { description: "Lights fires. Full action if in combat."       } },
    { id: "di_12", name: "Healer's Kit",        type: "misc",       data: { description: "10 uses. Stabilise a dying creature without a Medicine check." } },
];

export const state = {
    currentCharId:  null,
    blocks:         [],
    items:          [],
    spells:         [],
    spellSlots:     {},
    classData:      null,
    raceData:       null,
    backgroundData: null,
    restData:       { shortRestsUsed: 0 },  // resets on long rest
};

export function defaultSpellSlots() {
    const slots = {};
    for (let i = 1; i <= 9; i++) slots[i] = { max: 0, used: 0 };
    return slots;
}

// Register state so other modules can access it without circular imports.
registry.set("state", state);

export function resetState() {
    state.currentCharId  = null;
    state.blocks         = cloneSchema();
    state.items          = JSON.parse(JSON.stringify(DEFAULT_ITEMS));
    state.spells         = [];
    state.spellSlots     = defaultSpellSlots();
    state.classData      = null;
    state.raceData       = null;
    state.backgroundData = null;
    state.restData       = { shortRestsUsed: 0 };
}

export function getFieldById(id) {
    for (const block of state.blocks) {
        const f = block.fields.find(f => f.id === id);
        if (f) return f;
    }
    return null;
}