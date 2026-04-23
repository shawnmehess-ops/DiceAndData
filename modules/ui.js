// ============================================================
// UI.JS — Static DOM refs, debounce, renderer registry
// ============================================================

export function debounce(fn, delay = 500) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

// ---- Auth UI ----
// NOTE: most auth DOM refs are local to auth.js
// Only the always-visible elements that other modules need are exported here
export const signOutButton = document.getElementById("signOutButton");
export const authUiDiv     = document.getElementById("auth-ui");
export const appContentDiv = document.getElementById("app-content");

// ---- Character list ----
export const charNameInput     = document.getElementById("charNameInput");
export const characterList     = document.getElementById("characterList");
export const characterListView = document.getElementById("characterListView");

// ---- Editor shell ----
export const editor     = document.getElementById("editor");
export const backButton = document.getElementById("backButton");

// ---- Inventory add row ----
export const inventoryContainer = document.getElementById("inventoryContainer");
export const newItemName        = document.getElementById("newItemName");
export const newItemType        = document.getElementById("newItemType");
export const addItemButton      = document.getElementById("addItemButton");
