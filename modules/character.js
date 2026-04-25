// ============================================================
// CHARACTER.JS - Firestore CRUD, character load/save
// ============================================================
import {
    doc, setDoc, getDocs, addDoc, collection, deleteDoc
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

import { auth, db }              from "./firebase.js";
import { state, DEFAULT_ITEMS }  from "./state.js";
import { cloneSchema }           from "./schema.js";
import {
    charNameInput, characterList, characterListView,
    editor
} from "./ui.js";
import { renderSheet }           from "./sheet.js";
import { renderInventory }       from "./inventory.js";
import { renderSpellbook }       from "./spellbook.js";
import { defaultSpellSlots }     from "./state.js";

let debouncedSave = () => {};
export function setDebouncedSave(fn) { debouncedSave = fn; }

function cloneDefaultItems() {
    return JSON.parse(JSON.stringify(DEFAULT_ITEMS));
}

// ---- SAVE --------------------------------------------------
export async function saveCharacter() {
    const user = auth.currentUser;
    if (!user || !state.currentCharId) return;

    await setDoc(doc(db, "users", user.uid, "characters", state.currentCharId), {
        blocks:      state.blocks,
        items:       state.items,
        spells:      state.spells,
        spellSlots:  state.spellSlots,
    }, { merge: true });
}

// ---- CREATE ------------------------------------------------
export function initCreateChar() {
    document.getElementById("createCharButton").onclick = async () => {
        const user = auth.currentUser;
        if (!user) return;

        const name = charNameInput.value.trim();
        if (!name) return;

        const blocks = cloneSchema();
        const nameField = blocks.flatMap(b => b.fields).find(f => f.id === "f_name");
        if (nameField) nameField.value = name;

        await addDoc(collection(db, "users", user.uid, "characters"), {
            blocks,
            items: cloneDefaultItems(),
            createdAt: Date.now()
        });

        charNameInput.value = "";
        loadCharacters();
    };
}

// ---- LOAD LIST ---------------------------------------------
export async function loadCharacters() {
    const user = auth.currentUser;
    if (!user) return;

    const snap = await getDocs(collection(db, "users", user.uid, "characters"));
    characterList.innerHTML = "";

    snap.forEach(docSnap => {
        const data = docSnap.data();
        const id   = docSnap.id;

        const allFields = (data.blocks ?? []).flatMap(b => b.fields ?? []);
        const get = (fid) => allFields.find(f => f.id === fid)?.value ?? "";

        const name  = get("f_name") || "Unnamed";
        const race  = get("f_race") || "";
        const cls   = get("f_class") || "";
        const level = get("f_level") || 1;

        const card = document.createElement("div");
        card.className = "char-card";

        const crest = document.createElement("div");
        crest.className = "char-card-crest";
        crest.textContent = (name.trim()[0] || "?").toUpperCase();
        crest.onclick = () => openCharacter(id, data);

        const info = document.createElement("div");
        info.className = "char-card-info";
        info.onclick = () => openCharacter(id, data);
        const meta = [race, cls].filter(Boolean).join(" - ");
        info.innerHTML = `
            <div class="char-card-name">${name}</div>
            <div class="char-card-meta">Level ${level}${meta ? " - " + meta : ""}</div>
        `;

        const footer = document.createElement("div");
        footer.className = "char-card-footer";
        const delBtn = document.createElement("button");
        delBtn.className = "char-card-delete";
        delBtn.textContent = "Delete";
        delBtn.onclick = async e => {
            e.stopPropagation();
            if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
            await deleteDoc(doc(db, "users", user.uid, "characters", id));
            loadCharacters();
        };

        footer.appendChild(delBtn);
        card.appendChild(crest);
        card.appendChild(info);
        card.appendChild(footer);
        characterList.appendChild(card);
    });
}

// ---- OPEN --------------------------------------------------
export function openCharacter(id, data) {
    state.currentCharId = id;
    state.blocks = data.blocks && data.blocks.length
        ? JSON.parse(JSON.stringify(data.blocks))
        : cloneSchema();
    state.items = Array.isArray(data.items)
        ? JSON.parse(JSON.stringify(data.items))
        : cloneDefaultItems();

    state.spells = Array.isArray(data.spells)
        ? JSON.parse(JSON.stringify(data.spells))
        : [];

    state.spellSlots = (data.spellSlots && typeof data.spellSlots === "object")
        ? JSON.parse(JSON.stringify(data.spellSlots))
        : defaultSpellSlots();

    characterListView.style.display = "none";
    editor.style.display = "block";

    const nameField = state.blocks.flatMap(b => b.fields).find(f => f.id === "f_name");
    const titleEl = document.getElementById("editorTitle");
    if (titleEl) titleEl.textContent = nameField?.value || "Character Sheet";

    renderSheet();
    renderInventory();
    renderSpellbook();
}
