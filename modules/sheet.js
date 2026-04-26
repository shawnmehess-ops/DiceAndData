// ============================================================
// SHEET.JS - Block rendering and sheet orchestration
// ============================================================
import { state } from "./state.js";
import { renderFeatsOnSheet } from "./classes.js";
import { renderField, refreshComputedDisplays } from "./fields.js";

let debouncedSave = () => {};
let afterRender = () => {};
export function setDebouncedSave(fn) { debouncedSave = fn; }
export function setAfterRender(fn) { afterRender = fn; }

// Return the column count that produces the most balanced rows for n items.
// e.g. n=6 → 3 (3+3), n=5 → 3 (3+2), n=4 → 4 (4), n=7 → 4 (4+3), n=18 → 6 (6+6+6)
function balancedCols(n) {
    if (n <= 0) return 1;
    const MAX_COLS = 6;   // never wider than 6
    const MIN_COLS = 2;   // never narrower than 2 (single items stay single)
    if (n <= MAX_COLS) return n; // fits in one row — use exact count

    let bestCols  = MAX_COLS;
    let bestScore = Infinity;

    for (let cols = MIN_COLS; cols <= MAX_COLS; cols++) {
        const rows     = Math.ceil(n / cols);
        const lastRow  = n - (rows - 1) * cols;   // items on the final row
        const gap      = cols - lastRow;           // how many cells are "missing"
        // Prefer: smallest gap, then fewest rows, then more cols
        const score    = gap * 1000 + rows * 10 - cols;
        if (score < bestScore) { bestScore = score; bestCols = cols; }
    }
    return bestCols;
}

function renderBlock(block) {
    const section = document.createElement("div");
    section.className = "sheet-section";
    section.dataset.blockId = block.id;

    const h3 = document.createElement("h3");
    h3.textContent = block.label;
    section.appendChild(h3);

    const fieldWrap = document.createElement("div");
    const hasStat = block.fields.some(f => f.type === "flat" || f.type === "computed");
    const hasText = block.fields.some(f => f.type === "text");

    // Skills always render as a compact list — too many fields for a grid.
    // Saving throws are forced to exactly 3 columns so they never overflow.
    const forceList = block.id === "block_skills";
    const forceCols = block.id === "block_saves" ? 3 : null;

    if (!forceList && hasStat && !hasText) {
        fieldWrap.className = "fields-grid";
        const cols = forceCols ?? balancedCols(block.fields.length);
        fieldWrap.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        fieldWrap.style.justifyItems = "stretch";
    } else {
        fieldWrap.className = forceList ? "fields-list fields-list--skills" : "fields-list";
    }

    block.fields.forEach(field => {
        const el = renderField(field, () => {
            refreshComputedDisplays();
            debouncedSave();
        });
        el.dataset.fieldId = field.id;
        fieldWrap.appendChild(el);
    });

    section.appendChild(fieldWrap);
    return section;
}

export function renderSheet() {
    const container = document.getElementById("sheetBlocks");
    if (!container) return;
    container.innerHTML = "";

    state.blocks.forEach(block => {
        container.appendChild(renderBlock(block));
        const div = document.createElement("div");
        div.className = "section-divider";
        div.setAttribute("aria-hidden", "true");
        container.appendChild(div);
    });

    const last = container.lastElementChild;
    if (last?.className === "section-divider") container.removeChild(last);

    // Feats live on the sheet tab but are driven by classData
    renderFeatsOnSheet();
    afterRender();
}
