// ---------------- UTIL ----------------
export function debounce(fn, delay = 500) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

// ---------------- DOM REFERENCES ----------------
export const emailInput         = document.getElementById("emailInput");
export const passwordInput      = document.getElementById("passwordInput");
export const signUpButton       = document.getElementById("signUpButton");
export const signInButton       = document.getElementById("signInButton");
export const signOutButton      = document.getElementById("signOutButton");
export const userStatus         = document.getElementById("userStatus");

export const authUiDiv          = document.getElementById("auth-ui");
export const appContentDiv      = document.getElementById("app-content");

export const charNameInput      = document.getElementById("charNameInput");
export const createCharButton   = document.getElementById("createCharButton");
export const characterList      = document.getElementById("characterList");
export const characterListView  = document.getElementById("characterListView");

export const editor             = document.getElementById("editor");
export const editorTitle        = document.getElementById("editorTitle");
export const editName           = document.getElementById("editName");
export const editRace           = document.getElementById("editRace");
export const editClass          = document.getElementById("editClass");
export const editLevel          = document.getElementById("editLevel");

export const editHPCurrent      = document.getElementById("editHPCurrent");
export const editHPMax          = document.getElementById("editHPMax");
export const editTempHP         = document.getElementById("editTempHP");

export const statsContainer     = document.getElementById("statsContainer");
export const newStatName        = document.getElementById("newStatName");
export const addStatButton      = document.getElementById("addStatButton");

export const skillsContainer    = document.getElementById("skillsContainer");
export const newSkillName       = document.getElementById("newSkillName");
export const newSkillStat       = document.getElementById("newSkillStat");
export const addSkillButton     = document.getElementById("addSkillButton");

export const inventoryContainer = document.getElementById("inventoryContainer");
export const newItemName        = document.getElementById("newItemName");
export const newItemType        = document.getElementById("newItemType");
export const addItemButton      = document.getElementById("addItemButton");

export const savingThrowsDiv    = document.getElementById("savingThrows");
export const editInspiration    = document.getElementById("editInspiration");

export const backButton         = document.getElementById("backButton");

// ---------------- RERENDER REGISTRY ----------------
// Individual render functions are registered here by their modules
// to avoid circular imports. app.js calls registerRenderer() after
// all modules have registered their render functions.
const _renderers     = [];
const _postRenderers = [];  // hooks that run after all renderers (e.g. auto-tests)

export function registerRenderer(fn) {
    _renderers.push(fn);
}

export function registerPostRenderer(fn) {
    _postRenderers.push(fn);
}

export function rerenderAll() {
    _renderers.forEach(fn => fn());
    _postRenderers.forEach(fn => fn());
}
