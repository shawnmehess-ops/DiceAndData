import { state, DEFAULT_COMBAT_FIELDS, DEFAULT_PASSIVES } from "./state.js";
import { rerenderAll }                from "./ui.js";
import { getModifier, getStatValue,
         getProfBonus, profBonusForLevel,
         currentLevel }               from "./stats.js";

let debouncedSave = () => {};
export function setDebouncedSave(fn) { debouncedSave = fn; }

// ---------------- FORMULA ENGINE ----------------
// Evaluates a derived combat field or passive to a display string.
export function evalFormula(field) {
    switch (field.formula) {
        case "stat_mod": {
            const m = getModifier(getStatValue(field.stat));
            return m >= 0 ? `+${m}` : `${m}`;
        }
        case "stat_mod_plus_prof": {
            const m = getModifier(getStatValue(field.stat)) + getProfBonus(currentLevel());
            return m >= 0 ? `+${m}` : `${m}`;
        }
        case "stat_value":
            return String(getStatValue(field.stat));
        case "prof_bonus": {
            const pb = getProfBonus(currentLevel());
            return pb >= 0 ? `+${pb}` : `${pb}`;
        }
        case "level":
            return String(currentLevel());
        default:
            return "—";
    }
}

// Human-readable formula label shown inside the combat box
function formulaLabel(field) {
    const statLabel = field.stat
        ? (state.currentStats.find(s => s.key === field.stat)?.label ?? field.stat.toUpperCase())
        : null;
    switch (field.formula) {
        case "stat_mod":            return statLabel ? `${statLabel} mod` : "Stat mod";
        case "stat_mod_plus_prof":  return statLabel ? `${statLabel} mod + Prof` : "Mod + Prof";
        case "stat_value":          return statLabel ? `${statLabel} score` : "Stat";
        case "prof_bonus":          return "Prof Bonus";
        case "level":               return "Level";
        default:                    return "";
    }
}

// Passive score: 10 + skill's total (mod + prof)
export function evalPassive(passive) {
    const skill = state.currentSkills.find(s => s.name === passive.skillName);
    if (!skill) return 10 + getModifier(getStatValue("wis")); // fallback
    return 10 + getModifier(getStatValue(skill.stat)) + profBonusForLevel(skill.profLevel);
}

// ---------------- RENDER COMBAT FIELDS ----------------
export function renderCombatFields() {
    const container = document.getElementById("combatFieldsContainer");
    if (!container) return;
    container.innerHTML = "";

    state.currentCombatFields.forEach((field, index) => {
        const box = document.createElement("div");
        box.className = "combat-box combat-box-dynamic";

        if (field.type === "manual") {
            box.innerHTML = `
                <button class="combat-field-delete" title="Remove field">✕</button>
                <label>${field.label}</label>
                <input type="number" value="${field.value ?? 0}" min="0">
            `;
            box.querySelector("input").oninput = (e) => {
                state.currentCombatFields[index].value = parseInt(e.target.value) || 0;
                debouncedSave();
            };
        } else {
            // derived — display only, with formula hint
            const display = evalFormula(field);
            box.innerHTML = `
                <button class="combat-field-delete" title="Remove field">✕</button>
                <label>${field.label}</label>
                <div class="value">${display}</div>
                <div class="combat-formula-hint">${formulaLabel(field)}</div>
            `;
        }

        box.querySelector(".combat-field-delete").onclick = () => {
            state.currentCombatFields.splice(index, 1);
            rerenderAll();
            debouncedSave();
        };

        container.appendChild(box);
    });
}

// ---------------- RENDER PASSIVE SCORES ----------------
export function renderPassives() {
    const container = document.getElementById("passivesContainer");
    if (!container) return;
    container.innerHTML = "";

    state.currentPassives.forEach((passive, index) => {
        const score = evalPassive(passive);
        const row = document.createElement("div");
        row.className = "passive-row";
        row.innerHTML = `
            <span class="passive-label">${passive.label}</span>
            <span class="passive-skill-hint">${passive.skillName}</span>
            <span class="passive-value">${score}</span>
            <button class="passive-delete" title="Remove">✕</button>
        `;
        row.querySelector(".passive-delete").onclick = () => {
            state.currentPassives.splice(index, 1);
            rerenderAll();
            debouncedSave();
        };
        container.appendChild(row);
    });
}

// ---------------- ADD COMBAT FIELD ----------------
export function initAddCombatField() {
    document.getElementById("addCombatFieldBtn").onclick = () => {
        const label    = document.getElementById("newCombatLabel").value.trim();
        const typeVal  = document.getElementById("newCombatType").value;
        const formula  = document.getElementById("newCombatFormula").value;
        const statKey  = document.getElementById("newCombatStat").value;

        if (!label) return;

        const id = `cf_${Date.now()}`;

        if (typeVal === "manual") {
            state.currentCombatFields.push({ id, label, type: "manual", value: 0 });
        } else {
            const needsStat = ["stat_mod", "stat_mod_plus_prof", "stat_value"].includes(formula);
            state.currentCombatFields.push({
                id, label, type: "derived",
                formula,
                stat: needsStat ? statKey : null
            });
        }

        document.getElementById("newCombatLabel").value = "";
        rerenderAll();
        debouncedSave();
    };

    // Toggle stat dropdown visibility based on formula selection
    const formulaSelect = document.getElementById("newCombatFormula");
    const statSelect    = document.getElementById("newCombatStat");
    const typeSelect    = document.getElementById("newCombatType");
    const derivedOpts   = document.getElementById("derivedOptions");

    function updateVisibility() {
        const isDerived = typeSelect.value === "derived";
        derivedOpts.style.display = isDerived ? "flex" : "none";

        const needsStat = ["stat_mod", "stat_mod_plus_prof", "stat_value"].includes(formulaSelect.value);
        statSelect.style.display = (isDerived && needsStat) ? "" : "none";
    }

    typeSelect.onchange    = updateVisibility;
    formulaSelect.onchange = updateVisibility;
    updateVisibility();
}

// Keep the stat dropdown in the "Add Combat Field" row in sync with currentStats
export function updateCombatStatDropdown() {
    const sel = document.getElementById("newCombatStat");
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = "";
    state.currentStats.forEach(s => {
        const opt = document.createElement("option");
        opt.value       = s.key;
        opt.textContent = s.label;
        if (s.key === current) opt.selected = true;
        sel.appendChild(opt);
    });
}

// ---------------- ADD PASSIVE ----------------
export function initAddPassive() {
    document.getElementById("addPassiveBtn").onclick = () => {
        const label     = document.getElementById("newPassiveLabel").value.trim();
        const skillName = document.getElementById("newPassiveSkill").value.trim();
        if (!label || !skillName) return;

        state.currentPassives.push({
            id: `ps_${Date.now()}`,
            label,
            skillName
        });

        document.getElementById("newPassiveLabel").value    = "";
        document.getElementById("newPassiveSkill").value    = "";
        rerenderAll();
        debouncedSave();
    };
}

// Keep the passive skill datalist in sync with current skills
export function updatePassiveSkillList() {
    const list = document.getElementById("passiveSkillList");
    if (!list) return;
    list.innerHTML = "";
    state.currentSkills.forEach(sk => {
        const opt = document.createElement("option");
        opt.value = sk.name;
        list.appendChild(opt);
    });
}
