import { state, DEFAULT_STATS }  from "./state.js";
import { skillsContainer, newSkillName, newSkillStat, addSkillButton,
         savingThrowsDiv, editLevel }        from "./ui.js";
import { rerenderAll }                       from "./ui.js";
import { getModifier, getStatValue, getProfBonus,
         profBonusForLevel, currentLevel,
         formatMod }                         from "./stats.js";

// debouncedSave injected by app.js
let debouncedSave = () => {};
export function setDebouncedSave(fn) { debouncedSave = fn; }

// ---------------- SAVING THROWS ----------------
export function getSavingThrow(statKey) {
    const mod  = getModifier(getStatValue(statKey));
    const prof = state.currentSavingThrows[statKey] ? getProfBonus(currentLevel()) : 0;
    return mod + prof;
}

export function renderSavingThrows() {
    savingThrowsDiv.innerHTML = "";

    DEFAULT_STATS.forEach(stat => {
        const total     = getSavingThrow(stat.key);
        const formatted = total >= 0 ? `+${total}` : `${total}`;
        const isProf    = !!state.currentSavingThrows[stat.key];

        const row = document.createElement("div");
        row.className = "save-row";
        row.innerHTML = `
            <label class="save-prof-label">
                <input type="checkbox" class="save-prof-check" data-key="${stat.key}" ${isProf ? "checked" : ""}>
                <span>${stat.label}</span>
            </label>
            <span class="save-total">${formatted}</span>
        `;

        row.querySelector(".save-prof-check").onchange = (e) => {
            state.currentSavingThrows[stat.key] = e.target.checked;
            rerenderAll();
            debouncedSave();
        };

        savingThrowsDiv.appendChild(row);
    });
}

// ---------------- PASSIVES ----------------
// getPassiveScore is kept as a utility used by combat.js
export function getPassiveScore(statKey, skillName) {
    const statMod = getModifier(getStatValue(statKey));
    const skill   = state.currentSkills.find(s => s.name === skillName);
    const prof    = skill ? profBonusForLevel(skill.profLevel) : 0;
    return 10 + statMod + prof;
}

// renderPassives is now handled by combat.js (dynamic passive scores)
// This stub keeps app.js registration working during the transition
export function renderPassives() {}

// ---------------- RENDER SKILLS ----------------
export function renderSkills() {
    skillsContainer.innerHTML = "";

    state.currentSkills.forEach((skill, index) => {
        const statVal   = getStatValue(skill.stat);
        const total     = getModifier(statVal) + profBonusForLevel(skill.profLevel);
        const statEntry = state.currentStats.find(s => s.key === skill.stat);
        const statLabel = statEntry ? statEntry.label : skill.stat.toUpperCase();

        const row = document.createElement("div");
        row.className = "skill";

        row.innerHTML = `
            <span class="skill-name">${skill.name} (${statLabel})</span>
            <div class="prof-group">
                <label><input type="radio" name="prof-${index}" value="0" ${skill.profLevel === 0 ? "checked" : ""}></label>
                <label><input type="radio" name="prof-${index}" value="1" ${skill.profLevel === 1 ? "checked" : ""}></label>
                <label><input type="radio" name="prof-${index}" value="2" ${skill.profLevel === 2 ? "checked" : ""}></label>
                <label><input type="radio" name="prof-${index}" value="3" ${skill.profLevel === 3 ? "checked" : ""}></label>
            </div>
            <span class="skill-total">${total >= 0 ? "+" + total : total}</span>
            <button class="skill-delete">✕</button>
        `;

        row.querySelectorAll("input[type=radio]").forEach(radio => {
            radio.onchange = () => {
                state.currentSkills[index].profLevel = parseInt(radio.value);
                renderSkills();
                renderPassives();
                debouncedSave();
            };
        });

        row.querySelector(".skill-delete").onclick = () => {
            state.currentSkills.splice(index, 1);
            renderSkills();
            renderPassives();
            debouncedSave();
        };

        skillsContainer.appendChild(row);
    });

    // Keep passive score skill datalist in sync
    import("./combat.js").then(m => m.updatePassiveSkillList());
}

// ---------------- DEATH SAVES ----------------
export function renderDeathSaves() {
    ["success", "failure"].forEach(type => {
        const containerId = type === "success" ? "deathSaveSuccesses" : "deathSaveFailures";
        const container   = document.getElementById(containerId);
        if (!container) return;
        container.querySelectorAll(".death-save-check").forEach((cb, i) => {
            cb.checked = state.currentDeathSaves[type][i] ?? false;
        });
    });
}

// ---------------- ADD SKILL ----------------
export function initAddSkill() {
    addSkillButton.onclick = () => {
        const name = newSkillName.value.trim();
        const stat = newSkillStat.value;
        if (!name || !stat) return;

        state.currentSkills.push({ name, stat, profLevel: 0 });
        newSkillName.value = "";
        rerenderAll();
        debouncedSave();
    };
}

// ---------------- LEVEL CHANGE ----------------
export function initLevelListener(renderDerivedCombatFn) {
    editLevel.oninput = () => {
        renderDerivedCombatFn();
        renderSavingThrows();
        debouncedSave();
    };
}

// ---------------- DEATH SAVE LISTENERS ----------------
export function initDeathSaveListeners() {
    document.querySelectorAll(".death-save-check").forEach(cb => {
        cb.onchange = () => {
            const type  = cb.dataset.type;
            const index = parseInt(cb.dataset.index);
            state.currentDeathSaves[type][index] = cb.checked;
            debouncedSave();
        };
    });
}
