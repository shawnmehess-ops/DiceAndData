// ============================================================
// FIELDS.JS — Formula engine + per-field-type renderers
// ============================================================
import { state, getFieldById } from "./state.js";

// ---- FORMULA ENGINE ----------------------------------------
// Returns numeric value for any field (flat or computed).
// Computed fields resolve their sources recursively.
// Proficiency bonus is derived from the Level flat field.

function profBonus() {
    const lvl = getFieldById("f_level");
    const l   = lvl ? (parseInt(lvl.value) || 1) : 1;
    return Math.floor((l - 1) / 4) + 2;
}

function resolveValue(id) {
    const f = getFieldById(id);
    if (!f) return 0;
    if (f.type === "flat")     return parseInt(f.value) || 0;
    if (f.type === "computed") return evalFormula(f);
    return 0;
}

// Map ability abbreviations (as a player would type them) to field IDs.
// Case-insensitive — "int", "INT", "Int" all work.
const ABILITY_TO_FIELD = {
    str: "f_str", strength:     "f_str",
    dex: "f_dex", dexterity:    "f_dex",
    con: "f_con", constitution: "f_con",
    int: "f_int", intelligence: "f_int",
    wis: "f_wis", wisdom:       "f_wis",
    cha: "f_cha", charisma:     "f_cha",
};

// Read the spellcasting ability text field and return the modifier
// for whichever ability score it names. Falls back to INT if blank/unknown.
function spellcastingMod() {
    const abilityField = getFieldById("f_spell_ability");
    const raw          = (abilityField?.value ?? "").trim().toLowerCase();
    const fieldId      = ABILITY_TO_FIELD[raw] ?? "f_int";
    const score        = resolveValue(fieldId);
    return Math.floor((score - 10) / 2);
}

export function evalFormula(field) {
    const srcs = (field.sources || []).map(resolveValue);

    switch (field.formula) {
        // Standard D&D ability modifier
        case "modifier":
            return Math.floor(((srcs[0] ?? 10) - 10) / 2);

        // Sum all sources
        case "sum":
            return srcs.reduce((a, b) => a + b, 0);

        // Passive score: 10 + first source
        case "passive":
            return 10 + (srcs[0] ?? 0);

        // Standalone proficiency bonus (no sources needed)
        case "prof_bonus":
            return profBonus();

        // source[0] + proficiency bonus
        case "add_prof":
            return (srcs[0] ?? 0) + profBonus();

        // source[0] + floor(prof / 2)  — Jack of All Trades
        case "half_prof":
            return (srcs[0] ?? 0) + Math.floor(profBonus() / 2);

        // source[0] + prof * 2  — Expertise
        case "double_prof":
            return (srcs[0] ?? 0) + profBonus() * 2;

        // Multiply two sources
        case "multiply":
            return (srcs[0] ?? 0) * (srcs[1] ?? 1);

        // source[0] + prof if this field's proficiency checkbox is checked
        // Uses the field's own `proficient` boolean flag toggled by a checkbox in the UI
        case "add_prof_if_checked": {
            const base = Math.floor(((srcs[0] ?? 10) - 10) / 2);
            const pb   = profBonus();
            if (field.proficient === 2) return base + pb * 2;   // expertise
            if (field.proficient === 1) return base + pb;        // proficient
            return base;                                          // none
        }

        // Static spell attack bonus: spellcasting mod (from sources) + prof
        // Used when the source ability is hardwired in the schema.
        case "spell_attack":
            return (srcs[0] ?? 0) + profBonus();

        // Static spell save DC: 8 + spellcasting mod (from sources) + prof
        case "spell_save_dc":
            return 8 + (srcs[0] ?? 0) + profBonus();

        // Dynamic spell attack bonus: reads f_spell_ability text field at runtime.
        // No sources needed — the ability is resolved from the text field.
        case "spell_attack_dynamic":
            return spellcastingMod() + profBonus();

        // Dynamic spell save DC: 8 + dynamic spellcasting mod + prof
        case "spell_save_dc_dynamic":
            return 8 + spellcastingMod() + profBonus();

        default:
            return 0;
    }
}

// ---- FORMAT HELPERS ----------------------------------------
function fmtMod(n) { return n >= 0 ? `+${n}` : `${n}`; }

// Whether a formula result should be shown with a +/- sign
const SIGNED_FORMULAS = new Set([
    "modifier", "add_prof", "half_prof", "double_prof",
    "add_prof_if_checked", "spell_attack", "prof_bonus",
    "spell_attack_dynamic",
]);

export function formatValue(field) {
    if (field.type === "flat")     return String(field.value ?? 0);
    if (field.type === "computed") {
        const v = evalFormula(field);
        return SIGNED_FORMULAS.has(field.formula) ? fmtMod(v) : String(v);
    }
    return "";
}

// ---- RENDER FUNCTIONS --------------------------------------
// Each returns a DOM element. The caller appends it.

// -- TextField --
export function renderTextField(field, onChange) {
    const wrap  = document.createElement("div");
    wrap.className = "field field-text";
    wrap.innerHTML = `<label class="field-label">${field.label}</label>`;

    const input = document.createElement("input");
    input.className   = "field-input-text";
    input.type        = "text";
    input.value       = field.value ?? "";
    input.placeholder = field.placeholder ?? "";
    input.oninput = () => {
        field.value = input.value;
        // Spellcasting ability drives dynamic computed fields — refresh them live.
        if (field.id === "f_spell_ability") refreshComputedDisplays();
        onChange();
    };

    wrap.appendChild(input);
    return wrap;
}

// -- FlatStat --
export function renderFlatStat(field, onChange) {
    const wrap = document.createElement("div");
    wrap.className = "field field-flat";

    wrap.innerHTML = `<label class="field-label">${field.label}</label>`;

    const input = document.createElement("input");
    input.className = "field-input-number";
    input.type      = "number";
    input.value     = field.value ?? 0;
    input.oninput   = () => {
        field.value = parseInt(input.value) || 0;
        onChange();
    };

    wrap.appendChild(input);
    return wrap;
}

// -- ComputedStat --
// Shows derived value + a proficiency selector for add_prof_if_checked fields
export function renderComputedStat(field, onChange) {
    const wrap = document.createElement("div");
    wrap.className = "field field-computed";

    const value   = evalFormula(field);
    const display = SIGNED_FORMULAS.has(field.formula) ? fmtMod(value) : String(value);

    let profHtml = "";
    if (field.formula === "add_prof_if_checked") {
        const p = field.proficient ?? 0;
        profHtml = `
            <div class="prof-group">
                <label title="None">
                    <input type="radio" name="prof_${field.id}" value="0" ${p === 0 ? "checked" : ""}>
                </label>
                <label title="Proficient">
                    <input type="radio" name="prof_${field.id}" value="1" ${p === 1 ? "checked" : ""}>
                </label>
                <label title="Expertise">
                    <input type="radio" name="prof_${field.id}" value="2" ${p === 2 ? "checked" : ""}>
                </label>
            </div>`;
    }

    wrap.innerHTML = `
        ${profHtml}
        <span class="field-label">${field.label}</span>
        <span class="field-computed-value">${display}</span>
    `;

    if (field.formula === "add_prof_if_checked") {
        wrap.querySelectorAll("input[type=radio]").forEach(r => {
            r.onchange = () => {
                field.proficient = parseInt(r.value);
                onChange();
            };
        });
    }

    return wrap;
}

// -- CheckboxGroup --
export function renderCheckboxGroup(field, onChange) {
    const wrap = document.createElement("div");
    wrap.className = "field field-checks";

    wrap.innerHTML = `<label class="field-label">${field.label}</label>`;

    const boxes = document.createElement("div");
    boxes.className = "check-boxes";

    for (let i = 0; i < field.count; i++) {
        const cb = document.createElement("input");
        cb.type    = "checkbox";
        cb.checked = field.values?.[i] ?? false;
        cb.className = "check-box";
        cb.onchange = () => {
            if (!field.values) field.values = Array(field.count).fill(false);
            field.values[i] = cb.checked;
            onChange();
        };
        boxes.appendChild(cb);
    }

    wrap.appendChild(boxes);
    return wrap;
}

// ---- DISPATCHER -------------------------------------------
export function renderField(field, onChange) {
    switch (field.type) {
        case "text":     return renderTextField(field, onChange);
        case "flat":     return renderFlatStat(field, onChange);
        case "computed": return renderComputedStat(field, onChange);
        case "checks":   return renderCheckboxGroup(field, onChange);
        default: {
            const div = document.createElement("div");
            div.textContent = `Unknown field type: ${field.type}`;
            return div;
        }
    }
}

// ---- Refresh all computed values in the DOM ---------------
// Called after any flat stat changes. Instead of re-rendering
// entire blocks, just updates the displayed value spans.
export function refreshComputedDisplays() {
    document.querySelectorAll(".field-computed").forEach(el => {
        const id = el.dataset.fieldId;
        if (!id) return;
        const field = getFieldById(id);
        if (!field) return;
        const span = el.querySelector(".field-computed-value");
        if (span) span.textContent = formatValue(field);
    });
}
