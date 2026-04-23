// ============================================================
// CHARACTER.JS — Firestore CRUD, character load/save
// ============================================================
import {
    doc, setDoc, getDocs, addDoc, collection, deleteDoc
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

import { auth, db }              from "./firebase.js";
import { state, resetState, DEFAULT_ITEMS } from "./state.js";
import { cloneSchema }           from "./schema.js";
import {
    charNameInput, characterList, characterListView,
    editor, editName
} from "./ui.js";
import { renderSheet }           from "./sheet.js";
import { renderInventory }       from "./inventory.js";

let debouncedSave = () => {};
export function setDebouncedSave(fn) { debouncedSave = fn; }

// ---- SAVE --------------------------------------------------
export async function saveCharacter() {
    const user = auth.currentUser;
    if (!user || !state.currentCharId) return;

    await setDoc(doc(db, "users", user.uid, "characters", state.currentCharId), {
        blocks: state.blocks,
        items:  state.items,
    }, { merge: true });
}

// ---- CREATE ------------------------------------------------
export function initCreateChar() {
    document.getElementById("createCharButton").onclick = async () => {
        const user = auth.currentUser;
        if (!user) return;

        const name = charNameInput.value.trim();
        if (!name) return;

        // Stamp the name into the schema before saving
        const blocks = cloneSchema();
        const nameField = blocks.flatMap(b => b.fields).find(f => f.id === "f_name");
        if (nameField) nameField.value = name;

        await addDoc(collection(db, "users", user.uid, "characters"), {
            blocks,
            items: JSON.parse(JSON.stringify(DEFAULT_ITEMS)),
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

        // Pull display fields from stored blocks
        const allFields  = (data.blocks ?? []).flatMap(b => b.fields ?? []);
        const get        = (fid) => allFields.find(f => f.id === fid)?.value ?? "";

        const name  = get("f_name")  || "Unnamed";
        const race  = get("f_race")  || "";
        const cls   = get("f_class") || "";
        const level = get("f_level") || 1;

        const card = document.createElement("div");
        card.className = "char-card";

        // Portrait
        const portrait    = document.createElement("div");
        portrait.className = "char-card-portrait";
        const portraitKey  = `portrait_${id}`;
        const saved        = localStorage.getItem(portraitKey);

        if (saved) {
            const img = document.createElement("img");
            img.src   = saved;
            portrait.appendChild(img);
        } else {
            portrait.innerHTML = `
                <div class="portrait-placeholder">
                    <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="40" cy="28" r="14"/>
                        <ellipse cx="40" cy="62" rx="22" ry="14"/>
                    </svg>
                    <span>Portrait</span>
                </div>`;
        }

        const uploadLabel    = document.createElement("label");
        uploadLabel.className = "char-card-portrait-upload";
        uploadLabel.textContent = "📷 Upload";
        const fileInput = document.createElement("input");
        fileInput.type   = "file";
        fileInput.accept = "image/*";
        fileInput.onclick  = e => e.stopPropagation();
        fileInput.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
                localStorage.setItem(portraitKey, ev.target.result);
                loadCharacters();
            };
            reader.readAsDataURL(file);
        };
        uploadLabel.appendChild(fileInput);
        portrait.appendChild(uploadLabel);
        portrait.onclick = e => {
            if (uploadLabel.contains(e.target)) return;
            openCharacter(id, data);
        };

        // Info
        const info = document.createElement("div");
        info.className = "char-card-info";
        info.onclick   = () => openCharacter(id, data);
        const meta = [race, cls].filter(Boolean).join(" · ");
        info.innerHTML = `
            <div class="char-card-name">${name}</div>
            <div class="char-card-meta">Level ${level}${meta ? " · " + meta : ""}</div>
        `;

        // Footer
        const footer  = document.createElement("div");
        footer.className = "char-card-footer";
        const delBtn  = document.createElement("button");
        delBtn.className   = "char-card-delete";
        delBtn.textContent = "Delete";
        delBtn.onclick = async e => {
            e.stopPropagation();
            if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
            await deleteDoc(doc(db, "users", user.uid, "characters", id));
            localStorage.removeItem(portraitKey);
            loadCharacters();
        };

        footer.appendChild(delBtn);
        card.appendChild(portrait);
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
    state.items  = data.items ?? [];

    characterListView.style.display = "none";
    editor.style.display            = "block";

    // Update sheet title from name field
    const nameField = state.blocks.flatMap(b => b.fields).find(f => f.id === "f_name");
    const titleEl   = document.getElementById("editorTitle");
    if (titleEl) titleEl.textContent = nameField?.value || "Character Sheet";

    renderSheet();
    renderInventory();
}
