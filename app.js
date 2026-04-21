import { debounce, registerRenderer,
         editInspiration, editLevel,
         backButton, characterListView, editor,
         addStatButton }              from "./ui.js";

import { saveCharacter,
         initCreateChar }             from "./character.js";

import { renderStats, renderDerivedCombat,
         setDebouncedSave as statsSDS,
         setSkillRenderers,
         initAddStat }                from "./stats.js";

import { renderSkills, renderSavingThrows,
         renderPassives, renderDeathSaves,
         initAddSkill, initLevelListener,
         initDeathSaveListeners,
         setDebouncedSave as skillsSDS } from "./skills.js";

import { renderInventory, initAddItem,
         setDebouncedSave as invSDS } from "./inventory.js";

import { setDebouncedSave as charSDS } from "./character.js";

import { initAuth }                   from "./auth.js";
import { initTests }                  from "./tests.js";

// ---------------- DEBOUNCED SAVE ----------------
const debouncedSave = debounce(saveCharacter);

// Inject debouncedSave into every module that needs it
statsSDS(debouncedSave);
skillsSDS(debouncedSave);
invSDS(debouncedSave);
charSDS(debouncedSave);

// Inject skill renderers into stats to avoid circular imports
// (stat oninput must call renderSkills + renderPassives without importing skills.js)
setSkillRenderers(renderSkills, renderPassives);

// ---------------- REGISTER RENDERERS ----------------
// Order matches original rerenderAll() call order exactly
registerRenderer(renderStats);
registerRenderer(renderSkills);
registerRenderer(renderSavingThrows);
registerRenderer(renderPassives);
registerRenderer(renderDerivedCombat);
registerRenderer(renderDeathSaves);
registerRenderer(renderInventory);

// ---------------- INIT EVENT WIRING ----------------
initCreateChar();
initAddStat(addStatButton);
initAddSkill();
initAddItem();
initLevelListener(renderDerivedCombat);
initDeathSaveListeners();
initTests();
initAuth();  // last — triggers onAuthStateChanged which calls loadCharacters

// ---------------- BASIC FIELD AUTOSAVE ----------------
editInspiration.onchange = () => debouncedSave();

// ---------------- NAVIGATION ----------------
backButton.onclick = () => {
    editor.style.display            = "none";
    characterListView.style.display = "block";
};
