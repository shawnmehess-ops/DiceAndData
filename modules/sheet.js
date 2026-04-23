// ============================================================
// SHEET.JS — Block rendering and sheet orchestration
// ============================================================
import { state }                    from "./state.js";
import { renderField, refreshComputedDisplays } from "./fields.js";

let debouncedSave = () => {};
let afterRender = () => {};
export function setDebouncedSave(fn) { debouncedSave = fn; }
export function setAfterRender(fn) { afterRender = fn; }

// ---- Render a single block into #sheetBlocks --------------
function renderBlock(block) {
    const section = document.createElement("div");
    section.className  = "sheet-section";
    section.dataset.blockId = block.id;

    // Header
    const h3 = document.createElement("h3");
    h3.textContent = block.label;
    section.appendChild(h3);

    // Field container — layout class depends on block content
    const fieldWrap = document.createElement("div");
    const hasStat   = block.fields.some(f => f.type === "flat" || f.type === "computed");
    const hasText   = block.fields.some(f => f.type === "text");
    fieldWrap.className = hasStat && !hasText ? "fields-grid" : "fields-list";

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

// ---- Render all blocks ------------------------------------
export function renderSheet() {
    const container = document.getElementById("sheetBlocks");
    if (!container) return;
    container.innerHTML = "";

    state.blocks.forEach(block => {
        container.appendChild(renderBlock(block));
        // Divider between blocks
        const div = document.createElement("img");
        div.src       = "images/HorizontalDivider.png";
        div.className = "section-divider-img";
        div.alt       = "";
        container.appendChild(div);
    });

    // Remove the trailing divider
    const last = container.lastElementChild;
    if (last?.className === "section-divider-img") container.removeChild(last);

    afterRender();
}
