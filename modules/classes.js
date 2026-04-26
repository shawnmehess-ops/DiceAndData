// ============================================================
// CLASSES.JS — Character class system
//
// Covers:
//   • Class definitions with stat modifiers, hit die, saves
//   • Subclasses per class
//   • Language selection (Common always known + X extras)
//   • Class spell lists (subset of the full spell DB)
//   • Class feats unlocked at specific levels
//
// State shape (stored on state.classData):
// {
//   classId:     string | null,
//   subclassId:  string | null,
//   languages:   string[],        // includes "Common" always
//   feats:       string[],        // feat ids the player has chosen
// }
// ============================================================

import { db, auth }       from "./firebase.js";
import { state }          from "./state.js";
import { getFieldById }   from "./state.js";
import { loadSpells }     from "./spells.js";

let debouncedSave = () => {};
export function setDebouncedSave(fn) { debouncedSave = fn; }

// ============================================================
// CLASS DEFINITIONS
// ============================================================
export const CLASSES = {

    fighter: {
        name: "Fighter",
        hitDie: 10,
        // Stat bonuses applied on class selection (one-time advisory — sheet
        // values are adjusted by the player; these are shown as suggestions)
        primaryStats: ["str", "con"],
        savingThrows: ["str", "con"],
        armorProfs:   ["Light", "Medium", "Heavy", "Shields"],
        weaponProfs:  ["Simple", "Martial"],
        extraLanguages: 0,
        spellcasting: null,   // non-caster
        subclasses: {
            champion: {
                name: "Champion",
                description: "Dedicated to raw physical excellence, the Champion improves critical hits and athletic abilities.",
                bonusStats: { str: 1 },
                feats: ["improved_critical", "remarkable_athlete", "additional_fighting_style"],
            },
            battlemaster: {
                name: "Battle Master",
                description: "A tactician who uses manoeuvres to gain combat superiority.",
                bonusStats: {},
                feats: ["combat_superiority", "students_of_war", "know_your_enemy"],
            },
            eldritch_knight: {
                name: "Eldritch Knight",
                description: "Weaves arcane magic into martial combat.",
                bonusStats: { int: 1 },
                spellcasting: "int",
                spellSchools: ["Abjuration", "Evocation"],
                feats: ["spellcasting", "weapon_bond", "war_magic"],
            },
        },
        feats: {
            second_wind:         { level: 1,  name: "Second Wind",         description: "Regain 1d10 + fighter level HP as a bonus action once per short rest." },
            action_surge:        { level: 2,  name: "Action Surge",        description: "Take one additional action on your turn, usable once per short rest." },
            extra_attack:        { level: 5,  name: "Extra Attack",        description: "Attack twice instead of once when you take the Attack action." },
            indomitable:         { level: 9,  name: "Indomitable",         description: "Reroll a failed saving throw, using the new roll. Once per long rest." },
            ability_score_improvement: { level: 4, name: "Ability Score Improvement", description: "Increase one ability score by 2, or two ability scores by 1." },
        },
    },

    wizard: {
        name: "Wizard",
        hitDie: 6,
        primaryStats: ["int"],
        savingThrows: ["int", "wis"],
        armorProfs:   [],
        weaponProfs:  ["Daggers", "Darts", "Slings", "Quarterstaffs", "Light Crossbows"],
        extraLanguages: 2,
        spellcasting: "int",
        subclasses: {
            evocation: {
                name: "School of Evocation",
                description: "Shapes destructive magical energy, protecting allies caught in blasts.",
                bonusStats: { int: 1 },
                spellSchools: ["Evocation"],
                feats: ["evocation_savant", "sculpt_spells", "potent_cantrip"],
            },
            abjuration: {
                name: "School of Abjuration",
                description: "Masters protective magic, creating wards and banishing enemies.",
                bonusStats: { wis: 1 },
                spellSchools: ["Abjuration"],
                feats: ["abjuration_savant", "arcane_ward", "projected_ward"],
            },
            divination: {
                name: "School of Divination",
                description: "Peer into the future and bend luck with Portent.",
                bonusStats: { wis: 1 },
                spellSchools: ["Divination"],
                feats: ["divination_savant", "portent", "expert_divination"],
            },
            necromancy: {
                name: "School of Necromancy",
                description: "Harnesses the power of life and death.",
                bonusStats: { con: 1 },
                spellSchools: ["Necromancy"],
                feats: ["necromancy_savant", "grim_harvest", "undead_thralls"],
            },
        },
        feats: {
            arcane_recovery:     { level: 1,  name: "Arcane Recovery",     description: "Recover spell slots totalling up to half your wizard level (rounded up) after a short rest, once per long rest." },
            spellbook:           { level: 1,  name: "Spellbook",           description: "You have a spellbook containing six 1st-level wizard spells. You learn additional spells by copying them." },
            ability_score_improvement: { level: 4, name: "Ability Score Improvement", description: "Increase one ability score by 2, or two ability scores by 1." },
            spell_mastery:       { level: 18, name: "Spell Mastery",       description: "Choose a 1st and 2nd level spell. You can cast them at their lowest level without expending a spell slot." },
        },
    },

    rogue: {
        name: "Rogue",
        hitDie: 8,
        primaryStats: ["dex"],
        savingThrows: ["dex", "int"],
        armorProfs:   ["Light", "Shields"],
        weaponProfs:  ["Simple", "Hand Crossbows", "Longswords", "Rapiers", "Shortswords"],
        extraLanguages: 1,
        spellcasting: null,
        subclasses: {
            thief: {
                name: "Thief",
                description: "Hones skills of stealth and thievery into a fine art.",
                bonusStats: { dex: 1 },
                feats: ["fast_hands", "second_story_work", "supreme_sneak"],
            },
            assassin: {
                name: "Assassin",
                description: "Trained to eliminate targets with swift, precise strikes.",
                bonusStats: { dex: 1 },
                feats: ["assassinate", "infiltration_expertise", "impostor"],
            },
            arcane_trickster: {
                name: "Arcane Trickster",
                description: "Enhances roguish skills with a touch of magic.",
                bonusStats: { int: 1 },
                spellcasting: "int",
                spellSchools: ["Enchantment", "Illusion"],
                feats: ["spellcasting", "mage_hand_legerdemain", "magical_ambush"],
            },
        },
        feats: {
            sneak_attack:        { level: 1,  name: "Sneak Attack",        description: "Deal extra damage (1d6 per 2 rogue levels) when you have advantage or an ally is adjacent to your target." },
            thieves_cant:        { level: 1,  name: "Thieves' Cant",       description: "Know a secret mix of slang, jargon, and code used among rogues." },
            cunning_action:      { level: 2,  name: "Cunning Action",      description: "Use a bonus action to Dash, Disengage, or Hide." },
            uncanny_dodge:       { level: 5,  name: "Uncanny Dodge",       description: "When an attacker you can see hits you, halve the attack's damage." },
            evasion:             { level: 7,  name: "Evasion",             description: "When subjected to an effect that allows a DEX save for half damage, take no damage on a success." },
            ability_score_improvement: { level: 4, name: "Ability Score Improvement", description: "Increase one ability score by 2, or two ability scores by 1." },
        },
    },

    cleric: {
        name: "Cleric",
        hitDie: 8,
        primaryStats: ["wis"],
        savingThrows: ["wis", "cha"],
        armorProfs:   ["Light", "Medium", "Shields"],
        weaponProfs:  ["Simple"],
        extraLanguages: 1,
        spellcasting: "wis",
        subclasses: {
            life: {
                name: "Life Domain",
                description: "Channels divine energy to heal and protect.",
                bonusStats: { wis: 1, con: 1 },
                spellSchools: null,   // null = no restriction
                feats: ["disciple_of_life", "preserve_life", "blessed_healer"],
            },
            light: {
                name: "Light Domain",
                description: "Wields searing radiance to drive back the darkness.",
                bonusStats: { wis: 1 },
                spellSchools: ["Evocation"],
                feats: ["warding_flare", "radiance_of_dawn", "corona_of_light"],
            },
            war: {
                name: "War Domain",
                description: "A warrior-priest devoted to the gods of battle.",
                bonusStats: { str: 1, wis: 1 },
                armorProfs: ["Heavy"],
                weaponProfs: ["Martial"],
                feats: ["war_priest", "guided_strike", "divine_strike"],
            },
            trickery: {
                name: "Trickery Domain",
                description: "A servant of gods of deception, using illusions and misdirection.",
                bonusStats: { dex: 1 },
                spellSchools: ["Illusion", "Enchantment"],
                feats: ["blessing_of_the_trickster", "invoke_duplicity", "cloak_of_shadows"],
            },
        },
        feats: {
            divine_domain:       { level: 1,  name: "Divine Domain",       description: "Choose a domain that grants bonus spells, proficiencies, and channel divinity options." },
            channel_divinity:    { level: 2,  name: "Channel Divinity",    description: "Channel divine energy to fuel magical effects, once per short rest." },
            destroy_undead:      { level: 5,  name: "Destroy Undead",      description: "When undead fail their saving throw against Turn Undead, they are destroyed if below a CR threshold." },
            divine_intervention: { level: 10, name: "Divine Intervention", description: "Implore your deity for aid. Roll d100; if ≤ cleric level, the deity intervenes." },
            ability_score_improvement: { level: 4, name: "Ability Score Improvement", description: "Increase one ability score by 2, or two ability scores by 1." },
        },
    },

    ranger: {
        name: "Ranger",
        hitDie: 10,
        primaryStats: ["dex", "wis"],
        savingThrows: ["str", "dex"],
        armorProfs:   ["Light", "Medium", "Shields"],
        weaponProfs:  ["Simple", "Martial"],
        extraLanguages: 1,
        spellcasting: "wis",
        subclasses: {
            hunter: {
                name: "Hunter",
                description: "Learns techniques to hunt the most dangerous prey.",
                bonusStats: { dex: 1 },
                feats: ["hunters_prey", "defensive_tactics", "multiattack"],
            },
            beast_master: {
                name: "Beast Master",
                description: "Forms a mystical bond with an animal companion.",
                bonusStats: { wis: 1 },
                feats: ["rangers_companion", "exceptional_training", "bestial_fury"],
            },
        },
        feats: {
            favored_enemy:       { level: 1,  name: "Favored Enemy",       description: "Advantage on Survival checks to track and Intelligence checks to recall information about a chosen enemy type." },
            natural_explorer:    { level: 1,  name: "Natural Explorer",    description: "Expertise with a favoured terrain type: doubled proficiency, no difficult terrain movement penalty." },
            fighting_style:      { level: 2,  name: "Fighting Style",      description: "Adopt a fighting style: Archery (+2 ranged attack rolls), Defense (+1 AC in armor), or Dueling (+2 damage with one-handed weapon)." },
            extra_attack:        { level: 5,  name: "Extra Attack",        description: "Attack twice instead of once when you take the Attack action." },
            ability_score_improvement: { level: 4, name: "Ability Score Improvement", description: "Increase one ability score by 2, or two ability scores by 1." },
        },
    },

    bard: {
        name: "Bard",
        hitDie: 8,
        primaryStats: ["cha"],
        savingThrows: ["dex", "cha"],
        armorProfs:   ["Light"],
        weaponProfs:  ["Simple", "Hand Crossbows", "Longswords", "Rapiers", "Shortswords"],
        extraLanguages: 3,
        spellcasting: "cha",
        subclasses: {
            lore: {
                name: "College of Lore",
                description: "Plumbs the depths of magical knowledge, cutting down foes with razor wit.",
                bonusStats: { cha: 1, int: 1 },
                feats: ["bonus_proficiencies", "cutting_words", "additional_magical_secrets"],
            },
            valor: {
                name: "College of Valor",
                description: "Tells stories of great heroes through bold deeds in battle.",
                bonusStats: { cha: 1, str: 1 },
                armorProfs: ["Medium", "Shields"],
                weaponProfs: ["Martial"],
                feats: ["combat_inspiration", "extra_attack", "battle_magic"],
            },
        },
        feats: {
            bardic_inspiration:  { level: 1,  name: "Bardic Inspiration",  description: "Grant an ally a d6 Bardic Inspiration die to add to one ability check, attack roll, or saving throw. Increases with level." },
            jack_of_all_trades:  { level: 2,  name: "Jack of All Trades",  description: "Add half proficiency (rounded down) to any ability check not using full proficiency." },
            song_of_rest:        { level: 2,  name: "Song of Rest",        description: "Allies who spend Hit Dice during a short rest you participate in regain extra HP (1d6, scaling)." },
            expertise:           { level: 3,  name: "Expertise",           description: "Double proficiency bonus for two skill proficiencies of your choice." },
            font_of_inspiration: { level: 5,  name: "Font of Inspiration", description: "Regain Bardic Inspiration uses after a short or long rest." },
            ability_score_improvement: { level: 4, name: "Ability Score Improvement", description: "Increase one ability score by 2, or two ability scores by 1." },
        },
    },

    paladin: {
        name: "Paladin",
        hitDie: 10,
        primaryStats: ["str", "cha"],
        savingThrows: ["wis", "cha"],
        armorProfs:   ["Light", "Medium", "Heavy", "Shields"],
        weaponProfs:  ["Simple", "Martial"],
        extraLanguages: 0,
        spellcasting: "cha",
        subclasses: {
            devotion: {
                name: "Oath of Devotion",
                description: "Upholds the highest ideals of justice and order.",
                bonusStats: { cha: 1 },
                spellSchools: null,
                feats: ["sacred_weapon", "turn_the_unholy", "aura_of_devotion"],
            },
            ancients: {
                name: "Oath of the Ancients",
                description: "Pledged to preserve light, joy, and beauty against darkness.",
                bonusStats: { wis: 1 },
                spellSchools: null,
                feats: ["natures_wrath", "turn_the_faithless", "aura_of_warding"],
            },
            vengeance: {
                name: "Oath of Vengeance",
                description: "Hunts those who have committed heinous sins.",
                bonusStats: { str: 1 },
                spellSchools: null,
                feats: ["abjure_enemy", "vow_of_enmity", "soul_of_vengeance"],
            },
        },
        feats: {
            divine_sense:        { level: 1,  name: "Divine Sense",        description: "Detect the location of celestials, fiends, and undead within 60 ft. Uses = 1 + CHA modifier per long rest." },
            lay_on_hands:        { level: 1,  name: "Lay on Hands",        description: "A pool of healing power = 5 × paladin level. Use as an action to restore HP or cure disease/poison." },
            divine_smite:        { level: 2,  name: "Divine Smite",        description: "Expend a spell slot on a hit to deal extra radiant damage (2d8 per slot level, +1d8 vs undead/fiends)." },
            aura_of_protection:  { level: 6,  name: "Aura of Protection",  description: "Allies within 10 ft add your CHA modifier to saving throws." },
            ability_score_improvement: { level: 4, name: "Ability Score Improvement", description: "Increase one ability score by 2, or two ability scores by 1." },
        },
    },

    druid: {
        name: "Druid",
        hitDie: 8,
        primaryStats: ["wis"],
        savingThrows: ["int", "wis"],
        armorProfs:   ["Light", "Medium", "Shields"],
        weaponProfs:  ["Clubs", "Daggers", "Darts", "Javelins", "Maces", "Quarterstaffs", "Scimitars", "Sickles", "Slings", "Spears"],
        extraLanguages: 1,
        spellcasting: "wis",
        subclasses: {
            land: {
                name: "Circle of the Land",
                description: "Draws power from a specific natural environment.",
                bonusStats: { wis: 1 },
                spellSchools: null,
                feats: ["bonus_cantrip", "natural_recovery", "lands_stride"],
            },
            moon: {
                name: "Circle of the Moon",
                description: "Masters the art of transforming into powerful beasts.",
                bonusStats: { con: 1 },
                feats: ["combat_wild_shape", "circle_forms", "elemental_wild_shape"],
            },
        },
        feats: {
            druidic:             { level: 1,  name: "Druidic",             description: "Know Druidic, the secret language of druids. Leave hidden messages that only other druids can spot." },
            wild_shape:          { level: 2,  name: "Wild Shape",          description: "Magically assume the shape of a beast (CR ¼ at 2nd, ½ at 4th, 1 at 8th). Twice per short rest." },
            timeless_body:       { level: 18, name: "Timeless Body",       description: "No longer age magically. Cannot be aged magically." },
            ability_score_improvement: { level: 4, name: "Ability Score Improvement", description: "Increase one ability score by 2, or two ability scores by 1." },
        },
    },

    sorcerer: {
        name: "Sorcerer",
        hitDie: 6,
        primaryStats: ["cha"],
        savingThrows: ["con", "cha"],
        armorProfs:   [],
        weaponProfs:  ["Daggers", "Darts", "Slings", "Quarterstaffs", "Light Crossbows"],
        extraLanguages: 0,
        spellcasting: "cha",
        subclasses: {
            draconic: {
                name: "Draconic Bloodline",
                description: "Power surges from a dragon ancestor, granting resilience and elemental affinity.",
                bonusStats: { cha: 1, con: 1 },
                feats: ["draconic_resilience", "elemental_affinity", "dragon_wings"],
            },
            wild_magic: {
                name: "Wild Magic",
                description: "Magical power surges unpredictably, fuelling wild surges.",
                bonusStats: { cha: 1 },
                feats: ["wild_magic_surge", "tides_of_chaos", "bend_luck"],
            },
        },
        feats: {
            sorcerous_origin:    { level: 1,  name: "Sorcerous Origin",    description: "Your innate magic stems from a chosen source that shapes your powers and grants additional abilities." },
            font_of_magic:       { level: 2,  name: "Font of Magic",       description: "Gain sorcery points = your sorcerer level. Spend them to create spell slots or fuel Metamagic." },
            metamagic:           { level: 3,  name: "Metamagic",           description: "Choose two Metamagic options (Careful, Distant, Empowered, Extended, Heightened, Quickened, Subtle, Twinned)." },
            ability_score_improvement: { level: 4, name: "Ability Score Improvement", description: "Increase one ability score by 2, or two ability scores by 1." },
        },
    },

    warlock: {
        name: "Warlock",
        hitDie: 8,
        primaryStats: ["cha"],
        savingThrows: ["wis", "cha"],
        armorProfs:   ["Light"],
        weaponProfs:  ["Simple"],
        extraLanguages: 1,
        spellcasting: "cha",
        subclasses: {
            fiend: {
                name: "The Fiend",
                description: "Pact forged with a powerful devil or demon, granting dark powers.",
                bonusStats: { cha: 1 },
                spellSchools: null,
                feats: ["dark_ones_blessing", "dark_ones_own_luck", "fiendish_resilience"],
            },
            archfey: {
                name: "The Archfey",
                description: "Patron is a lord of the fey, granting enchanting and terrifying abilities.",
                bonusStats: { cha: 1 },
                spellSchools: ["Enchantment", "Illusion"],
                feats: ["fey_presence", "misty_escape", "beguiling_defenses"],
            },
            great_old_one: {
                name: "The Great Old One",
                description: "Pact with an unknowable entity beyond the stars.",
                bonusStats: { int: 1 },
                spellSchools: null,
                feats: ["awakened_mind", "entropic_ward", "thought_shield"],
            },
        },
        feats: {
            otherworldly_patron: { level: 1,  name: "Otherworldly Patron", description: "You have made a pact with an otherworldly being that grants you power." },
            pact_magic:          { level: 1,  name: "Pact Magic",          description: "Regain all spell slots after a short or long rest. Slots are always cast at your highest level." },
            eldrich_invocations: { level: 2,  name: "Eldritch Invocations", description: "Learn two eldritch invocations — magical enhancements from your patron." },
            pact_boon:           { level: 3,  name: "Pact Boon",           description: "Choose Pact of the Chain (familiar), Pact of the Blade (magical weapon), or Pact of the Tome (grimoire)." },
            ability_score_improvement: { level: 4, name: "Ability Score Improvement", description: "Increase one ability score by 2, or two ability scores by 1." },
        },
    },

    monk: {
        name: "Monk",
        hitDie: 8,
        primaryStats: ["dex", "wis"],
        savingThrows: ["str", "dex"],
        armorProfs:   [],
        weaponProfs:  ["Simple", "Shortswords"],
        extraLanguages: 0,
        spellcasting: null,
        subclasses: {
            open_hand: {
                name: "Way of the Open Hand",
                description: "Masters the art of unarmed combat with stunning technique.",
                bonusStats: { dex: 1 },
                feats: ["open_hand_technique", "wholeness_of_body", "quivering_palm"],
            },
            shadow: {
                name: "Way of Shadow",
                description: "Weaves stealth and darkness into combat.",
                bonusStats: { dex: 1 },
                spellcasting: "wis",
                spellSchools: ["Illusion"],
                feats: ["shadow_arts", "shadow_step", "cloak_of_shadows"],
            },
            four_elements: {
                name: "Way of the Four Elements",
                description: "Harnesses elemental energy through ki.",
                bonusStats: { wis: 1 },
                feats: ["disciple_of_elements", "elemental_attunement"],
            },
        },
        feats: {
            unarmored_defense:   { level: 1,  name: "Unarmored Defense",   description: "AC = 10 + DEX modifier + WIS modifier when wearing no armor." },
            martial_arts:        { level: 1,  name: "Martial Arts",        description: "Use DEX instead of STR for unarmed/monk weapon attacks and damage. Unarmed strike damage uses monk die." },
            ki:                  { level: 2,  name: "Ki",                  description: "Gain ki points = monk level. Spend them on Flurry of Blows, Patient Defense, or Step of the Wind." },
            slow_fall:           { level: 4,  name: "Slow Fall",           description: "Reduce fall damage by 5 × monk level as a reaction." },
            extra_attack:        { level: 5,  name: "Extra Attack",        description: "Attack twice instead of once when you take the Attack action." },
            ability_score_improvement: { level: 4, name: "Ability Score Improvement", description: "Increase one ability score by 2, or two ability scores by 1." },
        },
    },

    barbarian: {
        name: "Barbarian",
        hitDie: 12,
        primaryStats: ["str", "con"],
        savingThrows: ["str", "con"],
        armorProfs:   ["Light", "Medium", "Shields"],
        weaponProfs:  ["Simple", "Martial"],
        extraLanguages: 0,
        spellcasting: null,
        subclasses: {
            berserker: {
                name: "Path of the Berserker",
                description: "Channels rage into a murderous frenzy.",
                bonusStats: { str: 1 },
                feats: ["frenzy", "mindless_rage", "intimidating_presence"],
            },
            totem_warrior: {
                name: "Path of the Totem Warrior",
                description: "Draws on a spirit animal for primal power.",
                bonusStats: { wis: 1 },
                feats: ["spirit_seeker", "totem_spirit", "aspect_of_the_beast"],
            },
        },
        feats: {
            rage:                { level: 1,  name: "Rage",                description: "Enter a battle rage (bonus action). Gain advantage on STR checks/saves, bonus damage, resistance to B/P/S damage. Uses per long rest scale with level." },
            unarmored_defense:   { level: 1,  name: "Unarmored Defense",   description: "AC = 10 + DEX modifier + CON modifier when wearing no armor." },
            reckless_attack:     { level: 2,  name: "Reckless Attack",     description: "Gain advantage on attack rolls this turn, but attacks against you have advantage until your next turn." },
            danger_sense:        { level: 2,  name: "Danger Sense",        description: "Advantage on DEX saving throws against effects you can see, while not blinded, deafened, or incapacitated." },
            extra_attack:        { level: 5,  name: "Extra Attack",        description: "Attack twice instead of once when you take the Attack action." },
            ability_score_improvement: { level: 4, name: "Ability Score Improvement", description: "Increase one ability score by 2, or two ability scores by 1." },
        },
    },
};

// ============================================================
// LANGUAGES
// ============================================================
export const ALL_LANGUAGES = [
    "Common", "Dwarvish", "Elvish", "Giant", "Gnomish", "Goblin",
    "Halfling", "Orcish", "Abyssal", "Celestial", "Draconic",
    "Deep Speech", "Infernal", "Primordial", "Sylvan", "Undercommon",
    "Thieves' Cant", "Druidic",
];

// ============================================================
// STATE HELPERS
// ============================================================
export function defaultClassData() {
    return { classId: null, subclassId: null, languages: ["Common"], feats: [] };
}

export function getClassData() {
    if (!state.classData) state.classData = defaultClassData();
    return state.classData;
}

// ============================================================
// SPELL LIST FILTERING
// ============================================================
// Given a class + optional subclass, return the allowed school names.
// null = no restriction (all schools allowed).
function allowedSchools(classId, subclassId) {
    const cls = CLASSES[classId];
    if (!cls) return null;

    // Subclass may narrow or expand
    if (subclassId) {
        const sub = cls.subclasses[subclassId];
        if (sub?.spellSchools !== undefined) return sub.spellSchools; // null means all
    }
    return null; // base class has no school restriction
}

export function isSpellAllowedForClass(spell, classId, subclassId) {
    const cls = CLASSES[classId];
    if (!cls) return false;
    if (!cls.spellcasting && !(CLASSES[classId]?.subclasses?.[subclassId]?.spellcasting)) return false;

    const schools = allowedSchools(classId, subclassId);
    if (schools === null) return true; // no restriction
    return schools.includes(spell.school);
}

// ============================================================
// RENDER — Class & Features panel
// ============================================================
export function renderClassPanel() {
    const container = document.getElementById("classPanelContent");
    if (!container) return;
    container.innerHTML = "";

    const cd = getClassData();
    const cls = cd.classId ? CLASSES[cd.classId] : null;

    // ---- Class selector ----
    const classRow = document.createElement("div");
    classRow.className = "class-row";

    const classLabel = document.createElement("label");
    classLabel.className   = "class-field-label";
    classLabel.textContent = "Class";

    const classSelect = document.createElement("select");
    classSelect.className = "class-select";
    const blankOpt = document.createElement("option");
    blankOpt.value = ""; blankOpt.textContent = "— Choose a class —";
    classSelect.appendChild(blankOpt);
    Object.entries(CLASSES).forEach(([id, c]) => {
        const opt = document.createElement("option");
        opt.value = id; opt.textContent = c.name;
        if (id === cd.classId) opt.selected = true;
        classSelect.appendChild(opt);
    });

    classSelect.onchange = () => {
        cd.classId    = classSelect.value || null;
        cd.subclassId = null;
        cd.feats      = [];
        // Reset extra languages to Common only on class change
        const newCls  = cd.classId ? CLASSES[cd.classId] : null;
        const extras  = newCls?.extraLanguages ?? 0;
        cd.languages  = cd.languages.slice(0, 1 + extras); // keep Common + up to limit
        if (!cd.languages.includes("Common")) cd.languages.unshift("Common");
        renderClassPanel();
        debouncedSave();
    };

    classRow.append(classLabel, classSelect);
    container.appendChild(classRow);

    if (!cls) return;

    // ---- Class summary ----
    const summary = document.createElement("div");
    summary.className = "class-summary";
    summary.innerHTML = `
        <div class="class-summary-grid">
            <span class="cs-label">Hit Die</span>    <span class="cs-val">d${cls.hitDie}</span>
            <span class="cs-label">Primary</span>    <span class="cs-val">${cls.primaryStats.map(s=>s.toUpperCase()).join(", ")}</span>
            <span class="cs-label">Saves</span>      <span class="cs-val">${cls.savingThrows.map(s=>s.toUpperCase()).join(", ")}</span>
            <span class="cs-label">Armor</span>      <span class="cs-val">${cls.armorProfs.join(", ") || "None"}</span>
            <span class="cs-label">Weapons</span>    <span class="cs-val">${cls.weaponProfs.join(", ")}</span>
            <span class="cs-label">Spellcasting</span><span class="cs-val">${cls.spellcasting ? cls.spellcasting.toUpperCase() : "None"}</span>
        </div>
    `;
    container.appendChild(summary);

    // ---- Subclass selector ----
    const subRow = document.createElement("div");
    subRow.className = "class-row";

    const subLabel = document.createElement("label");
    subLabel.className   = "class-field-label";
    subLabel.textContent = "Subclass";

    const subSelect = document.createElement("select");
    subSelect.className = "class-select";
    const subBlank = document.createElement("option");
    subBlank.value = ""; subBlank.textContent = "— Choose a subclass —";
    subSelect.appendChild(subBlank);
    Object.entries(cls.subclasses).forEach(([id, s]) => {
        const opt = document.createElement("option");
        opt.value = id; opt.textContent = s.name;
        if (id === cd.subclassId) opt.selected = true;
        subSelect.appendChild(opt);
    });

    subSelect.onchange = () => {
        cd.subclassId = subSelect.value || null;
        renderClassPanel();
        debouncedSave();
    };

    subRow.append(subLabel, subSelect);
    container.appendChild(subRow);

    // Subclass description
    if (cd.subclassId) {
        const sub = cls.subclasses[cd.subclassId];
        const desc = document.createElement("p");
        desc.className   = "class-subclass-desc";
        desc.textContent = sub.description;
        container.appendChild(desc);

        // Subclass stat bonuses
        if (sub.bonusStats && Object.keys(sub.bonusStats).length) {
            const bonusDiv = document.createElement("div");
            bonusDiv.className = "class-bonus-stats";
            bonusDiv.innerHTML = `<span class="class-field-label">Subclass Bonuses:</span> ` +
                Object.entries(sub.bonusStats)
                    .map(([s, v]) => `<span class="class-bonus-pill">+${v} ${s.toUpperCase()}</span>`)
                    .join(" ");
            container.appendChild(bonusDiv);
        }
    }

    // ---- Languages ----
    renderLanguageSection(container, cd, cls);

    // ---- Feats ----
    renderFeatsSection(container, cd, cls);
}

// ---- Languages sub-section ---------------------------------
function renderLanguageSection(container, cd, cls) {
    const total = 1 + (cls.extraLanguages ?? 0); // Common + extras

    const section = document.createElement("div");
    section.className = "class-section";

    const heading = document.createElement("div");
    heading.className = "class-section-heading";
    heading.innerHTML = `Languages <span class="class-section-count">${cd.languages.length} / ${total}</span>`;
    section.appendChild(heading);

    // Always-on Common badge
    const langList = document.createElement("div");
    langList.className = "class-lang-list";

    const commonBadge = document.createElement("span");
    commonBadge.className   = "class-lang-badge class-lang-badge--fixed";
    commonBadge.textContent = "Common";
    langList.appendChild(commonBadge);

    // Selectable extra language slots
    for (let i = 0; i < cls.extraLanguages; i++) {
        const existing = cd.languages[i + 1] ?? "";

        const sel = document.createElement("select");
        sel.className = "class-lang-select";

        const empty = document.createElement("option");
        empty.value = ""; empty.textContent = "— choose —";
        sel.appendChild(empty);

        ALL_LANGUAGES
            .filter(l => l !== "Common")
            .forEach(l => {
                // Disable languages already chosen in other slots
                const alreadyChosen = cd.languages.includes(l) && cd.languages[i + 1] !== l;
                const opt = document.createElement("option");
                opt.value    = l;
                opt.textContent = l;
                opt.selected = existing === l;
                opt.disabled = alreadyChosen;
                sel.appendChild(opt);
            });

        sel.onchange = () => {
            const newLangs = ["Common"];
            section.querySelectorAll(".class-lang-select").forEach(s => {
                if (s.value) newLangs.push(s.value);
            });
            cd.languages = newLangs;
            debouncedSave();
            // Refresh disabled state without full re-render
            renderClassPanel();
        };

        langList.appendChild(sel);
    }

    section.appendChild(langList);
    container.appendChild(section);
}

// ---- Feats sub-section -------------------------------------
function renderFeatsSection(container, cd, cls) {
    const level = parseInt(getFieldById("f_level")?.value) || 1;

    // Merge class feats + subclass feats
    const allFeats = { ...cls.feats };
    if (cd.subclassId) {
        const sub = cls.subclasses[cd.subclassId];
        Object.assign(allFeats, ...Object.entries(sub.feats ?? {}).map(([id, feat]) => ({ [id]: feat })));
    }

    const section = document.createElement("div");
    section.className = "class-section";

    const heading = document.createElement("div");
    heading.className = "class-section-heading";
    heading.textContent = "Class Features & Feats";
    section.appendChild(heading);

    Object.entries(allFeats).forEach(([id, feat]) => {
        const unlocked = level >= (feat.level ?? 1);
        const row      = document.createElement("div");
        row.className  = `class-feat-row${unlocked ? "" : " class-feat-row--locked"}`;

        const nameEl = document.createElement("span");
        nameEl.className   = "class-feat-name";
        nameEl.textContent = feat.name;

        const lvlBadge = document.createElement("span");
        lvlBadge.className   = "class-feat-level";
        lvlBadge.textContent = `Lv ${feat.level ?? 1}`;

        const desc = document.createElement("p");
        desc.className   = "class-feat-desc";
        desc.textContent = feat.description;

        const lock = document.createElement("span");
        lock.className   = "class-feat-lock";
        lock.textContent = unlocked ? "✓" : "🔒";
        lock.title       = unlocked ? "Unlocked" : `Unlocks at level ${feat.level}`;

        row.append(lock, nameEl, lvlBadge);
        row.appendChild(desc);
        section.appendChild(row);
    });

    container.appendChild(section);
}
