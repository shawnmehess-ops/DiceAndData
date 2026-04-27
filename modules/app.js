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
import { initTests, runAllTests,
         shouldAutoRunTests }        from "./tests.js";

import { setDebouncedSave as sheetSDS,
         setAfterRender }                from "./sheet.js";
import { setDebouncedSave as charSDS }   from "./character.js";
import { setDebouncedSave as invSDS }    from "./inventory.js";
import { setDebouncedSave as shopSDS }   from "./shop.js";
import { setDebouncedSave as spellsSDS } from "./spells.js";
import { setDebouncedSave as sbSDS }     from "./spellbook.js";
import { setDebouncedSave as classSDS,
         renderClassPanel }              from "./classes.js";
import { setDebouncedSave as raceSDS }  from "./races.js";
import { setDebouncedSave as bgSDS }    from "./backgrounds.js";
import { setDebouncedSave as restSDS,
         initRests }                     from "./rests.js";

import { initShop }        from "./shop.js";
import { initAdmin }       from "./admin.js";
import { initSpellModal }  from "./spells.js";

// ---- Debounced save ----------------------------------------
const debouncedSave = debounce(saveCharacter);
sheetSDS(debouncedSave);
charSDS(debouncedSave);
invSDS(debouncedSave);
shopSDS(debouncedSave);
spellsSDS(debouncedSave);
sbSDS(debouncedSave);
classSDS(debouncedSave);
raceSDS(debouncedSave);
bgSDS(debouncedSave);

setAfterRender(() => {
    if (shouldAutoRunTests()) runAllTests();
});

// ---- Init --------------------------------------------------
initCreateChar();
initAddItem();
initTests();
initAuth();
initShop();
initAdmin();
initSpellModal();
initRests();
restSDS(debouncedSave);

// ---- Navigation --------------------------------------------
backButton.onclick = () => {
    editor.style.display            = "none";
    characterListView.style.display = "block";
};
