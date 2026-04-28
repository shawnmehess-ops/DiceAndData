// ============================================================
// RESTS.JS — Short rest and Long rest mechanics
//
// Long rest restores:
//   • All spell slots
//   • Current HP to max HP
//   • Removes temp HP
//   • Clears death save checkboxes
//   • Resets inspiration
//
// Short rest restores:
//   • Warlock spell slots (they use pact magic — all slots back)
//   • Hit dice spending (we prompt for how many to spend)
//   • Does NOT restore wizard/druid/cleric spell slots
// ============================================================

import { state, getFieldById } from "./state.js";
import { registry }             from "./registry.js";
import { renderSpellbook }     from "./spellbook.js";
import { renderSheet }         from "./sheet.js";
import { getClassData }        from "./classes.js";

let debouncedSave = () => {};
export function setDebouncedSave(fn) { debouncedSave = fn; }

// ---- Shared: restore all spell slots -----------------------
function _restoreAllSlots() {
    for (const lvl of Object.keys(state.spellSlots)) {
        state.spellSlots[lvl].used = 0;
    }
}

// ---- Shared: restore warlock slots (short rest) ------------
function _restoreWarlockSlots() {
    for (const lvl of Object.keys(state.spellSlots)) {
        state.spellSlots[lvl].used = 0;
    }
}

// ---- Long Rest ---------------------------------------------
export function longRest() {
    const cd    = getClassData();
    const level = parseInt(getFieldById("f_level")?.value) || 1;

    // Restore all spell slots
    _restoreAllSlots();

    // Restore HP to max
    const hpMax = getFieldById("f_hp_max");
    const hpCur = getFieldById("f_hp_cur");
    const hpTmp = getFieldById("f_hp_tmp");
    if (hpMax && hpCur) hpCur.value = hpMax.value;
    if (hpTmp)          hpTmp.value = 0;

    // Clear death saves
    const dsSuccess = getFieldById("f_ds_success");
    const dsFailure = getFieldById("f_ds_failure");
    if (dsSuccess?.values) dsSuccess.values = dsSuccess.values.map(() => false);
    if (dsFailure?.values) dsFailure.values = dsFailure.values.map(() => false);

    // Clear inspiration (reset to 0)
    const insp = getFieldById("f_insp");
    if (insp?.values) insp.values = insp.values.map(() => false);

    // Reset short rest counter
    if (!state.restData) state.restData = { shortRestsUsed: 0 };
    state.restData.shortRestsUsed = 0;
    _updateShortRestPips();

    renderSpellbook();
    renderSheet();
    debouncedSave();

    _flashRestBanner("Long Rest complete — HP restored, all spell slots recovered, short rests reset.", "long");
}

// ---- Short Rest --------------------------------------------
const MAX_SHORT_RESTS = 2;

export function shortRest() {
    if (!state.restData) state.restData = { shortRestsUsed: 0 };
    if (state.restData.shortRestsUsed >= MAX_SHORT_RESTS) {
        _flashRestBanner("No short rests remaining — take a long rest first.", "blocked");
        return;
    }

    const cd = getClassData();

    // Warlocks recover all spell slots on a short rest
    const isWarlock = cd?.classId === "warlock";
    if (isWarlock) _restoreWarlockSlots();

    // Prompt for hit dice to spend
    const level  = parseInt(getFieldById("f_level")?.value) || 1;
    const hpMax  = parseInt(getFieldById("f_hp_max")?.value) || 0;
    const hpCur  = parseInt(getFieldById("f_hp_cur")?.value) || 0;
    const conMod = Math.floor(((parseInt(getFieldById("f_con")?.value) || 10) - 10) / 2);

    if (hpCur < hpMax) {
        const HIT_DICE = {
            barbarian:8, bard:8, cleric:8, druid:8, fighter:10,
            monk:8, paladin:10, ranger:10, rogue:8, sorcerer:6,
            warlock:8, wizard:6,
        };
        const hitDie = HIT_DICE[cd?.classId] ?? 8;
        const dice   = parseInt(prompt(
            `Short Rest — Spend Hit Dice (d${hitDie})\n\nYou have up to ${level} hit dice available.\nHow many d${hitDie}s do you want to spend? (0–${level})`,
            "1"
        ));
        if (!isNaN(dice) && dice > 0) {
            const clampedDice = Math.min(dice, level);
            const hpGained = clampedDice * (Math.floor(hitDie / 2) + 1 + conMod);
            const hpField  = getFieldById("f_hp_cur");
            if (hpField) hpField.value = Math.min(hpMax, hpCur + Math.max(1, hpGained));
        }
    }

    state.restData.shortRestsUsed++;
    _updateShortRestPips();

    renderSpellbook();
    renderSheet();
    debouncedSave();

    const remaining = MAX_SHORT_RESTS - state.restData.shortRestsUsed;
    const msg = isWarlock
        ? `Short Rest complete — Pact Magic slots recovered. HP rolled. (${remaining} rest${remaining !== 1 ? "s" : ""} remaining)`
        : `Short Rest complete — HP rolled. (${remaining} rest${remaining !== 1 ? "s" : ""} remaining)`;
    _flashRestBanner(msg, "short");
}

// ---- Suggest Max HP ----------------------------------------
// Uses class hit die + CON modifier × level (taking average per level)
export function suggestHP() {
    const cd     = getClassData();
    const level  = parseInt(getFieldById("f_level")?.value) || 1;
    const conMod = Math.floor(((parseInt(getFieldById("f_con")?.value) || 10) - 10) / 2);

    const HIT_DICE = {
        barbarian:12, bard:8, cleric:8, druid:8, fighter:10,
        monk:8, paladin:10, ranger:10, rogue:8, sorcerer:6,
        warlock:8, wizard:6,
    };
    const hitDie     = HIT_DICE[cd?.classId] ?? 8;
    const avgPerLevel = Math.floor(hitDie / 2) + 1;

    // Level 1: max hit die + CON mod
    // Level 2+: avg per level + CON mod per additional level
    const suggested = (hitDie + conMod) + (level - 1) * (avgPerLevel + conMod);
    const hpField   = getFieldById("f_hp_max");
    if (hpField) {
        hpField.value = Math.max(1, suggested);
        renderSheet();
        debouncedSave();
    }
}

// ---- Short rest pip indicator -----------------------------
function _updateShortRestPips() {
    const el = document.getElementById("shortRestPips");
    if (!el) return;
    const used = state.restData?.shortRestsUsed ?? 0;
    el.innerHTML = "";
    for (let i = 0; i < MAX_SHORT_RESTS; i++) {
        const pip = document.createElement("span");
        pip.className = `rest-pip${i < used ? " rest-pip--used" : ""}`;
        pip.title     = i < used ? "Short rest used" : "Short rest available";
        el.appendChild(pip);
    }
    // Dim the button itself when exhausted
    const btn = document.getElementById("shortRestBtn");
    if (btn) btn.disabled = used >= MAX_SHORT_RESTS;
}

// ---- Banner flash ------------------------------------------
function _flashRestBanner(message, type) {
    let banner = document.getElementById("restBanner");
    if (!banner) {
        banner = document.createElement("div");
        banner.id = "restBanner";
        banner.className = "rest-banner";
        document.body.appendChild(banner);
    }
    banner.textContent = message;
    banner.className   = `rest-banner rest-banner--${type} rest-banner--visible`;
    clearTimeout(banner._hideTimeout);
    banner._hideTimeout = setTimeout(() => {
        banner.classList.remove("rest-banner--visible");
    }, 3200);
}

// ---- Init --------------------------------------------------
export function updateShortRestPips() { _updateShortRestPips(); }
export function initRests() {
    document.getElementById("shortRestBtn")
        ?.addEventListener("click", shortRest);
    document.getElementById("longRestBtn")
        ?.addEventListener("click", longRest);
    document.getElementById("suggestHPBtn")
        ?.addEventListener("click", suggestHP);
    _updateShortRestPips();
    registry.set("updateShortRestPips", _updateShortRestPips);
}