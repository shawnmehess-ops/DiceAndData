import { state, DEFAULT_STATS }  from "./state.js";
import {
    statsContainer, newStatName, newSkillStat,
    editLevel
} from "./ui.js";
import { rerenderAll } from "./ui.js";

// debouncedSave is injected by app.js after all modules load
let debouncedSave = () => {};
export function setDebouncedSave(fn) { debouncedSave = fn; }

// renderSkills and renderPassives are injected by app.js to avoid circular imports
let _renderSkills  = () => {};
let _renderPassives = () => {};
export function setSkillRenderers(renderSkillsFn, renderPassivesFn) {
    _renderSkills   = renderSkillsFn;
    _renderPassives = renderPassivesFn;
}

// ---------------- UTIL / CALCULATIONS ----------------
export function getModifier(score)  { return Math.floor((score - 10) / 2); }
export function formatMod(score)    { const m = getModifier(score); return m >= 0 ? `+${m}` : `${m}`; }
export function getProfBonus(level) { return Math.floor((level - 1) / 4) + 2; }
export function getStatValue(key)   { const s = state.currentStats.find(s => s.key === key); return s ? (parseInt(s.base) || 10) : 10; }
export function currentLevel()      { return parseInt(editLevel.value) || 1; }

export function profBonusForLevel(profLevel) {
    const pb = getProfBonus(currentLevel());
    switch (profLevel) {
        case 1: return Math.floor(pb / 2);
        case 2: return pb;
        case 3: return pb * 2;
        default: return 0;
    }
}

// ---------------- SKILL STAT DROPDOWN ----------------
export function updateSkillStatDropdown() {
    newSkillStat.innerHTML = "";
    state.currentStats.forEach(s => {
        const opt = document.createElement("option");
        opt.value       = s.key;
        opt.textContent = s.label;
        newSkillStat.appendChild(opt);
    });
}

// ---------------- RENDER DERIVED COMBAT ----------------
// Initiative and Proficiency Bonus are now dynamic combat fields rendered
// by combat.js. This stub satisfies existing registrations in app.js.
export function renderDerivedCombat() {}

// ---------------- RENDER STATS ----------------
export function renderStats() {
    statsContainer.innerHTML = "";

    state.currentStats.forEach((stat, index) => {
        const val  = parseInt(stat.base) || 10;
        const cell = document.createElement("div");
        cell.className = "stat";

        cell.innerHTML = `
            <label>${stat.label || "STAT"}</label>
            <input type="number" value="${val}">
            <div class="modifier">${formatMod(val)}</div>
            <button class="stat-delete">✕</button>
        `;

        const input     = cell.querySelector("input");
        const modDiv    = cell.querySelector(".modifier");
        const deleteBtn = cell.querySelector(".stat-delete");

        input.oninput = () => {
            state.currentStats[index].base = parseInt(input.value) || 10;
            modDiv.textContent = formatMod(state.currentStats[index].base);
            _renderSkills();
            _renderPassives();
            debouncedSave();
        };

        deleteBtn.onclick = () => {
            state.currentStats.splice(index, 1);
            rerenderAll();
            debouncedSave();
        };

        statsContainer.appendChild(cell);
    });

    updateSkillStatDropdown();
    // Keep the combat-field add-row stat dropdown in sync
    import("./combat.js").then(m => m.updateCombatStatDropdown());
}

// ---------------- ADD STAT ----------------
export function initAddStat(addStatButtonEl) {
    addStatButtonEl.onclick = () => {
        const raw = newStatName.value.trim();
        if (!raw) return;

        const label = raw.toUpperCase().slice(0, 6);
        const key   = raw.toLowerCase().replace(/\s+/g, "_").slice(0, 20);

        if (state.currentStats.some(s => s.key === key)) {
            alert(`A stat with the key "${key}" already exists.`);
            return;
        }

        state.currentStats.push({ key, label, base: 10 });
        newStatName.value = "";
        rerenderAll();
        debouncedSave();
    };
}
