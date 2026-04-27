// ============================================================
// CLASSES.JS — Character class system
// ============================================================

import { state, getFieldById } from "./state.js";
import { renderSheet }         from "./sheet.js";
import { refreshComputedDisplays } from "./fields.js";

let debouncedSave = () => {};
export function setDebouncedSave(fn) { debouncedSave = fn; }


// ============================================================
// SKILL <-> field-id mapping
// ============================================================
const SKILL_FIELD = {
    acrobatics:     "f_sk_acrobatics",
    animal_handling:"f_sk_animal",
    arcana:         "f_sk_arcana",
    athletics:      "f_sk_athletics",
    deception:      "f_sk_deception",
    history:        "f_sk_history",
    insight:        "f_sk_insight",
    intimidation:   "f_sk_intimidation",
    investigation:  "f_sk_investigation",
    medicine:       "f_sk_medicine",
    nature:         "f_sk_nature",
    perception:     "f_sk_perception",
    performance:    "f_sk_performance",
    persuasion:     "f_sk_persuasion",
    religion:       "f_sk_religion",
    sleight_of_hand:"f_sk_sleight",
    stealth:        "f_sk_stealth",
    survival:       "f_sk_survival",
};

const SKILL_LABELS = {
    acrobatics:     "Acrobatics",
    animal_handling:"Animal Handling",
    arcana:         "Arcana",
    athletics:      "Athletics",
    deception:      "Deception",
    history:        "History",
    insight:        "Insight",
    intimidation:   "Intimidation",
    investigation:  "Investigation",
    medicine:       "Medicine",
    nature:         "Nature",
    perception:     "Perception",
    performance:    "Performance",
    persuasion:     "Persuasion",
    religion:       "Religion",
    sleight_of_hand:"Sleight of Hand",
    stealth:        "Stealth",
    survival:       "Survival",
};

// ============================================================
// CLASS DEFINITIONS
// ============================================================
export const CLASSES = {

    fighter: {
        name:"Fighter", hitDie:10,
        primaryStats:["str","con"], savingThrows:["str","con"],
        armorProfs:["Light","Medium","Heavy","Shields"],
        weaponProfs:["Simple","Martial"],
        extraLanguages:0, spellcasting:null,
        statBonus:{ str:1, con:1 },
        fixedSkills:[],
        skillChoices:{ count:2, pool:["acrobatics", "animal_handling", "arcana", "athletics", "deception", "history", "insight", "intimidation", "investigation", "medicine", "nature", "perception", "performance", "persuasion", "religion", "sleight_of_hand", "stealth", "survival"] },
        subclasses:{
            champion:{ name:"Champion",
                description:"Dedicated to raw physical excellence, the Champion improves critical hits and athletic abilities.",
                statBonus:{ str:1 },
                feats:{
                    improved_critical:{ level:3, name:"Improved Critical", description:"Your weapon attacks score a critical hit on a roll of 19 or 20." },
                    remarkable_athlete:{ level:7, name:"Remarkable Athlete", description:"Add half your proficiency bonus to STR, DEX, and CON checks you aren't already proficient in." },
                    additional_fighting_style:{ level:10, name:"Additional Fighting Style", description:"Choose a second option from the Fighting Style class feature." },
                },
            },
            battlemaster:{ name:"Battle Master",
                description:"A tactician who uses manoeuvres to gain combat superiority.",
                statBonus:{},
                feats:{
                    combat_superiority:{ level:3, name:"Combat Superiority", description:"Gain 4 superiority dice (d8). Spend them on manoeuvres to enhance attacks and control the battlefield." },
                    students_of_war:{ level:3, name:"Student of War", description:"Gain proficiency with one type of artisan's tools of your choice." },
                    know_your_enemy:{ level:7, name:"Know Your Enemy", description:"Spend 1 min observing a creature to learn two comparative stats vs. your own." },
                },
            },
            eldritch_knight:{ name:"Eldritch Knight",
                description:"Weaves arcane magic into martial combat.",
                statBonus:{ int:1 }, spellcasting:"int", spellSchools:["Abjuration","Evocation"],
                feats:{
                    spellcasting:{ level:3, name:"Spellcasting", description:"Cast spells from Abjuration and Evocation. INT is your spellcasting ability." },
                    weapon_bond:{ level:3, name:"Weapon Bond", description:"Bond with up to two weapons — you can't be disarmed, and can summon them as a bonus action." },
                    war_magic:{ level:7, name:"War Magic", description:"After casting a cantrip, make one weapon attack as a bonus action." },
                },
            },
        },
        feats:{
            second_wind:{ level:1, name:"Second Wind", description:"Regain 1d10 + fighter level HP as a bonus action, once per short rest." },
            action_surge:{ level:2, name:"Action Surge", description:"Take one additional action on your turn, once per short rest." },
            extra_attack:{ level:5, name:"Extra Attack", description:"Attack twice instead of once when you take the Attack action." },
            indomitable:{ level:9, name:"Indomitable", description:"Reroll a failed saving throw. Once per long rest." },
            ability_score_improvement:{ level:4, name:"Ability Score Improvement", description:"Increase one ability score by 2, or two scores by 1." },
        },
    },

    wizard: {
        name:"Wizard", hitDie:6,
        primaryStats:["int"], savingThrows:["int","wis"],
        armorProfs:[], weaponProfs:["Daggers","Darts","Slings","Quarterstaffs","Light Crossbows"],
        extraLanguages:2, spellcasting:"int",
        statBonus:{ int:2 },
        fixedSkills:[],
        skillChoices:{ count:2, pool:["acrobatics", "animal_handling", "arcana", "athletics", "deception", "history", "insight", "intimidation", "investigation", "medicine", "nature", "perception", "performance", "persuasion", "religion", "sleight_of_hand", "stealth", "survival"] },
        subclasses:{
            evocation:{ name:"School of Evocation",
                description:"Shapes destructive magical energy, protecting allies caught in blasts.",
                statBonus:{ int:1 }, spellSchools:["Evocation"],
                feats:{
                    evocation_savant:{ level:2, name:"Evocation Savant", description:"Halve the gold and time needed to copy Evocation spells into your spellbook." },
                    sculpt_spells:{ level:2, name:"Sculpt Spells", description:"Protect up to 1 + spell level allies from your Evocation spells automatically." },
                    potent_cantrip:{ level:6, name:"Potent Cantrip", description:"Creatures that succeed on saving throws against your cantrips take half damage." },
                },
            },
            abjuration:{ name:"School of Abjuration",
                description:"Masters protective magic, creating wards and banishing enemies.",
                statBonus:{ wis:1 }, spellSchools:["Abjuration"],
                feats:{
                    abjuration_savant:{ level:2, name:"Abjuration Savant", description:"Halve the gold and time to copy Abjuration spells into your spellbook." },
                    arcane_ward:{ level:2, name:"Arcane Ward", description:"Create a magical ward with HP = 2x wizard level + INT modifier. Absorbs damage instead of you." },
                    projected_ward:{ level:6, name:"Projected Ward", description:"When a creature within 30 ft is hit, use your reaction to have your Arcane Ward absorb the damage." },
                },
            },
            divination:{ name:"School of Divination",
                description:"Peer into the future and bend luck with Portent.",
                statBonus:{ wis:1 }, spellSchools:["Divination"],
                feats:{
                    divination_savant:{ level:2, name:"Divination Savant", description:"Halve the gold and time to copy Divination spells into your spellbook." },
                    portent:{ level:2, name:"Portent", description:"After a long rest, roll 2d20. Replace any attack roll, save, or ability check with one of these rolls." },
                    expert_divination:{ level:6, name:"Expert Divination", description:"When you cast a Divination spell of 2nd level or higher, regain a lower-level spell slot." },
                },
            },
            necromancy:{ name:"School of Necromancy",
                description:"Harnesses the power of life and death.",
                statBonus:{ con:1 }, spellSchools:["Necromancy"],
                feats:{
                    necromancy_savant:{ level:2, name:"Necromancy Savant", description:"Halve the gold and time to copy Necromancy spells into your spellbook." },
                    grim_harvest:{ level:2, name:"Grim Harvest", description:"Once per turn when you kill with a spell, regain HP equal to 2x (3x for Necromancy) the spell level." },
                    undead_thralls:{ level:6, name:"Undead Thralls", description:"Animate Dead can target one extra corpse. Undead you create gain bonus HP and damage." },
                },
            },
        },
        feats:{
            arcane_recovery:{ level:1, name:"Arcane Recovery", description:"Recover spell slots totalling up to half wizard level after a short rest, once per long rest." },
            spellbook:{ level:1, name:"Spellbook", description:"Contains six 1st-level wizard spells. Learn more by copying (50gp + 2hrs per level)." },
            ability_score_improvement:{ level:4, name:"Ability Score Improvement", description:"Increase one ability score by 2, or two scores by 1." },
            spell_mastery:{ level:18, name:"Spell Mastery", description:"Choose a 1st and 2nd level spell — cast them at their lowest level without expending a slot." },
        },
    },

    rogue: {
        name:"Rogue", hitDie:8,
        primaryStats:["dex"], savingThrows:["dex","int"],
        armorProfs:["Light","Shields"],
        weaponProfs:["Simple","Hand Crossbows","Longswords","Rapiers","Shortswords"],
        extraLanguages:1, spellcasting:null,
        statBonus:{ dex:2 },
        fixedSkills:["stealth"],
        skillChoices:{ count:3, pool:["acrobatics", "animal_handling", "arcana", "athletics", "deception", "history", "insight", "intimidation", "investigation", "medicine", "nature", "perception", "performance", "persuasion", "religion", "sleight_of_hand", "stealth", "survival"] },
        subclasses:{
            thief:{ name:"Thief",
                description:"Hones skills of stealth and thievery into a fine art.",
                statBonus:{ dex:1 },
                feats:{
                    fast_hands:{ level:3, name:"Fast Hands", description:"Use Cunning Action bonus action to make a Sleight of Hand check, use thieves' tools, or use an object." },
                    second_story_work:{ level:3, name:"Second-Story Work", description:"Climb at full speed without penalty. Add DEX modifier to jump distance." },
                    supreme_sneak:{ level:9, name:"Supreme Sneak", description:"Advantage on Stealth checks when moving no more than half speed." },
                },
            },
            assassin:{ name:"Assassin",
                description:"Trained to eliminate targets with swift, precise strikes.",
                statBonus:{ dex:1 },
                feats:{
                    assassinate:{ level:3, name:"Assassinate", description:"Advantage on attacks vs creatures that haven't taken a turn. Hits against surprised creatures are automatic criticals." },
                    infiltration_expertise:{ level:9, name:"Infiltration Expertise", description:"Spend 25gp + 7 days to create a false identity with documentation and established history." },
                    impostor:{ level:13, name:"Impostor", description:"Unerringly mimic another person's speech, writing, and behaviour after 3 hours of study." },
                },
            },
            arcane_trickster:{ name:"Arcane Trickster",
                description:"Enhances roguish skills with a touch of magic.",
                statBonus:{ int:1 }, spellcasting:"int", spellSchools:["Enchantment","Illusion"],
                feats:{
                    spellcasting:{ level:3, name:"Spellcasting", description:"Cast Enchantment and Illusion spells. INT is your spellcasting ability." },
                    mage_hand_legerdemain:{ level:3, name:"Mage Hand Legerdemain", description:"Mage Hand is invisible; use it to pick pockets, disarm traps, or open locks at range." },
                    magical_ambush:{ level:9, name:"Magical Ambush", description:"Creatures you are hidden from have disadvantage on saves against your spells." },
                },
            },
        },
        feats:{
            sneak_attack:{ level:1, name:"Sneak Attack", description:"Deal extra damage (1d6 per 2 rogue levels) when you have advantage or an ally flanks your target." },
            thieves_cant:{ level:1, name:"Thieves' Cant", description:"Know a secret mix of slang, jargon, and code used among rogues to pass messages." },
            cunning_action:{ level:2, name:"Cunning Action", description:"Use a bonus action to Dash, Disengage, or Hide." },
            uncanny_dodge:{ level:5, name:"Uncanny Dodge", description:"When an attacker you can see hits you, use your reaction to halve the attack's damage." },
            evasion:{ level:7, name:"Evasion", description:"DEX save for half damage: take no damage on success, half on failure." },
            ability_score_improvement:{ level:4, name:"Ability Score Improvement", description:"Increase one ability score by 2, or two scores by 1." },
        },
    },

    cleric: {
        name:"Cleric", hitDie:8,
        primaryStats:["wis"], savingThrows:["wis","cha"],
        armorProfs:["Light","Medium","Shields"], weaponProfs:["Simple"],
        extraLanguages:1, spellcasting:"wis",
        statBonus:{ wis:2 },
        fixedSkills:["religion"],
        skillChoices:{ count:1, pool:["acrobatics", "animal_handling", "arcana", "athletics", "deception", "history", "insight", "intimidation", "investigation", "medicine", "nature", "perception", "performance", "persuasion", "religion", "sleight_of_hand", "stealth", "survival"] },
        subclasses:{
            life:{ name:"Life Domain",
                description:"Channels divine energy to heal and protect.",
                statBonus:{ wis:1, con:1 },
                feats:{
                    disciple_of_life:{ level:1, name:"Disciple of Life", description:"Healing spells restore additional HP equal to 2 + the spell level." },
                    preserve_life:{ level:2, name:"Preserve Life", description:"Channel Divinity: restore HP = 5x cleric level, divided among creatures within 30 ft (up to half their max HP each)." },
                    blessed_healer:{ level:6, name:"Blessed Healer", description:"When you cast a healing spell on another creature, you regain 2 + the spell level HP." },
                },
            },
            light:{ name:"Light Domain",
                description:"Wields searing radiance to drive back the darkness.",
                statBonus:{ wis:1 }, spellSchools:["Evocation"],
                feats:{
                    warding_flare:{ level:1, name:"Warding Flare", description:"Impose disadvantage on an attack against you (WIS modifier times per long rest)." },
                    radiance_of_dawn:{ level:2, name:"Radiance of Dawn", description:"Channel Divinity: dispel magical darkness and deal 2d10 + cleric level radiant damage to hostiles." },
                    corona_of_light:{ level:6, name:"Corona of Light", description:"Emit sunlight (60 ft radius). Enemies in sunlight have disadvantage on saves against fire/radiant spells." },
                },
            },
            war:{ name:"War Domain",
                description:"A warrior-priest devoted to the gods of battle.",
                statBonus:{ str:1, wis:1 }, armorProfs:["Heavy"], weaponProfs:["Martial"],
                feats:{
                    war_priest:{ level:1, name:"War Priest", description:"Make a weapon attack as a bonus action a number of times equal to your WIS modifier per long rest." },
                    guided_strike:{ level:2, name:"Guided Strike", description:"Channel Divinity: gain +10 to an attack roll (declared after rolling but before outcome)." },
                    divine_strike:{ level:8, name:"Divine Strike", description:"Once per turn, deal an extra 1d8 (2d8 at 14th) weapon damage of your deity's type." },
                },
            },
            trickery:{ name:"Trickery Domain",
                description:"A servant of gods of deception, using illusions and misdirection.",
                statBonus:{ dex:1 }, spellSchools:["Illusion","Enchantment"],
                feats:{
                    blessing_of_the_trickster:{ level:1, name:"Blessing of the Trickster", description:"Touch a willing creature to grant advantage on Stealth checks for 1 hour." },
                    invoke_duplicity:{ level:2, name:"Invoke Duplicity", description:"Channel Divinity: create a perfect illusion of yourself for 1 minute." },
                    cloak_of_shadows:{ level:6, name:"Cloak of Shadows", description:"Use an action to become invisible until the end of your next turn." },
                },
            },
        },
        feats:{
            divine_domain:{ level:1, name:"Divine Domain", description:"Choose a domain granting bonus spells, proficiencies, and Channel Divinity options." },
            channel_divinity:{ level:2, name:"Channel Divinity", description:"Channel divine energy to fuel magical effects, once per short rest." },
            destroy_undead:{ level:5, name:"Destroy Undead", description:"When undead fail their Turn Undead save, they are destroyed if below a CR threshold." },
            divine_intervention:{ level:10, name:"Divine Intervention", description:"Roll d100; if <= cleric level, your deity intervenes. Once per long rest." },
            ability_score_improvement:{ level:4, name:"Ability Score Improvement", description:"Increase one ability score by 2, or two scores by 1." },
        },
    },

    ranger: {
        name:"Ranger", hitDie:10,
        primaryStats:["dex","wis"], savingThrows:["str","dex"],
        armorProfs:["Light","Medium","Shields"], weaponProfs:["Simple","Martial"],
        extraLanguages:1, spellcasting:"wis",
        statBonus:{ dex:1, wis:1 },
        fixedSkills:["survival","perception"],
        skillChoices:{ count:1, pool:["acrobatics", "animal_handling", "arcana", "athletics", "deception", "history", "insight", "intimidation", "investigation", "medicine", "nature", "perception", "performance", "persuasion", "religion", "sleight_of_hand", "stealth", "survival"] },
        subclasses:{
            hunter:{ name:"Hunter",
                description:"Learns techniques to hunt the most dangerous prey.",
                statBonus:{ dex:1 },
                feats:{
                    hunters_prey:{ level:3, name:"Hunter's Prey", description:"Choose Colossus Slayer (1d8 extra vs injured), Giant Killer (reaction attack), or Horde Breaker (extra attack on nearby foe)." },
                    defensive_tactics:{ level:7, name:"Defensive Tactics", description:"Choose Escape the Horde, Multiattack Defense (+4 AC after first hit), or Steel Will (advantage vs frightened)." },
                    multiattack:{ level:11, name:"Multiattack", description:"Volley (ranged attack all in 10 ft radius) or Whirlwind Attack (melee attack all adjacent creatures)." },
                },
            },
            beast_master:{ name:"Beast Master",
                description:"Forms a mystical bond with an animal companion.",
                statBonus:{ wis:1 },
                feats:{
                    rangers_companion:{ level:3, name:"Ranger's Companion", description:"Gain a beast companion (CR 1/4 or lower). It acts on your initiative and obeys your commands." },
                    exceptional_training:{ level:7, name:"Exceptional Training", description:"Your companion can Dash, Disengage, Dodge, or Help as a bonus action." },
                    bestial_fury:{ level:11, name:"Bestial Fury", description:"Your companion can make two attacks when you command it to attack." },
                },
            },
        },
        feats:{
            favored_enemy:{ level:1, name:"Favored Enemy", description:"Advantage on Survival to track and INT checks to recall info about a chosen creature type." },
            natural_explorer:{ level:1, name:"Natural Explorer", description:"Expertise in a favoured terrain: double proficiency, normal movement, can't become lost." },
            fighting_style:{ level:2, name:"Fighting Style", description:"Archery (+2 ranged attacks), Defense (+1 AC), or Dueling (+2 damage one-handed)." },
            extra_attack:{ level:5, name:"Extra Attack", description:"Attack twice instead of once when you take the Attack action." },
            ability_score_improvement:{ level:4, name:"Ability Score Improvement", description:"Increase one ability score by 2, or two scores by 1." },
        },
    },

    bard: {
        name:"Bard", hitDie:8,
        primaryStats:["cha"], savingThrows:["dex","cha"],
        armorProfs:["Light"],
        weaponProfs:["Simple","Hand Crossbows","Longswords","Rapiers","Shortswords"],
        extraLanguages:3, spellcasting:"cha",
        statBonus:{ cha:2 },
        fixedSkills:["performance"],
        skillChoices:{ count:2, pool:["acrobatics", "animal_handling", "arcana", "athletics", "deception", "history", "insight", "intimidation", "investigation", "medicine", "nature", "perception", "performance", "persuasion", "religion", "sleight_of_hand", "stealth", "survival"] },
        subclasses:{
            lore:{ name:"College of Lore",
                description:"Plumbs the depths of magical knowledge, cutting down foes with razor wit.",
                statBonus:{ cha:1, int:1 },
                feats:{
                    bonus_proficiencies:{ level:3, name:"Bonus Proficiencies", description:"Gain proficiency in three skills of your choice." },
                    cutting_words:{ level:3, name:"Cutting Words", description:"Use a reaction to subtract a Bardic Inspiration die from a creature's attack, damage, or ability check." },
                    additional_magical_secrets:{ level:6, name:"Additional Magical Secrets", description:"Learn two spells from any class. They count as bard spells." },
                },
            },
            valor:{ name:"College of Valor",
                description:"Tells stories of great heroes through bold deeds in battle.",
                statBonus:{ cha:1, str:1 }, armorProfs:["Medium","Shields"], weaponProfs:["Martial"],
                feats:{
                    combat_inspiration:{ level:3, name:"Combat Inspiration", description:"An ally can add their Bardic Inspiration die to a weapon damage roll or AC against one attack." },
                    extra_attack:{ level:6, name:"Extra Attack", description:"Attack twice instead of once when you take the Attack action." },
                    battle_magic:{ level:14, name:"Battle Magic", description:"When you use your action to cast a bard spell, make a weapon attack as a bonus action." },
                },
            },
        },
        feats:{
            bardic_inspiration:{ level:1, name:"Bardic Inspiration", description:"Grant an ally a d6 die (scales with level) to add to one roll. Uses = CHA modifier per long rest." },
            jack_of_all_trades:{ level:2, name:"Jack of All Trades", description:"Add half proficiency to ability checks you're not already proficient in." },
            song_of_rest:{ level:2, name:"Song of Rest", description:"Allies spending Hit Dice on a short rest you join regain extra HP (1d6, scaling)." },
            expertise:{ level:3, name:"Expertise", description:"Double proficiency for two skill or tool proficiencies." },
            font_of_inspiration:{ level:5, name:"Font of Inspiration", description:"Regain Bardic Inspiration uses on a short or long rest." },
            ability_score_improvement:{ level:4, name:"Ability Score Improvement", description:"Increase one ability score by 2, or two scores by 1." },
        },
    },

    paladin: {
        name:"Paladin", hitDie:10,
        primaryStats:["str","cha"], savingThrows:["wis","cha"],
        armorProfs:["Light","Medium","Heavy","Shields"], weaponProfs:["Simple","Martial"],
        extraLanguages:0, spellcasting:"cha",
        statBonus:{ str:1, cha:1 },
        fixedSkills:["religion"],
        skillChoices:{ count:1, pool:["acrobatics", "animal_handling", "arcana", "athletics", "deception", "history", "insight", "intimidation", "investigation", "medicine", "nature", "perception", "performance", "persuasion", "religion", "sleight_of_hand", "stealth", "survival"] },
        subclasses:{
            devotion:{ name:"Oath of Devotion",
                description:"Upholds the highest ideals of justice and order.",
                statBonus:{ cha:1 },
                feats:{
                    sacred_weapon:{ level:3, name:"Sacred Weapon", description:"Channel Divinity: imbue a weapon with +CHA modifier bonus to attack rolls for 1 minute." },
                    turn_the_unholy:{ level:3, name:"Turn the Unholy", description:"Channel Divinity: fiends and undead within 30 ft must make a WIS save or be turned for 1 minute." },
                    aura_of_devotion:{ level:7, name:"Aura of Devotion", description:"You and allies within 10 ft can't be charmed while you're conscious." },
                },
            },
            ancients:{ name:"Oath of the Ancients",
                description:"Pledged to preserve light, joy, and beauty against darkness.",
                statBonus:{ wis:1 },
                feats:{
                    natures_wrath:{ level:3, name:"Nature's Wrath", description:"Channel Divinity: use vines to restrain a creature until it makes a STR or DEX save." },
                    turn_the_faithless:{ level:3, name:"Turn the Faithless", description:"Channel Divinity: fey and fiends within 30 ft must make a WIS save or be turned." },
                    aura_of_warding:{ level:7, name:"Aura of Warding", description:"You and allies within 10 ft have resistance to damage from spells." },
                },
            },
            vengeance:{ name:"Oath of Vengeance",
                description:"Hunts those who have committed heinous sins.",
                statBonus:{ str:1 },
                feats:{
                    abjure_enemy:{ level:3, name:"Abjure Enemy", description:"Channel Divinity: frighten one creature (WIS save); fiends and undead have disadvantage on the save." },
                    vow_of_enmity:{ level:3, name:"Vow of Enmity", description:"Channel Divinity: gain advantage on attacks against one creature within 10 ft for 1 minute." },
                    soul_of_vengeance:{ level:7, name:"Soul of Vengeance", description:"When the target of Vow of Enmity attacks, you can make a melee weapon attack as a reaction." },
                },
            },
        },
        feats:{
            divine_sense:{ level:1, name:"Divine Sense", description:"Detect celestials, fiends, and undead within 60 ft. Uses = 1 + CHA modifier per long rest." },
            lay_on_hands:{ level:1, name:"Lay on Hands", description:"Healing pool = 5x paladin level. Restore HP or cure disease/poison as an action." },
            divine_smite:{ level:2, name:"Divine Smite", description:"On a hit, expend a spell slot for 2d8 extra radiant damage per slot level (+1d8 vs undead/fiends)." },
            aura_of_protection:{ level:6, name:"Aura of Protection", description:"Allies within 10 ft (30 ft at 18th) add your CHA modifier to saving throws." },
            ability_score_improvement:{ level:4, name:"Ability Score Improvement", description:"Increase one ability score by 2, or two scores by 1." },
        },
    },

    druid: {
        name:"Druid", hitDie:8,
        primaryStats:["wis"], savingThrows:["int","wis"],
        armorProfs:["Light","Medium","Shields"],
        weaponProfs:["Clubs","Daggers","Darts","Javelins","Maces","Quarterstaffs","Scimitars","Sickles","Slings","Spears"],
        extraLanguages:1, spellcasting:"wis",
        statBonus:{ wis:2 },
        fixedSkills:["nature"],
        skillChoices:{ count:1, pool:["acrobatics", "animal_handling", "arcana", "athletics", "deception", "history", "insight", "intimidation", "investigation", "medicine", "nature", "perception", "performance", "persuasion", "religion", "sleight_of_hand", "stealth", "survival"] },
        subclasses:{
            land:{ name:"Circle of the Land",
                description:"Draws power from a specific natural environment.",
                statBonus:{ wis:1 },
                feats:{
                    bonus_cantrip:{ level:2, name:"Bonus Cantrip", description:"Learn one additional druid cantrip of your choice." },
                    natural_recovery:{ level:2, name:"Natural Recovery", description:"Recover spell slots totalling up to half druid level after a short rest, once per long rest." },
                    lands_stride:{ level:6, name:"Land's Stride", description:"Moving through nonmagical difficult terrain costs no extra movement. Immune to nonmagical plants that impede movement." },
                },
            },
            moon:{ name:"Circle of the Moon",
                description:"Masters the art of transforming into powerful beasts.",
                statBonus:{ con:1 },
                feats:{
                    combat_wild_shape:{ level:2, name:"Combat Wild Shape", description:"Wild Shape as a bonus action. While transformed, spend a spell slot as a bonus action to regain 1d8 HP per slot level." },
                    circle_forms:{ level:2, name:"Circle Forms", description:"Wild Shape into beasts up to CR 1 (increases to floor(druid level / 3) at 6th)." },
                    elemental_wild_shape:{ level:10, name:"Elemental Wild Shape", description:"Expend two Wild Shape uses to transform into an air, earth, fire, or water elemental." },
                },
            },
        },
        feats:{
            druidic:{ level:1, name:"Druidic", description:"Know Druidic, the secret language of druids." },
            wild_shape:{ level:2, name:"Wild Shape", description:"Transform into a beast (CR 1/4 at 2nd, 1/2 at 4th, 1 at 8th). Twice per short rest." },
            timeless_body:{ level:18, name:"Timeless Body", description:"You age 10x slower and cannot be magically aged." },
            ability_score_improvement:{ level:4, name:"Ability Score Improvement", description:"Increase one ability score by 2, or two scores by 1." },
        },
    },

    sorcerer: {
        name:"Sorcerer", hitDie:6,
        primaryStats:["cha"], savingThrows:["con","cha"],
        armorProfs:[], weaponProfs:["Daggers","Darts","Slings","Quarterstaffs","Light Crossbows"],
        extraLanguages:0, spellcasting:"cha",
        statBonus:{ cha:2 },
        fixedSkills:[],
        skillChoices:{ count:2, pool:["acrobatics", "animal_handling", "arcana", "athletics", "deception", "history", "insight", "intimidation", "investigation", "medicine", "nature", "perception", "performance", "persuasion", "religion", "sleight_of_hand", "stealth", "survival"] },
        subclasses:{
            draconic:{ name:"Draconic Bloodline",
                description:"Power surges from a dragon ancestor, granting resilience and elemental affinity.",
                statBonus:{ cha:1, con:1 },
                feats:{
                    draconic_resilience:{ level:1, name:"Draconic Resilience", description:"HP max increases by sorcerer level. When unarmored, AC = 13 + DEX modifier." },
                    elemental_affinity:{ level:6, name:"Elemental Affinity", description:"Add CHA modifier to one damage roll of dragon-type spells. Spend 1 sorcery point for resistance to that type for 1 hour." },
                    dragon_wings:{ level:14, name:"Dragon Wings", description:"Sprout draconic wings as a bonus action, gaining a flying speed equal to your walking speed." },
                },
            },
            wild_magic:{ name:"Wild Magic",
                description:"Magical power surges unpredictably, fuelling wild surges.",
                statBonus:{ cha:1 },
                feats:{
                    wild_magic_surge:{ level:1, name:"Wild Magic Surge", description:"When you cast a 1st+ level spell, the DM may have you roll d20; on a 1, roll on the Wild Magic Surge table." },
                    tides_of_chaos:{ level:1, name:"Tides of Chaos", description:"Gain advantage on one attack, ability check, or saving throw. Recharges after a Wild Magic Surge." },
                    bend_luck:{ level:6, name:"Bend Luck", description:"Spend 2 sorcery points to add or subtract 1d4 from another creature's attack, ability check, or save." },
                },
            },
        },
        feats:{
            sorcerous_origin:{ level:1, name:"Sorcerous Origin", description:"Your innate magic comes from a chosen source that grants additional powers." },
            font_of_magic:{ level:2, name:"Font of Magic", description:"Gain sorcery points = sorcerer level. Convert between points and spell slots to fuel Metamagic." },
            metamagic:{ level:3, name:"Metamagic", description:"Choose two options: Careful, Distant, Empowered, Extended, Heightened, Quickened, Subtle, or Twinned." },
            ability_score_improvement:{ level:4, name:"Ability Score Improvement", description:"Increase one ability score by 2, or two scores by 1." },
        },
    },

    warlock: {
        name:"Warlock", hitDie:8,
        primaryStats:["cha"], savingThrows:["wis","cha"],
        armorProfs:["Light"], weaponProfs:["Simple"],
        extraLanguages:1, spellcasting:"cha",
        statBonus:{ cha:2 },
        fixedSkills:[],
        skillChoices:{ count:2, pool:["acrobatics", "animal_handling", "arcana", "athletics", "deception", "history", "insight", "intimidation", "investigation", "medicine", "nature", "perception", "performance", "persuasion", "religion", "sleight_of_hand", "stealth", "survival"] },
        subclasses:{
            fiend:{ name:"The Fiend",
                description:"Pact forged with a powerful devil or demon, granting dark powers.",
                statBonus:{ cha:1 },
                feats:{
                    dark_ones_blessing:{ level:1, name:"Dark One's Blessing", description:"When you reduce a hostile to 0 HP, gain temporary HP = CHA modifier + warlock level." },
                    dark_ones_own_luck:{ level:6, name:"Dark One's Own Luck", description:"Add 1d10 to an ability check or save. Once per short rest." },
                    fiendish_resilience:{ level:10, name:"Fiendish Resilience", description:"Choose a damage type after each short/long rest. Gain resistance to that type until you choose again." },
                },
            },
            archfey:{ name:"The Archfey",
                description:"Patron is a lord of the fey, granting enchanting and terrifying abilities.",
                statBonus:{ cha:1 }, spellSchools:["Enchantment","Illusion"],
                feats:{
                    fey_presence:{ level:1, name:"Fey Presence", description:"Use an action to charm or frighten creatures in a 10 ft cube until end of your next turn. Once per short rest." },
                    misty_escape:{ level:6, name:"Misty Escape", description:"When you take damage, use a reaction to teleport 60 ft and become invisible until your next turn. Once per short rest." },
                    beguiling_defenses:{ level:10, name:"Beguiling Defenses", description:"Immunity to charm. Turn a charm attempt back on its caster for 1 minute." },
                },
            },
            great_old_one:{ name:"The Great Old One",
                description:"Pact with an unknowable entity beyond the stars.",
                statBonus:{ int:1 },
                feats:{
                    awakened_mind:{ level:1, name:"Awakened Mind", description:"Communicate telepathically with any creature within 30 ft that speaks a language." },
                    entropic_ward:{ level:6, name:"Entropic Ward", description:"Impose disadvantage on one attack against you. If it misses, gain advantage on your next attack. Once per short rest." },
                    thought_shield:{ level:10, name:"Thought Shield", description:"Your thoughts can't be read. Resistance to psychic damage. Psychic damage dealt to you also damages the attacker." },
                },
            },
        },
        feats:{
            otherworldly_patron:{ level:1, name:"Otherworldly Patron", description:"You have struck a pact with an otherworldly being that grants you power." },
            pact_magic:{ level:1, name:"Pact Magic", description:"Regain all spell slots after a short or long rest. Slots are always cast at your highest level." },
            eldritch_invocations:{ level:2, name:"Eldritch Invocations", description:"Learn two invocations — magical enhancements from your patron. More at higher levels." },
            pact_boon:{ level:3, name:"Pact Boon", description:"Chain (familiar), Blade (magic weapon), or Tome (grimoire with three cantrips)." },
            ability_score_improvement:{ level:4, name:"Ability Score Improvement", description:"Increase one ability score by 2, or two scores by 1." },
        },
    },

    monk: {
        name:"Monk", hitDie:8,
        primaryStats:["dex","wis"], savingThrows:["str","dex"],
        armorProfs:[], weaponProfs:["Simple","Shortswords"],
        extraLanguages:0, spellcasting:null,
        statBonus:{ dex:1, wis:1 },
        fixedSkills:[],
        skillChoices:{ count:2, pool:["acrobatics", "animal_handling", "arcana", "athletics", "deception", "history", "insight", "intimidation", "investigation", "medicine", "nature", "perception", "performance", "persuasion", "religion", "sleight_of_hand", "stealth", "survival"] },
        subclasses:{
            open_hand:{ name:"Way of the Open Hand",
                description:"Masters the art of unarmed combat with stunning technique.",
                statBonus:{ dex:1 },
                feats:{
                    open_hand_technique:{ level:3, name:"Open Hand Technique", description:"Flurry of Blows can knock prone (DEX save), push 15 ft (STR save), or prevent reactions." },
                    wholeness_of_body:{ level:6, name:"Wholeness of Body", description:"Regain HP equal to three times your monk level as an action. Once per long rest." },
                    quivering_palm:{ level:17, name:"Quivering Palm", description:"Spend 3 ki: set lethal vibrations in a struck creature. Use an action later to deal 10d10 necrotic (CON save for half)." },
                },
            },
            shadow:{ name:"Way of Shadow",
                description:"Weaves stealth and darkness into combat.",
                statBonus:{ dex:1 }, spellcasting:"wis", spellSchools:["Illusion"],
                feats:{
                    shadow_arts:{ level:3, name:"Shadow Arts", description:"Spend 2 ki to cast Darkness, Darkvision, Pass Without Trace, or Silence." },
                    shadow_step:{ level:6, name:"Shadow Step", description:"Teleport between dim light or darkness within 60 ft as a bonus action, then gain advantage on your next melee attack." },
                    cloak_of_shadows:{ level:11, name:"Cloak of Shadows", description:"While in dim light or darkness, become invisible as an action until you attack, cast a spell, or enter bright light." },
                },
            },
            four_elements:{ name:"Way of the Four Elements",
                description:"Harnesses elemental energy through ki.",
                statBonus:{ wis:1 },
                feats:{
                    disciple_of_elements:{ level:3, name:"Disciple of Elements", description:"Learn two elemental disciplines. More at higher levels." },
                    elemental_attunement:{ level:3, name:"Elemental Attunement", description:"Spend 1 ki to create minor elemental effects." },
                },
            },
        },
        feats:{
            unarmored_defense:{ level:1, name:"Unarmored Defense", description:"When unarmored, AC = 10 + DEX modifier + WIS modifier." },
            martial_arts:{ level:1, name:"Martial Arts", description:"Use DEX for unarmed/monk weapon attacks. Unarmed strike uses monk die (d4 to d10 by level)." },
            ki:{ level:2, name:"Ki", description:"Ki points = monk level. Spend on Flurry of Blows (2), Patient Defense (1), or Step of the Wind (1)." },
            slow_fall:{ level:4, name:"Slow Fall", description:"Reduce fall damage by 5x monk level as a reaction." },
            extra_attack:{ level:5, name:"Extra Attack", description:"Attack twice instead of once when you take the Attack action." },
            ability_score_improvement:{ level:4, name:"Ability Score Improvement", description:"Increase one ability score by 2, or two scores by 1." },
        },
    },

    barbarian: {
        name:"Barbarian", hitDie:12,
        primaryStats:["str","con"], savingThrows:["str","con"],
        armorProfs:["Light","Medium","Shields"], weaponProfs:["Simple","Martial"],
        extraLanguages:0, spellcasting:null,
        statBonus:{ str:2 },
        fixedSkills:[],
        skillChoices:{ count:2, pool:["acrobatics", "animal_handling", "arcana", "athletics", "deception", "history", "insight", "intimidation", "investigation", "medicine", "nature", "perception", "performance", "persuasion", "religion", "sleight_of_hand", "stealth", "survival"] },
        subclasses:{
            berserker:{ name:"Path of the Berserker",
                description:"Channels rage into a murderous frenzy.",
                statBonus:{ str:1 },
                feats:{
                    frenzy:{ level:3, name:"Frenzy", description:"While raging, make a single melee weapon attack as a bonus action each turn. Suffer one exhaustion after rage ends." },
                    mindless_rage:{ level:6, name:"Mindless Rage", description:"Can't be charmed or frightened while raging." },
                    intimidating_presence:{ level:10, name:"Intimidating Presence", description:"Use an action to frighten one creature within 30 ft (WIS save)." },
                },
            },
            totem_warrior:{ name:"Path of the Totem Warrior",
                description:"Draws on a spirit animal for primal power.",
                statBonus:{ wis:1 },
                feats:{
                    spirit_seeker:{ level:3, name:"Spirit Seeker", description:"Cast Beast Sense and Speak with Animals as rituals." },
                    totem_spirit:{ level:3, name:"Totem Spirit", description:"Bear (resistance while raging), Eagle (Dash bonus action), or Wolf (allies have advantage on melee vs your targets)." },
                    aspect_of_the_beast:{ level:6, name:"Aspect of the Beast", description:"Bear (doubled carry), Eagle (1-mile dim vision), or Wolf (track at fast pace without penalty)." },
                },
            },
        },
        feats:{
            rage:{ level:1, name:"Rage", description:"Bonus action: enter rage. Advantage on STR checks/saves, bonus damage, resistance to B/P/S. Scales with level." },
            unarmored_defense:{ level:1, name:"Unarmored Defense", description:"When unarmored (no shield), AC = 10 + DEX modifier + CON modifier." },
            reckless_attack:{ level:2, name:"Reckless Attack", description:"Gain advantage on attack rolls this turn; attacks against you have advantage until your next turn." },
            danger_sense:{ level:2, name:"Danger Sense", description:"Advantage on DEX saves vs effects you can see, while not blinded/deafened/incapacitated." },
            extra_attack:{ level:5, name:"Extra Attack", description:"Attack twice instead of once when you take the Attack action." },
            ability_score_improvement:{ level:4, name:"Ability Score Improvement", description:"Increase one ability score by 2, or two scores by 1." },
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
    return {
        classId:        null,
        subclassId:     null,
        languages:      ["Common"],
        chosenSkills:   [],
        appliedStatKey: null,
        // baseStats captures the raw field values at the moment a class is first
        // applied, so we can restore them exactly when the class is removed or
        // changed — no drift from manual edits made after class selection.
        baseStats:      {},
    };
}

export function getClassData() {
    if (!state.classData) state.classData = defaultClassData();
    return state.classData;
}

// ============================================================
// STAT APPLICATION
// ============================================================
const STAT_TO_FIELD = {
    str:"f_str", dex:"f_dex", con:"f_con",
    int:"f_int", wis:"f_wis", cha:"f_cha",
};

// Collect all stats that will be modified by a class+subclass combo
function _affectedStats(classId, subclassId) {
    const cls = CLASSES[classId];
    if (!cls) return {};
    const combined = { ...cls.statBonus };
    if (subclassId) {
        Object.entries(cls.subclasses[subclassId]?.statBonus ?? {}).forEach(([k,v]) => {
            combined[k] = (combined[k] ?? 0) + v;
        });
    }
    return combined;
}

export function applyStatBonuses(cd, oldCd) {
    // ── Step 1: Restore base stats from the OLD class ──────
    // We stored the exact pre-bonus values in oldCd.baseStats, so we
    // restore them directly — no arithmetic drift from manual edits.
    if (oldCd?.appliedStatKey && oldCd.baseStats) {
        Object.entries(oldCd.baseStats).forEach(([stat, baseVal]) => {
            const field = getFieldById(STAT_TO_FIELD[stat]);
            if (field) field.value = baseVal;
        });
    }

    // ── Step 2: Snapshot current values as the new base ────
    // Do this AFTER restoring the old base, so the snapshot reflects the
    // player's manually-chosen stats, not any leftover bonus values.
    const cls = cd.classId ? CLASSES[cd.classId] : null;
    if (!cls) {
        cd.appliedStatKey = null;
        cd.baseStats      = {};
        return;
    }

    const affected = _affectedStats(cd.classId, cd.subclassId);
    cd.baseStats = {};
    Object.keys(affected).forEach(stat => {
        const field = getFieldById(STAT_TO_FIELD[stat]);
        if (field) cd.baseStats[stat] = field.value ?? 10;
    });

    // ── Step 3: Apply the new bonuses on top of the snapshot ─
    Object.entries(affected).forEach(([stat, bonus]) => {
        const field = getFieldById(STAT_TO_FIELD[stat]);
        if (field) field.value = Math.max(1, (cd.baseStats[stat] ?? 10) + bonus);
    });

    cd.appliedStatKey = `${cd.classId}||${cd.subclassId}`;
}

// ============================================================
// SAVING THROW + SKILL APPLICATION
// ============================================================
const SAVE_FIELD = {
    str:"f_save_str", dex:"f_save_dex", con:"f_save_con",
    int:"f_save_int", wis:"f_save_wis", cha:"f_save_cha",
};

// Apply (or remove) saving throw proficiencies from class definition
function _applySavingThrows(classId, profValue) {
    const cls = CLASSES[classId];
    if (!cls) return;
    (cls.savingThrows ?? []).forEach(save => {
        const f = getFieldById(SAVE_FIELD[save]);
        if (f) f.proficient = profValue;
    });
}

export function applySkillProficiencies(cd, oldCd) {
    // ── Clear old class skills + saving throws ──────────────
    if (oldCd?.classId) {
        const oldCls = CLASSES[oldCd.classId];
        if (oldCls) {
            // Skills
            const oldFixed  = oldCls.fixedSkills ?? [];
            const oldChosen = oldCd.chosenSkills ?? [];
            [...oldFixed, ...oldChosen].forEach(sk => {
                const f = getFieldById(SKILL_FIELD[sk]);
                if (f && f.proficient === 1) f.proficient = 0;
            });
            // Saving throws
            _applySavingThrows(oldCd.classId, 0);
        }
    }
    // ── Apply new class skills + saving throws ──────────────
    const cls = cd.classId ? CLASSES[cd.classId] : null;
    if (!cls) return;
    [...new Set([...(cls.fixedSkills ?? []), ...(cd.chosenSkills ?? [])])].forEach(sk => {
        const f = getFieldById(SKILL_FIELD[sk]);
        if (f) f.proficient = 1;
    });
    _applySavingThrows(cd.classId, 1);
}

// ============================================================
// SPELL FILTERING
// ============================================================
export function isSpellAllowedForClass(spell, classId, subclassId) {
    const cls = CLASSES[classId];
    if (!cls) return false;
    const hasCasting = cls.spellcasting || cls.subclasses?.[subclassId]?.spellcasting;
    if (!hasCasting) return false;
    if (subclassId) {
        const schools = cls.subclasses[subclassId]?.spellSchools;
        if (schools !== undefined && schools !== null) return schools.includes(spell.school);
    }
    return true;
}

// ============================================================
// RENDER — Class tab panel
// ============================================================
export function renderClassPanel() {
    const container = document.getElementById("classPanelContent");
    if (!container) return;
    container.innerHTML = "";

    const cd  = getClassData();
    const cls = cd.classId ? CLASSES[cd.classId] : null;

    _appendRow(container, "Class", _classSelect(cd));
    if (!cls) return;

    container.appendChild(_classSummary(cls, cd));
    _appendRow(container, "Subclass", _subclassSelect(cd, cls));

    if (cd.subclassId) {
        const sub = cls.subclasses[cd.subclassId];
        const desc = document.createElement("p");
        desc.className   = "class-subclass-desc";
        desc.textContent = sub.description;
        container.appendChild(desc);

        const bonusEntries = Object.entries(sub.statBonus ?? {}).filter(([,v]) => v);
        if (bonusEntries.length) {
            const bonusDiv = document.createElement("div");
            bonusDiv.className = "class-bonus-stats";
            bonusDiv.innerHTML = `<span class="class-field-label">Subclass Stat Bonuses:</span> ` +
                bonusEntries.map(([s,v]) => `<span class="class-bonus-pill">+${v} ${s.toUpperCase()}</span>`).join(" ");
            container.appendChild(bonusDiv);
        }
    }

    _renderLanguageSection(container, cd, cls);
    _renderSkillSection(container, cd, cls);
}

function _appendRow(container, labelText, control) {
    const row = document.createElement("div");
    row.className = "class-row";
    const lbl = document.createElement("label");
    lbl.className   = "class-field-label";
    lbl.textContent = labelText;
    row.append(lbl, control);
    container.appendChild(row);
}

function _classSelect(cd) {
    const sel = document.createElement("select");
    sel.className = "class-select";
    const blank = document.createElement("option");
    blank.value = ""; blank.textContent = "— Choose a class —";
    sel.appendChild(blank);
    Object.entries(CLASSES).forEach(([id, c]) => {
        const opt = document.createElement("option");
        opt.value = id; opt.textContent = c.name;
        if (id === cd.classId) opt.selected = true;
        sel.appendChild(opt);
    });
    sel.onchange = () => {
        const oldCd     = JSON.parse(JSON.stringify(cd));
        cd.classId      = sel.value || null;
        cd.subclassId   = null;
        cd.chosenSkills = [];
        const newCls    = cd.classId ? CLASSES[cd.classId] : null;
        cd.languages    = cd.languages.slice(0, 1 + (newCls?.extraLanguages ?? 0));
        if (!cd.languages.includes("Common")) cd.languages.unshift("Common");
        applyStatBonuses(cd, oldCd);
        applySkillProficiencies(cd, oldCd);
        refreshComputedDisplays();
        renderSheet();
        renderClassPanel();
        renderFeatsOnSheet();
        debouncedSave();
    };
    return sel;
}

function _subclassSelect(cd, cls) {
    const sel = document.createElement("select");
    sel.className = "class-select";
    const blank = document.createElement("option");
    blank.value = ""; blank.textContent = "— Choose a subclass —";
    sel.appendChild(blank);
    Object.entries(cls.subclasses).forEach(([id, s]) => {
        const opt = document.createElement("option");
        opt.value = id; opt.textContent = s.name;
        if (id === cd.subclassId) opt.selected = true;
        sel.appendChild(opt);
    });
    sel.onchange = () => {
        const oldCd   = JSON.parse(JSON.stringify(cd));
        cd.subclassId = sel.value || null;
        applyStatBonuses(cd, oldCd);
        refreshComputedDisplays();
        renderSheet();
        renderClassPanel();
        renderFeatsOnSheet();
        debouncedSave();
    };
    return sel;
}

function _classSummary(cls, cd) {
    const el  = document.createElement("div");
    el.className = "class-summary";
    const sub = cd.subclassId ? cls.subclasses[cd.subclassId] : null;
    const armor   = [...(cls.armorProfs ?? []), ...(sub?.armorProfs ?? [])];
    const weapons = [...(cls.weaponProfs ?? []), ...(sub?.weaponProfs ?? [])];
    const allBonus = { ...cls.statBonus };
    if (sub?.statBonus) Object.entries(sub.statBonus).forEach(([k,v]) => {
        allBonus[k] = (allBonus[k] ?? 0) + v;
    });
    const pills = Object.entries(allBonus).filter(([,v])=>v)
        .map(([s,v]) => `<span class="class-bonus-pill">+${v} ${s.toUpperCase()}</span>`).join(" ");
    el.innerHTML = `
        <div class="class-summary-grid">
            <span class="cs-label">Hit Die</span>       <span class="cs-val">d${cls.hitDie}</span>
            <span class="cs-label">Primary</span>       <span class="cs-val">${cls.primaryStats.map(s=>s.toUpperCase()).join(", ")}</span>
            <span class="cs-label">Saves</span>         <span class="cs-val">${cls.savingThrows.map(s=>s.toUpperCase()).join(", ")}</span>
            <span class="cs-label">Armor</span>         <span class="cs-val">${armor.join(", ") || "None"}</span>
            <span class="cs-label">Weapons</span>       <span class="cs-val">${weapons.join(", ")}</span>
            <span class="cs-label">Spellcasting</span>  <span class="cs-val">${cls.spellcasting ? cls.spellcasting.toUpperCase() : "None"}</span>
            ${pills ? `<span class="cs-label">Stat Bonuses</span><span class="cs-val">${pills}</span>` : ""}
        </div>
    `;
    return el;
}

function _renderLanguageSection(container, cd, cls) {
    const total = 1 + (cls.extraLanguages ?? 0);
    const sec = document.createElement("div");
    sec.className = "class-section";
    const hdg = document.createElement("div");
    hdg.className = "class-section-heading";
    hdg.innerHTML = `Languages <span class="class-section-count">${cd.languages.length} / ${total}</span>`;
    sec.appendChild(hdg);
    const list = document.createElement("div");
    list.className = "class-lang-list";
    const common = document.createElement("span");
    common.className   = "class-lang-badge class-lang-badge--fixed";
    common.textContent = "Common";
    list.appendChild(common);
    for (let i = 0; i < cls.extraLanguages; i++) {
        const existing = cd.languages[i + 1] ?? "";
        const sel = document.createElement("select");
        sel.className = "class-lang-select";
        const empty = document.createElement("option");
        empty.value = ""; empty.textContent = "— choose —";
        sel.appendChild(empty);
        ALL_LANGUAGES.filter(l => l !== "Common").forEach(l => {
            const taken = cd.languages.includes(l) && cd.languages[i + 1] !== l;
            const opt = document.createElement("option");
            opt.value = l; opt.textContent = l;
            opt.selected = existing === l;
            opt.disabled = taken;
            sel.appendChild(opt);
        });
        sel.onchange = () => {
            const newLangs = ["Common"];
            sec.querySelectorAll(".class-lang-select").forEach(s => { if (s.value) newLangs.push(s.value); });
            cd.languages = newLangs;
            debouncedSave();
            renderClassPanel();
        };
        list.appendChild(sel);
    }
    sec.appendChild(list);
    container.appendChild(sec);
}

function _renderSkillSection(container, cd, cls) {
    const fixed   = cls.fixedSkills ?? [];
    const choices = cls.skillChoices;
    const total   = fixed.length + (choices?.count ?? 0);
    const sec = document.createElement("div");
    sec.className = "class-section";
    const hdg = document.createElement("div");
    hdg.className = "class-section-heading";
    hdg.innerHTML = `Skill Proficiencies <span class="class-section-count">${fixed.length} fixed + ${choices?.count ?? 0} choice</span>`;
    sec.appendChild(hdg);
    const grid = document.createElement("div");
    grid.className = "class-skill-grid";

    // Fixed skills — always on
    fixed.forEach(sk => {
        const badge = document.createElement("div");
        badge.className   = "class-skill-badge class-skill-badge--fixed";
        badge.textContent = SKILL_LABELS[sk] ?? sk;
        badge.title       = "Always proficient";
        grid.appendChild(badge);
    });

    // Choosable skills
    if (choices) {
        const pool = choices.pool.filter(sk => !fixed.includes(sk));
        pool.forEach(sk => {
            const chosen  = cd.chosenSkills.includes(sk);
            const atLimit = cd.chosenSkills.length >= choices.count && !chosen;
            const badge = document.createElement("div");
            badge.className = `class-skill-badge class-skill-badge--choice${chosen ? " class-skill-badge--chosen" : ""}${atLimit ? " class-skill-badge--disabled" : ""}`;
            badge.textContent = SKILL_LABELS[sk] ?? sk;
            badge.title = chosen ? "Click to remove" : atLimit ? `Limit reached (${choices.count})` : "Click to choose";
            if (!atLimit || chosen) {
                badge.onclick = () => {
                    const oldCd = JSON.parse(JSON.stringify(cd));
                    cd.chosenSkills = chosen
                        ? cd.chosenSkills.filter(s => s !== sk)
                        : [...cd.chosenSkills, sk];
                    applySkillProficiencies(cd, oldCd);
                    refreshComputedDisplays();
                    renderClassPanel();
                    debouncedSave();
                };
            }
            grid.appendChild(badge);
        });
    }
    sec.appendChild(grid);
    container.appendChild(sec);
}

// ============================================================
// RENDER — Feats on the character sheet (separate from class tab)
// ============================================================
export function renderFeatsOnSheet() {
    const container = document.getElementById("classFeatsList");
    if (!container) return;
    container.innerHTML = "";

    const cd  = getClassData();
    const cls = cd.classId ? CLASSES[cd.classId] : null;
    if (!cls) {
        const msg = document.createElement("p");
        msg.className   = "class-no-class-msg";
        msg.textContent = "Select a class in the Class & Features tab to see your feats here.";
        container.appendChild(msg);
        return;
    }

    const level = parseInt(getFieldById("f_level")?.value) || 1;

    // Merge class feats + subclass feats
    const allFeats = { ...cls.feats };
    if (cd.subclassId) {
        Object.entries(cls.subclasses[cd.subclassId]?.feats ?? {})
            .forEach(([id, f]) => { allFeats[id] = f; });
    }

    const sorted   = Object.entries(allFeats).sort((a,b) => (a[1].level??1)-(b[1].level??1) || a[1].name.localeCompare(b[1].name));
    const unlocked = sorted.filter(([,f]) => level >= (f.level ?? 1));
    const locked   = sorted.filter(([,f]) => level <  (f.level ?? 1));

    if (unlocked.length) {
        const hdg = document.createElement("div");
        hdg.className   = "class-section-heading";
        hdg.textContent = `Unlocked (${unlocked.length})`;
        container.appendChild(hdg);
        unlocked.forEach(([,f]) => container.appendChild(_featRow(f, true)));
    }
    if (locked.length) {
        const hdg = document.createElement("div");
        hdg.className   = "class-section-heading";
        hdg.style.marginTop = "10px";
        hdg.textContent = `Upcoming (${locked.length})`;
        container.appendChild(hdg);
        locked.forEach(([,f]) => container.appendChild(_featRow(f, false)));
    }
}

function _featRow(feat, unlocked) {
    const row = document.createElement("div");
    row.className = `class-feat-row${unlocked ? "" : " class-feat-row--locked"}`;
    const lock = document.createElement("span");
    lock.className   = "class-feat-lock";
    lock.textContent = unlocked ? "✓" : "🔒";
    lock.title       = unlocked ? "Unlocked" : `Unlocks at level ${feat.level}`;
    const name = document.createElement("span");
    name.className   = "class-feat-name";
    name.textContent = feat.name;
    const lvl = document.createElement("span");
    lvl.className   = "class-feat-level";
    lvl.textContent = `Lv ${feat.level ?? 1}`;
    const desc = document.createElement("p");
    desc.className   = "class-feat-desc";
    desc.textContent = feat.description;
    row.append(lock, name, lvl);
    row.appendChild(desc);
    return row;
}
