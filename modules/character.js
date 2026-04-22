import {
    doc, setDoc, getDocs, addDoc, collection, deleteDoc
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

import { auth, db }                from "./firebase.js";
import { state, DEFAULT_STATS, DEFAULT_SKILLS, DEFAULT_ITEMS } from "./state.js";
import {
    characterList, characterListView, charNameInput,
    editor, editName, editRace, editClass, editLevel,
    editAC, editHPCurrent, editHPMax, editTempHP,
    editInspiration, editHeroPoints
} from "./ui.js";
import { rerenderAll }             from "./ui.js";

// debouncedSave injected by app.js
let debouncedSave = () => {};
export function setDebouncedSave(fn) { debouncedSave = fn; }

// ---------------- SAVE ----------------
export async function saveCharacter() {
    const user = auth.currentUser;
    if (!user || !state.currentCharId) return;

    await setDoc(doc(db, "users", user.uid, "characters", state.currentCharId), {
        name:       editName.value,
        race:       editRace.value,
        class:      editClass.value,
        level:      parseInt(editLevel.value) || 1,
        ac:         parseInt(editAC.value) || 10,
        hp: {
            current: parseInt(editHPCurrent.value) || 0,
            max:     parseInt(editHPMax.value) || 0,
            temp:    parseInt(editTempHP.value) || 0
        },
        inspiration: editInspiration.checked,
        heroPoints:  parseInt(editHeroPoints.value) || 0,
        stats:       state.currentStats,
        skills:      state.currentSkills,
        savingThrows: state.currentSavingThrows,
        deathSaves:   state.currentDeathSaves,
        items:        state.currentItems
    }, { merge: true });
}

// ---------------- CREATE CHARACTER ----------------
export function initCreateChar() {
    document.getElementById("createCharButton").onclick = async () => {
        const user = auth.currentUser;
        if (!user) return;

        const name = charNameInput.value.trim();
        if (!name) return;

        await addDoc(collection(db, "users", user.uid, "characters"), {
            name,
            class: "Unknown",
            level: 1,
            stats:  JSON.parse(JSON.stringify(DEFAULT_STATS)),
            skills: JSON.parse(JSON.stringify(DEFAULT_SKILLS)),
            items:  JSON.parse(JSON.stringify(DEFAULT_ITEMS)),
            createdAt: Date.now()
        });

        charNameInput.value = "";
        loadCharacters();
    };
}

// ---------------- LOAD CHARACTERS ----------------
export async function loadCharacters() {
    const user = auth.currentUser;
    if (!user) return;

    const snap = await getDocs(collection(db, "users", user.uid, "characters"));
    characterList.innerHTML = "";

    snap.forEach(docSnap => {
        const data = docSnap.data();
        const id   = docSnap.id;

        const card = document.createElement("div");
        card.className = "char-card";

        // Portrait area
        const portrait = document.createElement("div");
        portrait.className = "char-card-portrait";

        const portraitKey   = `portrait_${id}`;
        const savedPortrait = localStorage.getItem(portraitKey);

        if (savedPortrait) {
            const img = document.createElement("img");
            img.src = savedPortrait;
            portrait.appendChild(img);
        } else {
            portrait.innerHTML = `
                <div class="portrait-placeholder">
                    <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="40" cy="28" r="14" />
                        <ellipse cx="40" cy="62" rx="22" ry="14" />
                    </svg>
                    <span>Portrait</span>
                </div>`;
        }

        // Upload overlay
        const uploadLabel = document.createElement("label");
        uploadLabel.className = "char-card-portrait-upload";
        uploadLabel.textContent = "📷 Upload";
        uploadLabel.title = "Upload portrait";

        const fileInput = document.createElement("input");
        fileInput.type    = "file";
        fileInput.accept  = "image/*";
        fileInput.onclick = e => e.stopPropagation();
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

        portrait.onclick = (e) => {
            if (e.target === fileInput || uploadLabel.contains(e.target)) return;
            openCharacter(id, data);
        };

        // Info block
        const info = document.createElement("div");
        info.className = "char-card-info";
        info.onclick = () => openCharacter(id, data);

        const racePart  = data.race  ? ` · ${data.race}`  : "";
        const classPart = data.class ? ` · ${data.class}` : "";

        info.innerHTML = `
            <div class="char-card-name">${data.name || "Unnamed"}</div>
            <div class="char-card-meta">
                Level ${data.level ?? 1}${racePart}${classPart}
            </div>
        `;

        // Footer with delete
        const footer = document.createElement("div");
        footer.className = "char-card-footer";

        const delBtn = document.createElement("button");
        delBtn.className   = "char-card-delete";
        delBtn.textContent = "Delete";
        delBtn.onclick = async (e) => {
            e.stopPropagation();
            if (!confirm(`Delete "${data.name || "this character"}"? This cannot be undone.`)) return;
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

// ---------------- OPEN CHARACTER ----------------
export function openCharacter(id, data) {
    state.currentCharId = id;

    characterListView.style.display = "none";
    editor.style.display = "block";

    editName.value  = data.name  ?? "";
    editRace.value  = data.race  ?? "";
    editClass.value = data.class ?? "";
    editLevel.value = data.level ?? 1;

    editAC.value            = data.ac ?? 10;
    editHPCurrent.value     = data.hp?.current ?? 0;
    editHPMax.value         = data.hp?.max ?? 0;
    editTempHP.value        = data.hp?.temp ?? 0;
    editInspiration.checked = !!data.inspiration;
    editHeroPoints.value    = data.heroPoints ?? 0;

    state.currentStats = Array.isArray(data.stats) && data.stats.length
        ? JSON.parse(JSON.stringify(data.stats))
        : DEFAULT_STATS.map(s => ({ ...s, base: data.attributes?.[s.key]?.base ?? 10 }));

    state.currentSkills = (data.skills ?? []).map(s => ({
        name:      s.name,
        stat:      s.stat,
        profLevel: typeof s.proficient === "boolean" ? (s.proficient ? 2 : 0) : (s.profLevel ?? 0)
    }));

    state.currentSavingThrows = {
        str: !!data.savingThrows?.str,
        dex: !!data.savingThrows?.dex,
        con: !!data.savingThrows?.con,
        int: !!data.savingThrows?.int,
        wis: !!data.savingThrows?.wis,
        cha: !!data.savingThrows?.cha
    };

    state.currentDeathSaves = {
        success: [0, 1, 2].map(i => !!(data.deathSaves?.success?.[i])),
        failure: [0, 1, 2].map(i => !!(data.deathSaves?.failure?.[i]))
    };

    state.currentItems = data.items || [];

    rerenderAll();
}
