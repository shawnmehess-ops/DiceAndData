import {
    getFirestore, doc, setDoc, getDocs, addDoc, collection, deleteDoc
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";

import {
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
    signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";

// ---------------- FIREBASE ----------------
const firebaseConfig = {
    apiKey: "AIzaSyBYYgS04lxcbeawj7WDahEN7SbzYgVGLjE",
    authDomain: "diceanddata-81ebe.firebaseapp.com",
    projectId: "diceanddata-81ebe",
    storageBucket: "diceanddata-81ebe.firebasestorage.app",
    messagingSenderId: "547850961878",
    appId: "1:547850961878:web:8b2a99076d66c0ab451a77",
    measurementId: "G-LSZ59FPDTL"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ---------------- DEFAULTS ----------------
const DEFAULT_STATS = [
    { key: "str", label: "STR", base: 10 },
    { key: "dex", label: "DEX", base: 10 },
    { key: "con", label: "CON", base: 10 },
    { key: "int", label: "INT", base: 10 },
    { key: "wis", label: "WIS", base: 10 },
    { key: "cha", label: "CHA", base: 10 }
];

const DEFAULT_SKILLS = [
    { name: "Acrobatics",     stat: "dex", profLevel: 0 },
    { name: "Animal Handling",stat: "wis", profLevel: 0 },
    { name: "Arcana",         stat: "int", profLevel: 0 },
    { name: "Athletics",      stat: "str", profLevel: 0 },
    { name: "Deception",      stat: "cha", profLevel: 0 },
    { name: "History",        stat: "int", profLevel: 0 },
    { name: "Insight",        stat: "wis", profLevel: 0 },
    { name: "Intimidation",   stat: "cha", profLevel: 0 },
    { name: "Investigation",  stat: "int", profLevel: 0 },
    { name: "Medicine",       stat: "wis", profLevel: 0 },
    { name: "Nature",         stat: "int", profLevel: 0 },
    { name: "Perception",     stat: "wis", profLevel: 0 },
    { name: "Performance",    stat: "cha", profLevel: 0 },
    { name: "Persuasion",     stat: "cha", profLevel: 0 },
    { name: "Religion",       stat: "int", profLevel: 0 },
    { name: "Sleight of Hand",stat: "dex", profLevel: 0 },
    { name: "Stealth",        stat: "dex", profLevel: 0 },
    { name: "Survival",       stat: "wis", profLevel: 0 }
];

// ---------------- STATE ----------------
let currentCharId = null;
let currentStats  = [];
let currentSkills = [];

// ---------------- DOM ----------------
const emailInput         = document.getElementById("emailInput");
const passwordInput      = document.getElementById("passwordInput");
const signUpButton       = document.getElementById("signUpButton");
const signInButton       = document.getElementById("signInButton");
const signOutButton      = document.getElementById("signOutButton");
const userStatus         = document.getElementById("userStatus");

const authUiDiv          = document.getElementById("auth-ui");
const appContentDiv      = document.getElementById("app-content");

const charNameInput      = document.getElementById("charNameInput");
const createCharButton   = document.getElementById("createCharButton");
const characterList      = document.getElementById("characterList");
const characterListView  = document.getElementById("characterListView");

const editor             = document.getElementById("editor");
const editorTitle        = document.getElementById("editorTitle");
const editName           = document.getElementById("editName");
const editClass          = document.getElementById("editClass");
const editLevel          = document.getElementById("editLevel");

const editAC             = document.getElementById("editAC");
const editHPCurrent      = document.getElementById("editHPCurrent");
const editHPMax          = document.getElementById("editHPMax");
const editTempHP         = document.getElementById("editTempHP");
const editHeroPoints     = document.getElementById("editHeroPoints");

const statsContainer     = document.getElementById("statsContainer");
const newStatName        = document.getElementById("newStatName");
const addStatButton      = document.getElementById("addStatButton");

const skillsContainer    = document.getElementById("skillsContainer");
const newSkillName       = document.getElementById("newSkillName");
const newSkillStat       = document.getElementById("newSkillStat");
const addSkillButton     = document.getElementById("addSkillButton");

const savingThrowsDiv    = document.getElementById("savingThrows");  // FIX: was never declared

const passivePerception    = document.getElementById("passivePerception");
const passiveInvestigation = document.getElementById("passiveInvestigation");
const passiveInsight       = document.getElementById("passiveInsight");

const backButton         = document.getElementById("backButton");
const deleteCharButton   = document.getElementById("deleteCharButton");

// ---------------- UTIL ----------------
function debounce(fn, delay = 500) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

const debouncedSave = debounce(saveCharacter);

function getModifier(score)    { return Math.floor((score - 10) / 2); }
function formatMod(score)      { const m = getModifier(score); return m >= 0 ? `+${m}` : `${m}`; }
function getProfBonus(level)   { return Math.floor((level - 1) / 4) + 2; }
function getStatValue(key)     { const s = currentStats.find(s => s.key === key); return s ? (parseInt(s.base) || 10) : 10; }
function currentLevel()        { return parseInt(editLevel.value) || 1; }

function profBonusForLevel(profLevel) {
    const pb = getProfBonus(currentLevel());
    switch (profLevel) {
        case 1: return Math.floor(pb / 2);
        case 2: return pb;
        case 3: return pb * 2;
        default: return 0;
    }
}

// ---------------- SKILL STAT DROPDOWN ----------------
// FIX: this was called in renderStats() but never defined
function updateSkillStatDropdown() {
    newSkillStat.innerHTML = "";
    currentStats.forEach(s => {
        const opt = document.createElement("option");
        opt.value       = s.key;
        opt.textContent = s.label;
        newSkillStat.appendChild(opt);
    });
}

// ---------------- SAVING THROWS ----------------
function renderSavingThrows() {
    savingThrowsDiv.innerHTML = "";

    DEFAULT_STATS.forEach(stat => {
        const row = document.createElement("div");
        row.className = "save-row";
        row.innerHTML = `<span>${stat.label}</span><span>${formatMod(getStatValue(stat.key))}</span>`;
        savingThrowsDiv.appendChild(row);
    });
}

// ---------------- PASSIVES ----------------
function getPassiveScore(statKey, skillName) {
    const statMod = getModifier(getStatValue(statKey));
    const skill   = currentSkills.find(s => s.name === skillName);
    const prof    = skill ? profBonusForLevel(skill.profLevel) : 0;
    return 10 + statMod + prof;
}

function renderPassives() {
    passivePerception.textContent    = getPassiveScore("wis", "Perception");
    passiveInvestigation.textContent = getPassiveScore("int", "Investigation");
    passiveInsight.textContent       = getPassiveScore("wis", "Insight");
}

// ---------------- RENDER STATS ----------------
function renderStats() {
    statsContainer.innerHTML = "";

    currentStats.forEach((stat, index) => {
        const val  = parseInt(stat.base) || 10;
        const cell = document.createElement("div");
        cell.className = "stat";

        cell.innerHTML = `
            <label>${stat.label || "STAT"}</label>
            <input type="number" value="${val}">
            <div class="modifier">${formatMod(val)}</div>
            <button class="stat-delete">✕</button>
        `;

        const input     = cell.querySelector("input");
        const modDiv    = cell.querySelector(".modifier");
        const deleteBtn = cell.querySelector(".stat-delete");

        input.oninput = () => {
            currentStats[index].base = parseInt(input.value) || 10;
            modDiv.textContent = formatMod(currentStats[index].base);
            renderSkills();
            renderPassives();
            debouncedSave();
        };

        deleteBtn.onclick = () => {
            currentStats.splice(index, 1);
            rerenderAll();
            debouncedSave();
        };

        statsContainer.appendChild(cell);
    });

    updateSkillStatDropdown();
}

// ---------------- RENDER SKILLS ----------------
function renderSkills() {
    skillsContainer.innerHTML = "";

    currentSkills.forEach((skill, index) => {
        const statVal  = getStatValue(skill.stat);
        const total    = getModifier(statVal) + profBonusForLevel(skill.profLevel);
        const statEntry = currentStats.find(s => s.key === skill.stat);
        const statLabel = statEntry ? statEntry.label : skill.stat.toUpperCase();

        const row = document.createElement("div");
        row.className = "skill";

        row.innerHTML = `
            <span class="skill-name">${skill.name} (${statLabel})</span>
            <div class="prof-group">
                <label><input type="radio" name="prof-${index}" value="0" ${skill.profLevel === 0 ? "checked" : ""}></label>
                <label><input type="radio" name="prof-${index}" value="1" ${skill.profLevel === 1 ? "checked" : ""}></label>
                <label><input type="radio" name="prof-${index}" value="2" ${skill.profLevel === 2 ? "checked" : ""}></label>
                <label><input type="radio" name="prof-${index}" value="3" ${skill.profLevel === 3 ? "checked" : ""}></label>
            </div>
            <span class="skill-total">${total >= 0 ? "+" + total : total}</span>
            <button class="skill-delete">✕</button>
        `;

        row.querySelectorAll("input[type=radio]").forEach(radio => {
            radio.onchange = () => {
                currentSkills[index].profLevel = parseInt(radio.value);
                renderSkills();
                renderPassives();
                debouncedSave();
            };
        });

        row.querySelector(".skill-delete").onclick = () => {
            currentSkills.splice(index, 1);
            renderSkills();
            renderPassives();
            debouncedSave();
        };

        skillsContainer.appendChild(row);
    });
}

// ---------------- RERENDER ALL ----------------
function rerenderAll() {
    renderStats();
    renderSkills();
    renderSavingThrows();  // FIX: was never called
    renderPassives();
}

// ---------------- SAVE ----------------
async function saveCharacter() {
    const user = auth.currentUser;
    if (!user || !currentCharId) return;

    await setDoc(doc(db, "users", user.uid, "characters", currentCharId), {
        name:       editName.value,
        class:      editClass.value,
        level:      parseInt(editLevel.value) || 1,
        ac:         parseInt(editAC.value) || 10,
        hp: {
            current: parseInt(editHPCurrent.value) || 0,
            max:     parseInt(editHPMax.value) || 0,
            temp:    parseInt(editTempHP.value) || 0
        },
        inspiration: editInspiration.classList.contains("active"),
        heroPoints:  parseInt(editHeroPoints.value) || 0,
        stats:       currentStats,
        skills:      currentSkills
    }, { merge: true });
}

// ---------------- CHARACTER LIST ----------------
createCharButton.onclick = async () => {
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
        createdAt: Date.now()
    });

    charNameInput.value = "";
    loadCharacters();
};

async function loadCharacters() {
    const user = auth.currentUser;
    if (!user) return;

    const snap = await getDocs(collection(db, "users", user.uid, "characters"));
    characterList.innerHTML = "";

    snap.forEach(docSnap => {
        const data = docSnap.data();
        const btn  = document.createElement("button");
        btn.textContent = `${data.name} (Lv ${data.level})`;
        btn.onclick = () => openCharacter(docSnap.id, data);
        characterList.appendChild(btn);
    });
}

// ---------------- OPEN CHARACTER ----------------
function openCharacter(id, data) {
    currentCharId = id;

    characterListView.style.display = "none";
    editor.style.display = "block";

    editName.value  = data.name  ?? "";
    editClass.value = data.class ?? "";
    editLevel.value = data.level ?? 1;

    // FIX: combat fields were never restored from data
    editAC.value          = data.ac ?? 10;
    editHPCurrent.value   = data.hp?.current ?? 0;
    editHPMax.value       = data.hp?.max ?? 0;
    editTempHP.value      = data.hp?.temp ?? 0;
    if (data.inspiration) {editInspiration.classList.add("active");}
    else {editInspiration.classList.remove("active");}
    editHeroPoints.value  = data.heroPoints ?? 0;

    currentStats = Array.isArray(data.stats) && data.stats.length
        ? JSON.parse(JSON.stringify(data.stats))
        : DEFAULT_STATS.map(s => ({ ...s, base: data.attributes?.[s.key]?.base ?? 10 }));

    currentSkills = (data.skills ?? []).map(s => ({
        name:      s.name,
        stat:      s.stat,
        // migrate old boolean proficient field
        profLevel: typeof s.proficient === "boolean" ? (s.proficient ? 2 : 0) : (s.profLevel ?? 0)
    }));

    rerenderAll();
}

// ---------------- AUTOSAVE ON BASIC FIELDS ----------------
[editName, editClass, editLevel, editAC, editHPCurrent,
 editHPMax, editTempHP, editInspiration, editHeroPoints
].forEach(el => {
    editInspiration.onclick = () => {
    editInspiration.classList.toggle("active");
    debouncedSave();};
});

// ---------------- ADD STAT ----------------
addStatButton.onclick = () => {
    const raw = newStatName.value.trim();
    if (!raw) return;

    const label = raw.toUpperCase().slice(0, 6);
    const key   = raw.toLowerCase().replace(/\s+/g, "_").slice(0, 20);

    if (currentStats.some(s => s.key === key)) {
        alert(`A stat with the key "${key}" already exists.`);
        return;
    }

    currentStats.push({ key, label, base: 10 });
    newStatName.value = "";
    rerenderAll();
    debouncedSave();
};

// ---------------- ADD SKILL ----------------
addSkillButton.onclick = () => {
    const name = newSkillName.value.trim();
    const stat = newSkillStat.value;
    if (!name || !stat) return;

    currentSkills.push({ name, stat, profLevel: 0 });
    newSkillName.value = "";
    rerenderAll();
    debouncedSave();
};

// ---------------- DELETE CHARACTER ----------------
deleteCharButton.onclick = async () => {
    const user = auth.currentUser;
    if (!user || !currentCharId) return;

    if (!confirm("Delete this character? This cannot be undone.")) return;

    await deleteDoc(doc(db, "users", user.uid, "characters", currentCharId));

    currentCharId = null;
    editor.style.display = "none";
    characterListView.style.display = "block";
    loadCharacters();
};

// ---------------- NAVIGATION ----------------
backButton.onclick = () => {
    editor.style.display = "none";
    characterListView.style.display = "block";
};

signOutButton.onclick = () => signOut(auth);

signUpButton.onclick = async () => {
    try {
        await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    } catch (e) {
        userStatus.textContent = e.message;
    }
};

signInButton.onclick = async () => {
    try {
        await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    } catch (e) {
        userStatus.textContent = e.message;
    }
};

// ---------------- AUTH STATE ----------------
onAuthStateChanged(auth, user => {
    authUiDiv.style.display    = user ? "none"  : "block";
    appContentDiv.style.display = user ? "block" : "none";
    userStatus.textContent     = user ? `Signed in as ${user.email}` : "No user signed in.";

    if (user) loadCharacters();
});
