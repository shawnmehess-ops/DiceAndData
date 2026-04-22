// ---------------- DEFAULTS ----------------
export const DEFAULT_STATS = [
    { key: "str", label: "STR", base: 10 },
    { key: "dex", label: "DEX", base: 10 },
    { key: "con", label: "CON", base: 10 },
    { key: "int", label: "INT", base: 10 },
    { key: "wis", label: "WIS", base: 10 },
    { key: "cha", label: "CHA", base: 10 }
];

// Dynamic combat fields.
// type: "manual"   — user types a number directly
// type: "derived"  — value computed from a formula
// formula options: "stat_mod", "stat_mod_plus_prof", "stat_value", "prof_bonus", "level"
// stat: which stat key to base the formula on (for stat_* formulas)
export const DEFAULT_COMBAT_FIELDS = [
    { id: "cf_ac",    label: "Armor Class",      type: "manual",  value: 10 },
    { id: "cf_speed", label: "Speed",             type: "manual",  value: 30 },
    { id: "cf_init",  label: "Initiative",        type: "derived", formula: "stat_mod",          stat: "dex" },
    { id: "cf_pb",    label: "Proficiency Bonus", type: "derived", formula: "prof_bonus",         stat: null  },
    { id: "cf_hero",  label: "Hero Points",       type: "manual",  value: 0  }
];

// Dynamic passive scores — each derives from a skill name.
// formula: "passive_skill" means 10 + skill total (mod + prof)
export const DEFAULT_PASSIVES = [
    { id: "ps_perc", label: "Perception",    skillName: "Perception"    },
    { id: "ps_inv",  label: "Investigation", skillName: "Investigation" },
    { id: "ps_ins",  label: "Insight",       skillName: "Insight"       }
];

export const DEFAULT_SKILLS = [
    { name: "Acrobatics",     stat: "dex", profLevel: 0 },
    { name: "Animal Handling",stat: "wis", profLevel: 0 },
    { name: "Arcana",         stat: "int", profLevel: 0 },
    { name: "Athletics",      stat: "str", profLevel: 0 },
    { name: "Deception",      stat: "cha", profLevel: 0 },
    { name: "History",        stat: "int", profLevel: 0 },
    { name: "Insight",        stat: "wis", profLevel: 0 },
    { name: "Intimidation",   stat: "cha", profLevel: 0 },
    { name: "Investigation",  stat: "int", profLevel: 0 },
    { name: "Medicine",       stat: "wis", profLevel: 0 },
    { name: "Nature",         stat: "int", profLevel: 0 },
    { name: "Perception",     stat: "wis", profLevel: 0 },
    { name: "Performance",    stat: "cha", profLevel: 0 },
    { name: "Persuasion",     stat: "cha", profLevel: 0 },
    { name: "Religion",       stat: "int", profLevel: 0 },
    { name: "Sleight of Hand",stat: "dex", profLevel: 0 },
    { name: "Stealth",        stat: "dex", profLevel: 0 },
    { name: "Survival",       stat: "wis", profLevel: 0 }
];

export const DEFAULT_ITEMS = [
    { id: "di_1",  name: "Longsword",       type: "weapon",     data: { stat: "str", damage: "1d8", proficient: true  } },
    { id: "di_2",  name: "Shortbow",        type: "weapon",     data: { stat: "dex", damage: "1d6", proficient: true  } },
    { id: "di_3",  name: "Dagger",          type: "weapon",     data: { stat: "dex", damage: "1d4", proficient: false } },
    { id: "di_4",  name: "Leather Armor",   type: "armor",      data: { baseAC: 11, dexCap: null } },
    { id: "di_5",  name: "Chain Shirt",     type: "armor",      data: { baseAC: 13, dexCap: 2    } },
    { id: "di_6",  name: "Plate Armor",     type: "armor",      data: { baseAC: 18, dexCap: 0    } },
    { id: "di_7",  name: "Healing Potion",  type: "consumable", data: { effect: "Restores HP"       } },
    { id: "di_8",  name: "Antidote",        type: "consumable", data: { effect: "Cures poison"      } },
    { id: "di_9",  name: "Energy Drink",    type: "consumable", data: { effect: "Temporary boost"   } },
    { id: "di_10", name: "Rope (50 ft)",    type: "misc",       data: { description: "50 ft of hempen rope" } },
    { id: "di_11", name: "Torch",           type: "misc",       data: { description: "Burns for 1 hour"    } },
    { id: "di_12", name: "Strange Key",     type: "misc",       data: { description: "Unknown origin"      } }
];

// ---------------- SHARED MUTABLE STATE ----------------
export const state = {
    currentCharId: null,
    currentStats:  [],
    currentSkills: [],
    currentSavingThrows: {
        str: false, dex: false, con: false,
        int: false, wis: false, cha: false
    },
    currentDeathSaves: {
        success: [false, false, false],
        failure: [false, false, false]
    },
    currentItems:        [],
    currentCombatFields: [],
    currentPassives:     []
};
