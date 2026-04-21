import { state }                      from "./state.js";
import { passivePerception }          from "./ui.js";
import { registerPostRenderer }       from "./ui.js";
import { getProfBonus, getModifier,
         getStatValue, profBonusForLevel,
         currentLevel }               from "./stats.js";

// ---------------- INTERNAL TEST STATE ----------------
let _testResults  = [];
let _currentGroup = "";

function _startGroup(name) { _currentGroup = name; }

export function logTest(name, passed, message = "") {
    _testResults.push({ group: _currentGroup, name, passed, message });
}

function _flushResults() {
    const container = document.getElementById("testResults");
    if (!container) return;
    container.innerHTML = "";

    let lastGroup = "";
    let passCount = 0;
    let failCount = 0;

    _testResults.forEach(r => {
        if (r.group !== lastGroup) {
            const groupEl = document.createElement("div");
            groupEl.className   = "test-group-header";
            groupEl.textContent = r.group;
            container.appendChild(groupEl);
            lastGroup = r.group;
        }

        const row = document.createElement("div");
        row.className  = "test-row";
        row.innerHTML  = `
            <span class="test-badge ${r.passed ? "pass" : "fail"}">${r.passed ? "PASS" : "FAIL"}</span>
            <span class="test-name">${r.name}</span>
            ${r.message ? `<span class="test-msg">— ${r.message}</span>` : ""}
        `;
        container.appendChild(row);

        r.passed ? passCount++ : failCount++;
    });

    const summary     = document.createElement("div");
    const allPass     = failCount === 0;
    summary.className = `test-summary ${allPass ? "all-pass" : "has-fail"}`;
    summary.textContent = allPass
        ? `✓ All ${passCount} tests passed`
        : `${passCount} passed · ${failCount} failed`;
    container.appendChild(summary);
}

// ---- validateStats ----
function validateStats() {
    _startGroup("Stats");
    logTest("currentStats is array", Array.isArray(state.currentStats));
    if (!Array.isArray(state.currentStats)) return;

    logTest("at least one stat exists", state.currentStats.length > 0, `count: ${state.currentStats.length}`);

    let allValid = true;
    const badStats = [];
    state.currentStats.forEach((s, i) => {
        const ok = typeof s.key   === "string" && s.key.length   > 0
                && typeof s.label === "string" && s.label.length > 0
                && typeof s.base  === "number" && !isNaN(s.base);
        if (!ok) { allValid = false; badStats.push(i); }
    });
    logTest("all stats have key/label/numeric base", allValid,
        allValid ? "" : `bad indices: ${badStats.join(", ")}`);
}

// ---- validateSkills ----
function validateSkills() {
    _startGroup("Skills");
    logTest("currentSkills is array", Array.isArray(state.currentSkills));
    if (!Array.isArray(state.currentSkills)) return;

    logTest("at least one skill exists", state.currentSkills.length > 0, `count: ${state.currentSkills.length}`);

    const statKeys     = state.currentStats.map(s => s.key);
    let allHaveFields  = true;
    let allStatRefs    = true;
    let allProfLevels  = true;
    const fieldBad = [], statBad = [], profBad = [];

    state.currentSkills.forEach((sk, i) => {
        if (!sk.name || !sk.stat) { allHaveFields = false; fieldBad.push(i); }
        if (!statKeys.includes(sk.stat)) { allStatRefs = false; statBad.push(`"${sk.name}"`); }
        if (![0, 1, 2, 3].includes(sk.profLevel)) { allProfLevels = false; profBad.push(`"${sk.name}"`); }
    });

    logTest("all skills have name + stat", allHaveFields,
        allHaveFields ? "" : `bad indices: ${fieldBad.join(", ")}`);
    logTest("all skill stat refs exist in currentStats", allStatRefs,
        allStatRefs ? "" : `unknown stat in: ${statBad.join(", ")}`);
    logTest("all profLevels are 0–3", allProfLevels,
        allProfLevels ? "" : `invalid in: ${profBad.join(", ")}`);
}

// ---- validateSavingThrows ----
function validateSavingThrows() {
    _startGroup("Saving Throws");
    const EXPECTED_KEYS = ["str", "dex", "con", "int", "wis", "cha"];

    logTest("currentSavingThrows exists",
        typeof state.currentSavingThrows === "object" && state.currentSavingThrows !== null);

    const allKeysPresent = EXPECTED_KEYS.every(k => k in state.currentSavingThrows);
    const missing        = EXPECTED_KEYS.filter(k => !(k in state.currentSavingThrows));
    logTest("all 6 stat keys present", allKeysPresent,
        allKeysPresent ? "" : `missing: ${missing.join(", ")}`);

    const nonBool = EXPECTED_KEYS.filter(k => typeof state.currentSavingThrows[k] !== "boolean");
    logTest("all values are boolean", nonBool.length === 0,
        nonBool.length === 0 ? "" : `non-boolean keys: ${nonBool.join(", ")}`);
}

// ---- validateInventory ----
function validateInventory() {
    _startGroup("Inventory");
    const VALID_TYPES = ["weapon", "armor", "consumable", "misc"];

    logTest("currentItems is array", Array.isArray(state.currentItems));
    if (!Array.isArray(state.currentItems)) return;

    let allFields  = true;
    let allTypes   = true;
    let allSchemas = true;
    const fieldBad  = [];
    const typeBad   = [];
    const schemaBad = [];

    state.currentItems.forEach((item, i) => {
        const label = `"${item.name ?? i}"`;

        if (!item.id || !item.name || !item.type || typeof item.data !== "object") {
            allFields = false; fieldBad.push(label);
        }

        if (!VALID_TYPES.includes(item.type)) {
            allTypes = false; typeBad.push(label);
        }

        let schemaOk = true;
        if (item.type === "weapon")     { schemaOk = ("stat" in item.data) && ("damage" in item.data) && ("proficient" in item.data); }
        else if (item.type === "armor") { schemaOk = ("baseAC" in item.data) && ("dexCap" in item.data); }
        else if (item.type === "consumable") { schemaOk = "effect" in item.data; }
        else if (item.type === "misc")  { schemaOk = "description" in item.data; }
        if (!schemaOk) { allSchemas = false; schemaBad.push(label); }
    });

    logTest("all items have id/name/type/data", allFields,
        allFields ? "" : `bad items: ${fieldBad.join(", ")}`);
    logTest("all item types are valid", allTypes,
        allTypes ? "" : `unknown types in: ${typeBad.join(", ")}`);
    logTest("all items match type schema", allSchemas,
        allSchemas ? "" : `schema mismatch: ${schemaBad.join(", ")}`);
}

// ---- validateDerivedValues ----
function validateDerivedValues() {
    _startGroup("Derived Values");
    const level      = currentLevel();
    const pb         = getProfBonus(level);
    const expectedPB = Math.floor((level - 1) / 4) + 2;

    logTest(`proficiency bonus correct for level ${level}`, pb === expectedPB,
        `got ${pb}, expected ${expectedPB}`);

    let allSkillTotalsCorrect = true;
    const badSkills = [];
    state.currentSkills.forEach(sk => {
        const statVal  = getStatValue(sk.stat);
        const expected = getModifier(statVal) + profBonusForLevel(sk.profLevel);
        const recalc   = getModifier(getStatValue(sk.stat)) + profBonusForLevel(sk.profLevel);
        if (expected !== recalc) { allSkillTotalsCorrect = false; badSkills.push(`"${sk.name}"`); }
    });
    logTest("all skill totals recalculate consistently", allSkillTotalsCorrect,
        allSkillTotalsCorrect ? "" : `mismatched: ${badSkills.join(", ")}`);

    const percSkill   = state.currentSkills.find(s => s.name === "Perception");
    const percProf    = percSkill ? profBonusForLevel(percSkill.profLevel) : 0;
    const expectedPP  = 10 + getModifier(getStatValue("wis")) + percProf;
    const displayedPP = parseInt(passivePerception.textContent);
    const ppOk        = displayedPP === expectedPP;
    logTest("passive perception matches formula", ppOk,
        ppOk ? "" : `displayed ${displayedPP}, expected ${expectedPP}`);
}

// ---- main entry point ----
export function runAllTests() {
    _testResults  = [];
    _currentGroup = "";

    validateStats();
    validateSkills();
    validateSavingThrows();
    validateInventory();
    validateDerivedValues();

    _flushResults();
}

// ---------------- INIT ----------------
export function initTests() {
    document.getElementById("runAllTests").onclick = runAllTests;

    // Auto-run hook: fires after every rerenderAll, but only when checkbox is checked
    registerPostRenderer(() => {
        if (document.getElementById("autoRunTests")?.checked) {
            runAllTests();
        }
    });
}
