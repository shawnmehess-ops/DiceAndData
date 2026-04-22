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

import { renderCombatFields, renderPassives as renderPassiveScores,
         initAddCombatField, initAddPassive,
         setDebouncedSave as combatSDS } from "./combat.js";

import { initAuth }                   from "./auth.js";
import { initTests }                  from "./tests.js";

// ---------------- DEBOUNCED SAVE ----------------
const debouncedSave = debounce(saveCharacter);

statsSDS(debouncedSave);
skillsSDS(debouncedSave);
invSDS(debouncedSave);
charSDS(debouncedSave);
combatSDS(debouncedSave);

setSkillRenderers(renderSkills, renderPassiveScores);

// ---------------- REGISTER RENDERERS ----------------
registerRenderer(renderStats);
registerRenderer(renderSkills);
registerRenderer(renderSavingThrows);
registerRenderer(renderPassives);       // stub — keeps tests happy
registerRenderer(renderPassiveScores);  // actual dynamic passive render
registerRenderer(renderDerivedCombat);  // stub
registerRenderer(renderCombatFields);   // actual dynamic combat render
registerRenderer(renderDeathSaves);
registerRenderer(renderInventory);

// ---------------- INIT EVENT WIRING ----------------
initCreateChar();
initAddStat(addStatButton);
initAddSkill();
initAddItem();
initAddCombatField();
initAddPassive();
initLevelListener(renderCombatFields);
initDeathSaveListeners();
initTests();
initAuth();

// ---------------- BASIC FIELD AUTOSAVE ----------------
editInspiration.onchange = () => debouncedSave();

// ---------------- NAVIGATION ----------------
backButton.onclick = () => {
    editor.style.display            = "none";
    characterListView.style.display = "block";
};
