// ============================================================
// TESTS.JS — Validation system
// ============================================================
import { state, getFieldById } from "./state.js";
import { evalFormula }         from "./fields.js";

let _results = [];
let _group   = "";

function startGroup(name) { _group = name; }

export function logTest(name, passed, msg = "") {
    _results.push({ group: _group, name, passed, msg });
}

function flush() {
    const container = document.getElementById("testResults");
    if (!container) return;
    container.innerHTML = "";

    let lastGroup = "";
    let pass = 0, fail = 0;

    _results.forEach(r => {
        if (r.group !== lastGroup) {
            const g = document.createElement("div");
            g.className = "test-group-header";
            g.textContent = r.group;
            container.appendChild(g);
            lastGroup = r.group;
        }
        const row = document.createElement("div");
        row.className = "test-row";
        row.innerHTML = `
            <span class="test-badge ${r.passed ? "pass" : "fail"}">${r.passed ? "PASS" : "FAIL"}</span>
            <span class="test-name">${r.name}</span>
            ${r.msg ? `<span class="test-msg">— ${r.msg}</span>` : ""}
        `;
        container.appendChild(row);
        r.passed ? pass++ : fail++;
    });

    const summary = document.createElement("div");
    const allPass = fail === 0;
    summary.className   = `test-summary ${allPass ? "all-pass" : "has-fail"}`;
    summary.textContent = allPass
        ? `✓ All ${pass} tests passed`
        : `${pass} passed · ${fail} failed`;
    container.appendChild(summary);
}

// ---- Validators --------------------------------------------

function validateBlocks() {
    startGroup("Blocks");
    logTest("state.blocks is array", Array.isArray(state.blocks));
    if (!Array.isArray(state.blocks)) return;
    logTest("at least one block", state.blocks.length > 0, `count: ${state.blocks.length}`);

    state.blocks.forEach(b => {
        logTest(`block "${b.id}" has label`, typeof b.label === "string" && b.label.length > 0);
        logTest(`block "${b.id}" has fields array`, Array.isArray(b.fields));
    });
}

function validateFields() {
    startGroup("Fields");
    const VALID_TYPES = ["text", "flat", "computed", "checks"];
    const allFields   = state.blocks.flatMap(b => b.fields ?? []);

    logTest("all fields have id and type", allFields.every(f => f.id && VALID_TYPES.includes(f.type)),
        allFields.filter(f => !f.id || !VALID_TYPES.includes(f.type)).map(f => f.id ?? "?").join(", "));

    const flatFields = allFields.filter(f => f.type === "flat");
    logTest("all flat fields have numeric value",
        flatFields.every(f => typeof f.value === "number"),
        flatFields.filter(f => typeof f.value !== "number").map(f => f.id).join(", "));

    const computed = allFields.filter(f => f.type === "computed");
    logTest("all computed fields have formula",
        computed.every(f => typeof f.formula === "string" && f.formula.length > 0),
        computed.filter(f => !f.formula).map(f => f.id).join(", "));
}

function validateComputedValues() {
    startGroup("Computed Values");
    const allFields = state.blocks.flatMap(b => b.fields ?? []);
    const computed  = allFields.filter(f => f.type === "computed");

    let allResolved = true;
    const failed    = [];
    computed.forEach(f => {
        try {
            const v = evalFormula(f);
            if (typeof v !== "number" || isNaN(v)) {
                allResolved = false;
                failed.push(f.id);
            }
        } catch {
            allResolved = false;
            failed.push(f.id);
        }
    });
    logTest("all computed fields resolve to a number", allResolved,
        failed.length ? `failed: ${failed.join(", ")}` : "");

    // Spot-check: proficiency bonus for level 1 should be +2
    const lvlField = getFieldById("f_level");
    if (lvlField) {
        const savedLevel = lvlField.value;
        lvlField.value   = 1;
        const profField  = getFieldById("f_prof");
        if (profField) {
            const pb = evalFormula(profField);
            logTest("prof bonus at level 1 = 2", pb === 2, `got ${pb}`);
        }
        lvlField.value = savedLevel;
    }
}

function validateInventory() {
    startGroup("Inventory");
    logTest("state.items is array", Array.isArray(state.items));
    if (!Array.isArray(state.items)) return;

    const VALID = ["weapon", "armor", "consumable", "misc"];
    const bad   = state.items.filter(i => !i.id || !i.name || !VALID.includes(i.type));
    logTest("all items have id/name/valid type", bad.length === 0,
        bad.map(i => i.name ?? "?").join(", "));
}

// ---- Entry point -------------------------------------------
export function runAllTests() {
    _results = [];
    _group   = "";

    validateBlocks();
    validateFields();
    validateComputedValues();
    validateInventory();

    flush();
}

export function shouldAutoRunTests() {
    const autoCheck = document.getElementById("autoRunTests");
    return Boolean(autoCheck?.checked);
}

export function initTests() {
    const btn = document.getElementById("runAllTests");
    if (btn) btn.onclick = runAllTests;
}
