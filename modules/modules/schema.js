// ============================================================
// SCHEMA.JS — Default D&D 5e character sheet definition
// The entire sheet is an array of blocks.
// Each block has: { id, label, fields: [...] }
// Each field is one of four types: TextField, FlatStat,
// ComputedStat, CheckboxGroup
// ============================================================

// ---- Field factory helpers ----
const text     = (id, label, placeholder = "") =>
    ({ id, label, type: "text",     value: "",  placeholder });

const flat     = (id, label, value = 0) =>
    ({ id, label, type: "flat",     value });

const computed = (id, label, formula, sources = []) =>
    ({ id, label, type: "computed", formula, sources });

const checks   = (id, label, count = 3) =>
    ({ id, label, type: "checks",   count, values: Array(count).fill(false) });

// ============================================================
// DEFAULT SCHEMA
// ============================================================
export const DEFAULT_SCHEMA = [

    // ---- BASIC INFO ----
    {
        id: "block_basic",
        label: "Basic Info",
        fields: [
            text("f_name",       "Name",            "Character name"),
            text("f_race",       "Race",             "Human"),
            text("f_class",      "Class",            "Fighter"),
            flat("f_level",      "Level",            1),
            text("f_background", "Background",       "Soldier"),
            text("f_alignment",  "Alignment",        "Neutral Good"),
            text("f_deity",      "Deity",            ""),
        ]
    },

    // ---- ABILITY SCORES ----
    {
        id: "block_abilities",
        label: "Ability Scores",
        fields: [
            flat("f_str", "STR", 10),
            flat("f_dex", "DEX", 10),
            flat("f_con", "CON", 10),
            flat("f_int", "INT", 10),
            flat("f_wis", "WIS", 10),
            flat("f_cha", "CHA", 10),
        ]
    },

    // ---- COMBAT ----
    {
        id: "block_combat",
        label: "Combat",
        fields: [
            flat("f_ac",       "Armor Class",      10),
            flat("f_speed",    "Speed",            30),
            flat("f_hp_max",   "Max HP",           0),
            flat("f_hp_cur",   "Current HP",       0),
            flat("f_hp_tmp",   "Temp HP",          0),
            computed("f_init",  "Initiative",      "modifier",  ["f_dex"]),
            computed("f_prof",  "Proficiency",     "prof_bonus", []),
            flat("f_hero",     "Hero Points",      0),
            checks("f_insp",   "Inspiration",      1),
        ]
    },

    // ---- DEATH SAVES ----
    {
        id: "block_death",
        label: "Death Saves",
        fields: [
            checks("f_ds_success", "Successes", 3),
            checks("f_ds_failure", "Failures",  3),
        ]
    },

    // ---- SAVING THROWS ----
    {
        id: "block_saves",
        label: "Saving Throws",
        fields: [
            computed("f_save_str", "STR Save", "add_prof_if_checked", ["f_str", "f_prof"]),
            computed("f_save_dex", "DEX Save", "add_prof_if_checked", ["f_dex", "f_prof"]),
            computed("f_save_con", "CON Save", "add_prof_if_checked", ["f_con", "f_prof"]),
            computed("f_save_int", "INT Save", "add_prof_if_checked", ["f_int", "f_prof"]),
            computed("f_save_wis", "WIS Save", "add_prof_if_checked", ["f_wis", "f_prof"]),
            computed("f_save_cha", "CHA Save", "add_prof_if_checked", ["f_cha", "f_prof"]),
        ]
    },

    // ---- SKILLS ----
    {
        id: "block_skills",
        label: "Skills",
        fields: [
            computed("f_sk_acrobatics",      "Acrobatics (DEX)",       "add_prof_if_checked", ["f_dex", "f_prof"]),
            computed("f_sk_animal",          "Animal Handling (WIS)",  "add_prof_if_checked", ["f_wis", "f_prof"]),
            computed("f_sk_arcana",          "Arcana (INT)",           "add_prof_if_checked", ["f_int", "f_prof"]),
            computed("f_sk_athletics",       "Athletics (STR)",        "add_prof_if_checked", ["f_str", "f_prof"]),
            computed("f_sk_deception",       "Deception (CHA)",        "add_prof_if_checked", ["f_cha", "f_prof"]),
            computed("f_sk_history",         "History (INT)",          "add_prof_if_checked", ["f_int", "f_prof"]),
            computed("f_sk_insight",         "Insight (WIS)",          "add_prof_if_checked", ["f_wis", "f_prof"]),
            computed("f_sk_intimidation",    "Intimidation (CHA)",     "add_prof_if_checked", ["f_cha", "f_prof"]),
            computed("f_sk_investigation",   "Investigation (INT)",    "add_prof_if_checked", ["f_int", "f_prof"]),
            computed("f_sk_medicine",        "Medicine (WIS)",         "add_prof_if_checked", ["f_wis", "f_prof"]),
            computed("f_sk_nature",          "Nature (INT)",           "add_prof_if_checked", ["f_int", "f_prof"]),
            computed("f_sk_perception",      "Perception (WIS)",       "add_prof_if_checked", ["f_wis", "f_prof"]),
            computed("f_sk_performance",     "Performance (CHA)",      "add_prof_if_checked", ["f_cha", "f_prof"]),
            computed("f_sk_persuasion",      "Persuasion (CHA)",       "add_prof_if_checked", ["f_cha", "f_prof"]),
            computed("f_sk_religion",        "Religion (INT)",         "add_prof_if_checked", ["f_int", "f_prof"]),
            computed("f_sk_sleight",         "Sleight of Hand (DEX)",  "add_prof_if_checked", ["f_dex", "f_prof"]),
            computed("f_sk_stealth",         "Stealth (DEX)",          "add_prof_if_checked", ["f_dex", "f_prof"]),
            computed("f_sk_survival",        "Survival (WIS)",         "add_prof_if_checked", ["f_wis", "f_prof"]),
        ]
    },

    // ---- PASSIVE SCORES ----
    {
        id: "block_passives",
        label: "Passive Scores",
        fields: [
            computed("f_pass_perc",  "Passive Perception",    "passive", ["f_sk_perception"]),
            computed("f_pass_inv",   "Passive Investigation", "passive", ["f_sk_investigation"]),
            computed("f_pass_ins",   "Passive Insight",       "passive", ["f_sk_insight"]),
        ]
    },

    // ---- CURRENCY ----
    // Field IDs use the f_coin_ prefix so currency.js can find them.
    {
        id: "block_currency",
        label: "Currency",
        fields: [
            flat("f_coin_pp", "Platinum (PP)", 0),
            flat("f_coin_gp", "Gold (GP)",     0),
            flat("f_coin_ep", "Electrum (EP)", 0),
            flat("f_coin_sp", "Silver (SP)",   0),
            flat("f_coin_cp", "Copper (CP)",   0),
        ]
    },

    // ---- SPELLCASTING ----
    {
        id: "block_spellcasting",
        label: "Spellcasting",
        fields: [
            text("f_spell_class",   "Spellcasting Class", "e.g. Wizard"),
            text("f_spell_ability", "Spellcasting Ability", "e.g. INT"),
            computed("f_spell_attack", "Spell Attack Bonus", "spell_attack",   ["f_int"]),
            computed("f_spell_dc",     "Spell Save DC",      "spell_save_dc",  ["f_int"]),
        ]
    },

];

// ---- Deep-clone helper used when creating new characters ----
export function cloneSchema() {
    return JSON.parse(JSON.stringify(DEFAULT_SCHEMA));
}
