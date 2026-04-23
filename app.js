// ============================================================
// APP.JS — Entry point. Imports modules, wires everything up.
// ============================================================
import { debounce, backButton,
         characterListView, editor } from "./ui.js";

import { saveCharacter,
         initCreateChar }            from "./character.js";

import { renderInventory,
         initAddItem }               from "./inventory.js";

import { initAuth }                  from "./auth.js";
import { initTests, runAllTests }    from "./tests.js";

import { setDebouncedSave as sheetSDS }  from "./sheet.js";
import { setDebouncedSave as charSDS }   from "./character.js";
import { setDebouncedSave as invSDS }    from "./inventory.js";

// ---- Debounced save ----------------------------------------
const debouncedSave = debounce(saveCharacter);
sheetSDS(debouncedSave);
charSDS(debouncedSave);
invSDS(debouncedSave);

// ---- Init --------------------------------------------------
initCreateChar();
initAddItem();
initTests();
initAuth();

// ---- Navigation --------------------------------------------
backButton.onclick = () => {
    editor.style.display            = "none";
    characterListView.style.display = "block";
};
