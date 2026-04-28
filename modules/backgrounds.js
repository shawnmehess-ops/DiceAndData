// ============================================================
// BACKGROUNDS.JS — PHB backgrounds
// Each grants: 2 skill proficiencies, a feature description,
// and optional tool/language proficiencies.
// ============================================================

import { state, getFieldById } from "./state.js";
import { registry }             from "./registry.js";
import { refreshComputedDisplays } from "./fields.js";
import { ALL_LANGUAGES } from "./classes.js";

let debouncedSave = () => {};
export function setDebouncedSave(fn) { debouncedSave = fn; }

export const BACKGROUNDS = {
    acolyte: {
        name: "Acolyte",
        skills: ["insight", "religion"],
        toolProfs: [],
        extraLanguages: 2,
        feature: { name: "Shelter of the Faithful", description: "You command the respect of those who share your faith. You and your companions can receive free healing and care at a temple of your deity, and you have ties to a specific temple." },
        equipment: "Holy symbol, prayer book or wheel, 5 sticks of incense, vestments, common clothes, pouch with 15gp.",
    },
    charlatan: {
        name: "Charlatan",
        skills: ["deception", "sleight_of_hand"],
        toolProfs: ["Disguise kit", "Forgery kit"],
        extraLanguages: 0,
        feature: { name: "False Identity", description: "You have created a second identity including documentation, established acquaintances, and disguises. You can forge documents including official papers and personal letters, as long as you've seen an example." },
        equipment: "Fine clothes, disguise kit, tools of the con, pouch with 15gp.",
    },
    criminal: {
        name: "Criminal",
        skills: ["deception", "stealth"],
        toolProfs: ["One type of gaming set", "Thieves' tools"],
        extraLanguages: 0,
        feature: { name: "Criminal Contact", description: "You have a reliable and trustworthy contact who acts as your liaison to a network of other criminals. You know how to get messages to and from your contact." },
        equipment: "Crowbar, dark common clothes with a hood, pouch with 15gp.",
    },
    entertainer: {
        name: "Entertainer",
        skills: ["acrobatics", "performance"],
        toolProfs: ["Disguise kit", "One type of musical instrument"],
        extraLanguages: 0,
        feature: { name: "By Popular Demand", description: "You can always find a place to perform, usually in an inn or tavern but also at noble courts or circus performances. At such places, you receive free lodging and food of modest standard, as long as you perform each night." },
        equipment: "Musical instrument, favor of an admirer, costume, pouch with 15gp.",
    },
    folk_hero: {
        name: "Folk Hero",
        skills: ["animal_handling", "survival"],
        toolProfs: ["One type of artisan's tools", "Vehicles (land)"],
        extraLanguages: 0,
        feature: { name: "Rustic Hospitality", description: "Since you come from the common people, you fit in among them with ease. You can find a place to hide, rest, or recuperate among commoners, unless you've shown yourself to be a danger to them." },
        equipment: "Artisan's tools, shovel, iron pot, common clothes, pouch with 10gp.",
    },
    guild_artisan: {
        name: "Guild Artisan",
        skills: ["insight", "persuasion"],
        toolProfs: ["One type of artisan's tools"],
        extraLanguages: 1,
        feature: { name: "Guild Membership", description: "You have access to guild halls in towns and cities. Fellow guild members will provide lodging and food if necessary and pay for your funeral if needed. If charged with a crime, the guild will support you." },
        equipment: "Artisan's tools, letter of introduction from your guild, traveler's clothes, pouch with 15gp.",
    },
    hermit: {
        name: "Hermit",
        skills: ["medicine", "religion"],
        toolProfs: ["Herbalism kit"],
        extraLanguages: 1,
        feature: { name: "Discovery", description: "Your time in isolation has given you access to a unique and powerful discovery. Work with your DM to determine what it is — it might be a great truth, a hidden location, or a forgotten lore." },
        equipment: "Scroll case with notes, winter blanket, common clothes, herbalism kit, pouch with 5gp.",
    },
    noble: {
        name: "Noble",
        skills: ["history", "persuasion"],
        toolProfs: ["One type of gaming set"],
        extraLanguages: 1,
        feature: { name: "Position of Privilege", description: "You are welcome in high society. Common folk make every effort to accommodate you, and other people of high birth treat you as a member of the same social sphere. You can secure an audience with a local noble if you need to." },
        equipment: "Fine clothes, signet ring, scroll of pedigree, purse with 25gp.",
    },
    outlander: {
        name: "Outlander",
        skills: ["athletics", "survival"],
        toolProfs: ["One type of musical instrument"],
        extraLanguages: 1,
        feature: { name: "Wanderer", description: "You have an excellent memory for maps and geography, and can always recall the general layout of terrain, settlements, and other features around you. In addition, you can find food and fresh water for yourself and up to five others each day." },
        equipment: "Staff, hunting trap, trophy from animal you killed, traveler's clothes, pouch with 10gp.",
    },
    sage: {
        name: "Sage",
        skills: ["arcana", "history"],
        toolProfs: [],
        extraLanguages: 2,
        feature: { name: "Researcher", description: "When you attempt to learn or recall information, if you don't know it you often know where and from whom you can obtain it — a library, a university, a sage, or some other source. The DM might decide that you can't find information about some secret knowledge." },
        equipment: "Bottle of black ink, quill, small knife, letter from a dead colleague, common clothes, pouch with 10gp.",
    },
    sailor: {
        name: "Sailor",
        skills: ["athletics", "perception"],
        toolProfs: ["Navigator's tools", "Vehicles (water)"],
        extraLanguages: 0,
        feature: { name: "Ship's Passage", description: "When you need to, you can secure free passage on a sailing ship for yourself and your companions. You might sail with a crew you served with before, or establish a new connection. You might have to work during the voyage." },
        equipment: "Belaying pin (club), silk rope 50 ft, lucky charm, common clothes, pouch with 10gp.",
    },
    soldier: {
        name: "Soldier",
        skills: ["athletics", "intimidation"],
        toolProfs: ["One type of gaming set", "Vehicles (land)"],
        extraLanguages: 0,
        feature: { name: "Military Rank", description: "You have a military rank from your career as a soldier. Soldiers loyal to your former military organization still recognize your authority and influence, and they will defer to you if they are of a lower rank." },
        equipment: "Insignia of rank, trophy from fallen enemy, gaming set, common clothes, pouch with 10gp.",
    },
    urchin: {
        name: "Urchin",
        skills: ["sleight_of_hand", "stealth"],
        toolProfs: ["Disguise kit", "Thieves' tools"],
        extraLanguages: 0,
        feature: { name: "City Secrets", description: "You know the secret patterns and flows of cities and can find routes through the urban sprawl that others would miss. When not in combat, you (and companions you lead) can travel between two locations in any city in half the normal time." },
        equipment: "Small knife, map of the city you grew up in, pet mouse, token of remembrance from parents, common clothes, pouch with 10gp.",
    },
};

// ============================================================
// STATE HELPERS
// ============================================================
export function defaultBackgroundData() {
    return { backgroundId: null, languages: [] };
}

export function getBackgroundData() {
    if (!state.backgroundData) state.backgroundData = defaultBackgroundData();
    return state.backgroundData;
}

// Expose for syncDisplayFields in character.js
registry.set("BACKGROUNDS", BACKGROUNDS);

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

export function applyBackgroundSkills(bgId, oldBgId) {
    // Clear old
    if (oldBgId) {
        const old = BACKGROUNDS[oldBgId];
        (old?.skills ?? []).forEach(sk => {
            const f = getFieldById(SKILL_FIELD[sk]);
            if (f && f.proficient === 1) f.proficient = 0;
        });
    }
    // Apply new
    const bg = bgId ? BACKGROUNDS[bgId] : null;
    if (!bg) return;
    (bg.skills ?? []).forEach(sk => {
        const f = getFieldById(SKILL_FIELD[sk]);
        if (f) f.proficient = 1;
    });
}

// ============================================================
// RENDER — Background panel section
// ============================================================
export function renderBackgroundPanel() {
    const container = document.getElementById("backgroundPanelContent");
    if (!container) return;
    container.innerHTML = "";

    const bd = getBackgroundData();
    const bg = bd.backgroundId ? BACKGROUNDS[bd.backgroundId] : null;

    // Selector
    const row = document.createElement("div");
    row.className = "class-row";
    const lbl = document.createElement("label");
    lbl.className = "class-field-label"; lbl.textContent = "Background";
    const sel = document.createElement("select");
    sel.className = "class-select";
    const blank = document.createElement("option");
    blank.value = ""; blank.textContent = "— Choose a background —";
    sel.appendChild(blank);
    Object.entries(BACKGROUNDS).forEach(([id, b]) => {
        const opt = document.createElement("option");
        opt.value = id; opt.textContent = b.name;
        if (id === bd.backgroundId) opt.selected = true;
        sel.appendChild(opt);
    });
    sel.onchange = () => {
        const oldId       = bd.backgroundId;
        bd.backgroundId   = sel.value || null;
        bd.languages      = [];
        applyBackgroundSkills(bd.backgroundId, oldId);
        refreshComputedDisplays();
        renderBackgroundPanel();
        registry.call("syncDisplayFields");
        debouncedSave();
    };
    row.append(lbl, sel);
    container.appendChild(row);

    if (!bg) return;

    // Summary
    const summary = document.createElement("div");
    summary.className = "class-summary";
    const skillNames = bg.skills.map(sk => SKILL_FIELD[sk] ? sk.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase()) : sk);
    summary.innerHTML = `
        <div class="class-summary-grid">
            <span class="cs-label">Skills</span>  <span class="cs-val">${skillNames.join(", ")}</span>
            ${bg.toolProfs.length ? `<span class="cs-label">Tools</span><span class="cs-val">${bg.toolProfs.join(", ")}</span>` : ""}
            ${bg.extraLanguages ? `<span class="cs-label">Languages</span><span class="cs-val">+${bg.extraLanguages} of your choice</span>` : ""}
            <span class="cs-label">Equipment</span><span class="cs-val">${bg.equipment}</span>
        </div>
    `;
    container.appendChild(summary);

    // Feature
    const sec = document.createElement("div");
    sec.className = "class-section";
    const hdg = document.createElement("div");
    hdg.className = "class-section-heading"; hdg.textContent = "Background Feature";
    sec.appendChild(hdg);
    const featRow = document.createElement("div");
    featRow.className = "class-feat-row";
    const lock = document.createElement("span");
    lock.className = "class-feat-lock"; lock.textContent = "✦";
    const fname = document.createElement("span");
    fname.className = "class-feat-name"; fname.textContent = bg.feature.name;
    const fdesc = document.createElement("p");
    fdesc.className = "class-feat-desc"; fdesc.textContent = bg.feature.description;
    featRow.append(lock, fname);
    featRow.appendChild(fdesc);
    sec.appendChild(featRow);
    container.appendChild(sec);

    // Extra language choices
    if (bg.extraLanguages > 0) {
        const langSec = document.createElement("div");
        langSec.className = "class-section";
        const langHdg = document.createElement("div");
        langHdg.className = "class-section-heading";
        langHdg.innerHTML = `Languages <span class="class-section-count">${bd.languages.length} / ${bg.extraLanguages}</span>`;
        langSec.appendChild(langHdg);
        const list = document.createElement("div");
        list.className = "class-lang-list";
        for (let i = 0; i < bg.extraLanguages; i++) {
            const existing = bd.languages[i] ?? "";
            const langSel = document.createElement("select");
            langSel.className = "class-lang-select";
            const emp = document.createElement("option");
            emp.value = ""; emp.textContent = "— choose —";
            langSel.appendChild(emp);
            ALL_LANGUAGES.filter(l => l !== "Common").forEach(l => {
                const taken = bd.languages.includes(l) && bd.languages[i] !== l;
                const opt = document.createElement("option");
                opt.value = l; opt.textContent = l;
                opt.selected = existing === l;
                opt.disabled = taken;
                langSel.appendChild(opt);
            });
            langSel.onchange = () => {
                const nl = [];
                langSec.querySelectorAll(".class-lang-select").forEach(s => { if (s.value) nl.push(s.value); });
                bd.languages = nl;
                debouncedSave();
                renderBackgroundPanel();
            };
            list.appendChild(langSel);
        }
        langSec.appendChild(list);
        container.appendChild(langSec);
    }
}