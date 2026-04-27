// ============================================================
// RACES.JS — Core D&D 5e race system
// Mirrors the class system pattern: stat bonuses stored in
// raceData.baseStats so manual edits never drift.
// ============================================================

import { state, getFieldById } from "./state.js";
import { refreshComputedDisplays } from "./fields.js";
import { renderSheet } from "./sheet.js";
import { ALL_LANGUAGES } from "./classes.js";

let debouncedSave = () => {};
export function setDebouncedSave(fn) { debouncedSave = fn; }

// ============================================================
// RACE DEFINITIONS
// ============================================================
export const RACES = {
    human: {
        name: "Human",
        speed: 30,
        size: "Medium",
        statBonus: { str:1, dex:1, con:1, int:1, wis:1, cha:1 },
        extraLanguages: 1,
        traits: [
            { name: "Extra Language",       description: "You can speak, read, and write one extra language of your choice." },
            { name: "Extra Feat (Variant)",  description: "Variant: Instead of the across-the-board +1s, gain +1 to two ability scores, one skill proficiency, and one feat (DM's discretion)." },
        ],
        subraces: {},
    },

    elf: {
        name: "Elf",
        speed: 30,
        size: "Medium",
        statBonus: { dex: 2 },
        extraLanguages: 0,
        traits: [
            { name: "Darkvision",       description: "See in dim light within 60 ft as bright light, darkness as dim light. Can't discern colour in darkness." },
            { name: "Keen Senses",      description: "Proficiency in the Perception skill." },
            { name: "Fey Ancestry",     description: "Advantage on saving throws against being charmed. Magic can't put you to sleep." },
            { name: "Trance",           description: "Elves don't need to sleep. Instead they meditate deeply for 4 hours a day." },
        ],
        fixedSkills: ["perception"],
        subraces: {
            high_elf: {
                name: "High Elf",
                statBonus: { int: 1 },
                extraLanguages: 1,
                traits: [
                    { name: "Elf Weapon Training", description: "Proficiency with longsword, shortsword, shortbow, and longbow." },
                    { name: "Cantrip",             description: "Know one wizard cantrip of your choice. INT is your spellcasting ability." },
                    { name: "Extra Language",      description: "You can speak, read, and write one extra language." },
                ],
            },
            wood_elf: {
                name: "Wood Elf",
                statBonus: { wis: 1 },
                speed: 35,
                traits: [
                    { name: "Elf Weapon Training", description: "Proficiency with longsword, shortsword, shortbow, and longbow." },
                    { name: "Fleet of Foot",       description: "Your base walking speed is 35 ft." },
                    { name: "Mask of the Wild",    description: "You can attempt to hide when only lightly obscured by foliage, rain, snow, mist, or natural phenomena." },
                ],
            },
            drow: {
                name: "Drow (Dark Elf)",
                statBonus: { cha: 1 },
                traits: [
                    { name: "Superior Darkvision", description: "Your darkvision has a range of 120 ft." },
                    { name: "Sunlight Sensitivity", description: "Disadvantage on attack rolls and Perception checks relying on sight when you or your target is in sunlight." },
                    { name: "Drow Magic",           description: "Know Dancing Lights cantrip. At 3rd level: Faerie Fire once per long rest. At 5th level: Darkness once per long rest. CHA is your spellcasting ability." },
                    { name: "Drow Weapon Training", description: "Proficiency with rapiers, shortswords, and hand crossbows." },
                ],
            },
        },
    },

    dwarf: {
        name: "Dwarf",
        speed: 25,
        size: "Medium",
        statBonus: { con: 2 },
        extraLanguages: 0,
        traits: [
            { name: "Darkvision",        description: "See in dim light within 60 ft as bright, darkness as dim. Can't discern colour in darkness." },
            { name: "Dwarven Resilience", description: "Advantage on saving throws against poison. Resistance to poison damage." },
            { name: "Dwarven Combat Training", description: "Proficiency with battleaxe, handaxe, light hammer, and warhammer." },
            { name: "Tool Proficiency",  description: "Proficiency with smith's tools, brewer's supplies, or mason's tools (your choice)." },
            { name: "Stonecunning",      description: "Double proficiency bonus on Intelligence (History) checks related to stonework." },
        ],
        subraces: {
            hill_dwarf: {
                name: "Hill Dwarf",
                statBonus: { wis: 1 },
                traits: [
                    { name: "Dwarven Toughness", description: "HP maximum increases by 1, and increases by 1 again every time you gain a level." },
                ],
            },
            mountain_dwarf: {
                name: "Mountain Dwarf",
                statBonus: { str: 2 },
                traits: [
                    { name: "Dwarven Armor Training", description: "Proficiency with light and medium armor." },
                ],
            },
        },
    },

    halfling: {
        name: "Halfling",
        speed: 25,
        size: "Small",
        statBonus: { dex: 2 },
        extraLanguages: 0,
        traits: [
            { name: "Lucky",           description: "When you roll a 1 on a d20 for an attack, ability check, or saving throw, reroll and use the new roll." },
            { name: "Brave",           description: "Advantage on saving throws against being frightened." },
            { name: "Halfling Nimbleness", description: "You can move through the space of any creature that is at least one size larger than you." },
        ],
        subraces: {
            lightfoot: {
                name: "Lightfoot",
                statBonus: { cha: 1 },
                traits: [
                    { name: "Naturally Stealthy", description: "You can attempt to hide even when obscured only by a creature one size larger than you." },
                ],
            },
            stout: {
                name: "Stout",
                statBonus: { con: 1 },
                traits: [
                    { name: "Stout Resilience", description: "Advantage on saving throws against poison and resistance to poison damage." },
                ],
            },
        },
    },

    gnome: {
        name: "Gnome",
        speed: 25,
        size: "Small",
        statBonus: { int: 2 },
        extraLanguages: 0,
        traits: [
            { name: "Darkvision",       description: "See in dim light within 60 ft as bright, darkness as dim. Can't discern colour in darkness." },
            { name: "Gnome Cunning",    description: "Advantage on all INT, WIS, and CHA saving throws against magic." },
        ],
        subraces: {
            forest_gnome: {
                name: "Forest Gnome",
                statBonus: { dex: 1 },
                traits: [
                    { name: "Natural Illusionist", description: "Know the Minor Illusion cantrip. INT is your spellcasting ability." },
                    { name: "Speak with Small Beasts", description: "Communicate simple ideas with Small or smaller beasts." },
                ],
            },
            rock_gnome: {
                name: "Rock Gnome",
                statBonus: { con: 1 },
                traits: [
                    { name: "Artificer's Lore", description: "Double proficiency on INT (History) checks related to magic items, alchemical objects, or technological devices." },
                    { name: "Tinker",           description: "Proficiency with artisan's tools. Construct tiny clockwork devices." },
                ],
            },
        },
    },

    half_elf: {
        name: "Half-Elf",
        speed: 30,
        size: "Medium",
        statBonus: { cha: 2 },
        extraLanguages: 1,
        // Half-elves get +1 to two ability scores of their choice — handled as choosable bonuses
        choosableStatBonus: { count: 2, amount: 1, exclude: ["cha"] },
        traits: [
            { name: "Darkvision",    description: "See in dim light within 60 ft as bright, darkness as dim. Can't discern colour in darkness." },
            { name: "Fey Ancestry",  description: "Advantage on saving throws against being charmed. Magic can't put you to sleep." },
            { name: "Skill Versatility", description: "Gain proficiency in two skills of your choice." },
            { name: "Extra Language", description: "You can speak, read, and write one extra language of your choice." },
        ],
        skillChoices: { count: 2 },
        subraces: {},
    },

    half_orc: {
        name: "Half-Orc",
        speed: 30,
        size: "Medium",
        statBonus: { str: 2, con: 1 },
        extraLanguages: 0,
        traits: [
            { name: "Darkvision",       description: "See in dim light within 60 ft as bright, darkness as dim. Can't discern colour in darkness." },
            { name: "Menacing",         description: "Proficiency in the Intimidation skill." },
            { name: "Relentless Endurance", description: "When reduced to 0 HP but not killed outright, drop to 1 HP instead. Once per long rest." },
            { name: "Savage Attacks",   description: "When you score a critical hit with a melee weapon attack, roll one of the weapon's damage dice one additional time." },
        ],
        fixedSkills: ["intimidation"],
        subraces: {},
    },

    tiefling: {
        name: "Tiefling",
        speed: 30,
        size: "Medium",
        statBonus: { int: 1, cha: 2 },
        extraLanguages: 0,
        traits: [
            { name: "Darkvision",      description: "See in dim light within 60 ft as bright, darkness as dim. Can't discern colour in darkness." },
            { name: "Hellish Resistance", description: "Resistance to fire damage." },
            { name: "Infernal Legacy", description: "Know Thaumaturgy cantrip. At 3rd level: Hellish Rebuke once per long rest. At 5th level: Darkness once per long rest. CHA is your spellcasting ability." },
        ],
        subraces: {},
    },

    dragonborn: {
        name: "Dragonborn",
        speed: 30,
        size: "Medium",
        statBonus: { str: 2, cha: 1 },
        extraLanguages: 0,
        traits: [
            { name: "Draconic Ancestry", description: "Choose a dragon type: Black (acid), Blue (lightning), Brass (fire), Bronze (lightning), Copper (acid), Gold (fire), Green (poison), Red (fire), Silver (cold), White (cold)." },
            { name: "Breath Weapon",     description: "Use your action to exhale destructive energy (determined by draconic ancestry). Each creature in the area must make a saving throw. Usable once per short or long rest." },
            { name: "Damage Resistance", description: "Resistance to the damage type associated with your draconic ancestry." },
        ],
        subraces: {},
    },
};

// ============================================================
// STATE HELPERS
// ============================================================
export function defaultRaceData() {
    return {
        raceId:        null,
        subraceId:     null,
        appliedKey:    null,
        baseStats:     {},
        chosenSkills:  [],
        chosenStatBonuses: [],  // for half-elf style choosable bonuses
        languages:     [],      // extra languages chosen
    };
}

export function getRaceData() {
    if (!state.raceData) state.raceData = defaultRaceData();
    return state.raceData;
}

// ============================================================
// STAT APPLICATION
// ============================================================
const STAT_TO_FIELD = {
    str:"f_str", dex:"f_dex", con:"f_con",
    int:"f_int", wis:"f_wis", cha:"f_cha",
};

function _allRaceBonuses(rd) {
    const race    = rd.raceId ? RACES[rd.raceId] : null;
    if (!race) return {};
    const subrace = rd.subraceId ? race.subraces[rd.subraceId] : null;
    const combined = { ...race.statBonus };
    if (subrace?.statBonus) {
        Object.entries(subrace.statBonus).forEach(([k,v]) => {
            combined[k] = (combined[k] ?? 0) + v;
        });
    }
    // Choosable stat bonuses (e.g. half-elf +1 to two stats)
    (rd.chosenStatBonuses ?? []).forEach(stat => {
        combined[stat] = (combined[stat] ?? 0) + (race.choosableStatBonus?.amount ?? 1);
    });
    return combined;
}

export function applyRaceStatBonuses(rd, oldRd) {
    // 1. Restore from old base stats
    if (oldRd?.appliedKey && oldRd.baseStats) {
        Object.entries(oldRd.baseStats).forEach(([stat, val]) => {
            const f = getFieldById(STAT_TO_FIELD[stat]);
            if (f) f.value = val;
        });
    }

    const race = rd.raceId ? RACES[rd.raceId] : null;
    if (!race) { rd.appliedKey = null; rd.baseStats = {}; return; }

    // 2. Snapshot base values
    const bonuses = _allRaceBonuses(rd);
    rd.baseStats = {};
    Object.keys(bonuses).forEach(stat => {
        const f = getFieldById(STAT_TO_FIELD[stat]);
        if (f) rd.baseStats[stat] = f.value ?? 10;
    });

    // 3. Apply bonuses
    Object.entries(bonuses).forEach(([stat, bonus]) => {
        const f = getFieldById(STAT_TO_FIELD[stat]);
        if (f) f.value = Math.max(1, (rd.baseStats[stat] ?? 10) + bonus);
    });

    // 4. Apply speed from race/subrace
    const subrace = rd.subraceId ? race.subraces[rd.subraceId] : null;
    const speed = subrace?.speed ?? race.speed ?? 30;
    const speedField = getFieldById("f_speed");
    if (speedField) speedField.value = speed;

    rd.appliedKey = `${rd.raceId}||${rd.subraceId}`;
}

// ============================================================
// SKILL APPLICATION
// ============================================================
const SKILL_FIELD = {
    acrobatics:"f_sk_acrobatics", animal_handling:"f_sk_animal",
    arcana:"f_sk_arcana", athletics:"f_sk_athletics",
    deception:"f_sk_deception", history:"f_sk_history",
    insight:"f_sk_insight", intimidation:"f_sk_intimidation",
    investigation:"f_sk_investigation", medicine:"f_sk_medicine",
    nature:"f_sk_nature", perception:"f_sk_perception",
    performance:"f_sk_performance", persuasion:"f_sk_persuasion",
    religion:"f_sk_religion", sleight_of_hand:"f_sk_sleight",
    stealth:"f_sk_stealth", survival:"f_sk_survival",
};

const SKILL_LABELS = {
    acrobatics:"Acrobatics", animal_handling:"Animal Handling",
    arcana:"Arcana", athletics:"Athletics", deception:"Deception",
    history:"History", insight:"Insight", intimidation:"Intimidation",
    investigation:"Investigation", medicine:"Medicine", nature:"Nature",
    perception:"Perception", performance:"Performance", persuasion:"Persuasion",
    religion:"Religion", sleight_of_hand:"Sleight of Hand",
    stealth:"Stealth", survival:"Survival",
};

export function applyRaceSkillProficiencies(rd, oldRd) {
    // Clear old
    if (oldRd?.raceId) {
        const oldRace = RACES[oldRd.raceId];
        const oldFixed = oldRace?.fixedSkills ?? [];
        const oldChosen = oldRd.chosenSkills ?? [];
        [...oldFixed, ...oldChosen].forEach(sk => {
            const f = getFieldById(SKILL_FIELD[sk]);
            if (f && f.proficient === 1) f.proficient = 0;
        });
    }
    // Apply new
    const race = rd.raceId ? RACES[rd.raceId] : null;
    if (!race) return;
    [...new Set([...(race.fixedSkills ?? []), ...(rd.chosenSkills ?? [])])].forEach(sk => {
        const f = getFieldById(SKILL_FIELD[sk]);
        if (f) f.proficient = 1;
    });
}

// ============================================================
// RENDER — Race panel (within Class & Features tab)
// ============================================================
export function renderRacePanel() {
    const container = document.getElementById("racePanelContent");
    if (!container) return;
    container.innerHTML = "";

    const rd   = getRaceData();
    const race = rd.raceId ? RACES[rd.raceId] : null;

    // ---- Race selector ----
    const raceRow = document.createElement("div");
    raceRow.className = "class-row";
    const raceLabel = document.createElement("label");
    raceLabel.className   = "class-field-label";
    raceLabel.textContent = "Race";
    const raceSel = document.createElement("select");
    raceSel.className = "class-select";
    const blank = document.createElement("option");
    blank.value = ""; blank.textContent = "— Choose a race —";
    raceSel.appendChild(blank);
    Object.entries(RACES).forEach(([id, r]) => {
        const opt = document.createElement("option");
        opt.value = id; opt.textContent = r.name;
        if (id === rd.raceId) opt.selected = true;
        raceSel.appendChild(opt);
    });
    raceSel.onchange = () => {
        const oldRd      = JSON.parse(JSON.stringify(rd));
        rd.raceId        = raceSel.value || null;
        rd.subraceId     = null;
        rd.chosenSkills  = [];
        rd.chosenStatBonuses = [];
        rd.languages     = [];
        applyRaceStatBonuses(rd, oldRd);
        applyRaceSkillProficiencies(rd, oldRd);
        refreshComputedDisplays();
        renderSheet();
        renderRacePanel();
        debouncedSave();
    };
    raceRow.append(raceLabel, raceSel);
    container.appendChild(raceRow);

    if (!race) return;

    // ---- Race summary ----
    const summary = document.createElement("div");
    summary.className = "class-summary";
    const subrace = rd.subraceId ? race.subraces[rd.subraceId] : null;
    const allBonus = _allRaceBonuses(rd);
    const pills = Object.entries(allBonus).filter(([,v])=>v)
        .map(([s,v]) => `<span class="class-bonus-pill">+${v} ${s.toUpperCase()}</span>`).join(" ");
    summary.innerHTML = `
        <div class="class-summary-grid">
            <span class="cs-label">Size</span>   <span class="cs-val">${race.size}</span>
            <span class="cs-label">Speed</span>  <span class="cs-val">${subrace?.speed ?? race.speed} ft</span>
            ${pills ? `<span class="cs-label">Stat Bonuses</span><span class="cs-val">${pills}</span>` : ""}
        </div>
    `;
    container.appendChild(summary);

    // ---- Subrace selector (if any) ----
    if (Object.keys(race.subraces).length) {
        const subRow = document.createElement("div");
        subRow.className = "class-row";
        const subLabel = document.createElement("label");
        subLabel.className   = "class-field-label";
        subLabel.textContent = "Subrace";
        const subSel = document.createElement("select");
        subSel.className = "class-select";
        const subBlank = document.createElement("option");
        subBlank.value = ""; subBlank.textContent = "— Choose a subrace —";
        subSel.appendChild(subBlank);
        Object.entries(race.subraces).forEach(([id, s]) => {
            const opt = document.createElement("option");
            opt.value = id; opt.textContent = s.name;
            if (id === rd.subraceId) opt.selected = true;
            subSel.appendChild(opt);
        });
        subSel.onchange = () => {
            const oldRd  = JSON.parse(JSON.stringify(rd));
            rd.subraceId = subSel.value || null;
            rd.chosenStatBonuses = [];
            applyRaceStatBonuses(rd, oldRd);
            applyRaceSkillProficiencies(rd, oldRd);
            refreshComputedDisplays();
            renderSheet();
            renderRacePanel();
            debouncedSave();
        };
        subRow.append(subLabel, subSel);
        container.appendChild(subRow);
    }

    // ---- Choosable stat bonuses (e.g. Half-Elf) ----
    if (race.choosableStatBonus) {
        _renderChoosableStatBonuses(container, rd, race);
    }

    // ---- Racial traits ----
    _renderRaceTraits(container, race, subrace);

    // ---- Extra languages ----
    const totalExtras = (race.extraLanguages ?? 0) + (subrace?.extraLanguages ?? 0);
    if (totalExtras > 0) {
        _renderRaceLanguages(container, rd, totalExtras);
    }

    // ---- Skill choices (e.g. Half-Elf Skill Versatility) ----
    if (race.skillChoices) {
        _renderRaceSkillChoices(container, rd, race);
    }
}

function _renderChoosableStatBonuses(container, rd, race) {
    const cfg     = race.choosableStatBonus;
    const exclude = cfg.exclude ?? [];
    const allStats = ["str","dex","con","int","wis","cha"].filter(s => !exclude.includes(s));

    const sec = document.createElement("div");
    sec.className = "class-section";
    const hdg = document.createElement("div");
    hdg.className = "class-section-heading";
    hdg.innerHTML = `Bonus Stats <span class="class-section-count">${rd.chosenStatBonuses.length} / ${cfg.count} chosen (+${cfg.amount} each)</span>`;
    sec.appendChild(hdg);

    const grid = document.createElement("div");
    grid.className = "class-skill-grid";

    allStats.forEach(stat => {
        const chosen  = rd.chosenStatBonuses.includes(stat);
        const atLimit = rd.chosenStatBonuses.length >= cfg.count && !chosen;
        const badge   = document.createElement("div");
        badge.className = `class-skill-badge class-skill-badge--choice${chosen ? " class-skill-badge--chosen" : ""}${atLimit ? " class-skill-badge--disabled" : ""}`;
        badge.textContent = stat.toUpperCase();
        badge.title = chosen ? "Click to remove" : atLimit ? `Limit reached (${cfg.count})` : `Click to add +${cfg.amount}`;
        if (!atLimit || chosen) {
            badge.onclick = () => {
                const oldRd = JSON.parse(JSON.stringify(rd));
                rd.chosenStatBonuses = chosen
                    ? rd.chosenStatBonuses.filter(s => s !== stat)
                    : [...rd.chosenStatBonuses, stat];
                applyRaceStatBonuses(rd, oldRd);
                refreshComputedDisplays();
                renderSheet();
                renderRacePanel();
                debouncedSave();
            };
        }
        grid.appendChild(badge);
    });
    sec.appendChild(grid);
    container.appendChild(sec);
}

function _renderRaceTraits(container, race, subrace) {
    const allTraits = [...(race.traits ?? []), ...(subrace?.traits ?? [])];
    if (!allTraits.length) return;

    const sec = document.createElement("div");
    sec.className = "class-section";
    const hdg = document.createElement("div");
    hdg.className = "class-section-heading";
    hdg.textContent = "Racial Traits";
    sec.appendChild(hdg);

    allTraits.forEach(t => {
        const row = document.createElement("div");
        row.className = "class-feat-row class-feat-row--unlocked";
        const lock = document.createElement("span");
        lock.className = "class-feat-lock"; lock.textContent = "✦";
        const name = document.createElement("span");
        name.className = "class-feat-name"; name.textContent = t.name;
        const desc = document.createElement("p");
        desc.className = "class-feat-desc"; desc.textContent = t.description;
        row.append(lock, name);
        row.appendChild(desc);
        sec.appendChild(row);
    });
    container.appendChild(sec);
}

function _renderRaceLanguages(container, rd, count) {
    const sec = document.createElement("div");
    sec.className = "class-section";
    const hdg = document.createElement("div");
    hdg.className = "class-section-heading";
    hdg.innerHTML = `Extra Languages <span class="class-section-count">${rd.languages.length} / ${count}</span>`;
    sec.appendChild(hdg);

    const list = document.createElement("div");
    list.className = "class-lang-list";

    for (let i = 0; i < count; i++) {
        const existing = rd.languages[i] ?? "";
        const sel = document.createElement("select");
        sel.className = "class-lang-select";
        const empty = document.createElement("option");
        empty.value = ""; empty.textContent = "— choose —";
        sel.appendChild(empty);
        ALL_LANGUAGES.filter(l => l !== "Common").forEach(l => {
            const taken = rd.languages.includes(l) && rd.languages[i] !== l;
            const opt = document.createElement("option");
            opt.value = l; opt.textContent = l;
            opt.selected = existing === l;
            opt.disabled = taken;
            sel.appendChild(opt);
        });
        sel.onchange = () => {
            const newLangs = [];
            sec.querySelectorAll(".class-lang-select").forEach(s => { if (s.value) newLangs.push(s.value); });
            rd.languages = newLangs;
            debouncedSave();
            renderRacePanel();
        };
        list.appendChild(sel);
    }

    sec.appendChild(list);
    container.appendChild(sec);
}

function _renderRaceSkillChoices(container, rd, race) {
    const cfg   = race.skillChoices;
    const allSk = Object.keys(SKILL_FIELD);
    const sec   = document.createElement("div");
    sec.className = "class-section";
    const hdg = document.createElement("div");
    hdg.className = "class-section-heading";
    hdg.innerHTML = `Racial Skill Proficiencies <span class="class-section-count">${rd.chosenSkills.length} / ${cfg.count} chosen</span>`;
    sec.appendChild(hdg);

    const grid = document.createElement("div");
    grid.className = "class-skill-grid";

    allSk.forEach(sk => {
        const chosen  = rd.chosenSkills.includes(sk);
        const atLimit = rd.chosenSkills.length >= cfg.count && !chosen;
        const badge   = document.createElement("div");
        badge.className = `class-skill-badge class-skill-badge--choice${chosen ? " class-skill-badge--chosen" : ""}${atLimit ? " class-skill-badge--disabled" : ""}`;
        badge.textContent = SKILL_LABELS[sk];
        badge.title = chosen ? "Click to remove" : atLimit ? `Limit reached (${cfg.count})` : "Click to choose";
        if (!atLimit || chosen) {
            badge.onclick = () => {
                const oldRd = JSON.parse(JSON.stringify(rd));
                rd.chosenSkills = chosen
                    ? rd.chosenSkills.filter(s => s !== sk)
                    : [...rd.chosenSkills, sk];
                applyRaceSkillProficiencies(rd, oldRd);
                refreshComputedDisplays();
                renderRacePanel();
                debouncedSave();
            };
        }
        grid.appendChild(badge);
    });
    sec.appendChild(grid);
    container.appendChild(sec);
}
