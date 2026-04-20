import {
    getFirestore,
    doc,
    setDoc,
    getDocs,
    addDoc,
    collection,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";

// ---------------- FIREBASE ----------------
const firebaseConfig = {
    apiKey: "AIzaSyBYYgS04lxcbeawj7WDahEN7SbzYVGLjE",
    authDomain: "diceanddata-81ebe.firebaseapp.com",
    projectId: "diceanddata-81ebe",
    storageBucket: "diceanddata-81ebe.firebasestorage.app",
    messagingSenderId: "547850961878",
    appId: "1:547850961878:web:8b2a99076d66c0ab451a77",
    measurementId: "G-LSZ59FPDTL"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

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
    { name: "Acrobatics", stat: "dex", profLevel: 0},
    { name: "Animal Handling", stat: "wis", profLevel: 0},
    { name: "Arcana", stat: "int", profLevel: 0},
    { name: "Athletics", stat: "str", profLevel: 0},
    { name: "Deception", stat: "cha", profLevel: 0},
    { name: "History", stat: "int", profLevel: 0},
    { name: "Insight", stat: "wis", profLevel: 0},
    { name: "Intimidation", stat: "cha", profLevel: 0},
    { name: "Investigation", stat: "int", profLevel: 0},
    { name: "Medicine", stat: "wis", profLevel: 0},
    { name: "Nature", stat: "int", profLevel: 0},
    { name: "Perception", stat: "wis", profLevel: 0},
    { name: "Performance", stat: "cha", profLevel: 0},
    { name: "Persuasion", stat: "cha", profLevel: 0},
    { name: "Religion", stat: "int", profLevel: 0},
    { name: "Sleight of Hand", stat: "dex", profLevel: 0},
    { name: "Stealth", stat: "dex", profLevel: 0},
    { name: "Survival", stat: "wis", profLevel: 0}
];

// ---------------- STATE ----------------
let currentCharId = null;
let currentStats  = [];
let currentSkills = [];

// ---------------- DOM ----------------
const emailInput        = document.getElementById("emailInput");
const passwordInput     = document.getElementById("passwordInput");
const signUpButton      = document.getElementById("signUpButton");
const signInButton      = document.getElementById("signInButton");
const signOutButton     = document.getElementById("signOutButton");
const userStatus        = document.getElementById("userStatus");

const authUiDiv         = document.getElementById("auth-ui");
const appContentDiv     = document.getElementById("app-content");

const charNameInput     = document.getElementById("charNameInput");
const createCharButton  = document.getElementById("createCharButton");
const characterList     = document.getElementById("characterList");
const characterListView = document.getElementById("characterListView");

const editor            = document.getElementById("editor");
const editName          = document.getElementById("editName");
const editClass         = document.getElementById("editClass");
const editLevel         = document.getElementById("editLevel");

const statsContainer    = document.getElementById("statsContainer");
const newStatName       = document.getElementById("newStatName");
const addStatButton     = document.getElementById("addStatButton");

const skillsContainer   = document.getElementById("skillsContainer");
const newSkillName      = document.getElementById("newSkillName");
const newSkillStat      = document.getElementById("newSkillStat");
const addSkillButton    = document.getElementById("addSkillButton");

const backButton        = document.getElementById("backButton");
const deleteCharButton  = document.getElementById("deleteCharButton");

// ---------------- NEW DOM (COMBAT / DERIVED STATS) ----------------
const editAC            = document.getElementById("editAC");
const editHPCurrent     = document.getElementById("editHPCurrent");
const editHPMax         = document.getElementById("editHPMax");
const editTempHP        = document.getElementById("editTempHP");
const editInspiration   = document.getElementById("editInspiration");
const editHeroPoints    = document.getElementById("editHeroPoints");

const savingThrowsDiv   = document.getElementById("savingThrows");
const passivePerception = document.getElementById("passivePerception");

// ---------------- UTIL ----------------
function debounce(fn, delay = 500) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

const debouncedSave = debounce(saveCharacter);

function getModifier(score) {
    return Math.floor((score - 10) / 2);
}

function formatMod(score) {
    const mod = getModifier(score);
    return mod >= 0 ? `+${mod}` : `${mod}`;
}

function getProficiencyBonus(level) {
    return Math.floor((level - 1) / 4) + 2;
}

function getStatValue(key) {
    const stat = currentStats.find(s => s.key === key);
    return stat ? (parseInt(stat.base) || 10) : 10;
}

// ---------------- PASSIVE PERCEPTION ----------------
function renderPassives() {
    const wisMod = getModifier(getStatValue("wis"));
    passivePerception.textContent = 10 + wisMod;
}

// ---------------- SAVING THROWS ----------------
function renderSavingThrows() {
    savingThrowsDiv.innerHTML = "";

    DEFAULT_STATS.forEach(stat => {
        const val = getStatValue(stat.key);
        const mod = getModifier(val);

        const row = document.createElement("div");
        row.className = "save-row";

        row.innerHTML = `
            <span>${stat.label}</span>
            <span>${mod >= 0 ? "+" + mod : mod}</span>
        `;

        savingThrowsDiv.appendChild(row);
    });
}

// ---------------- RENDER STATS ----------------
function renderStats() {
    statsContainer.innerHTML = "";

    currentStats.forEach((stat, index) => {
        const val = parseInt(stat.base) || 10;

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
            const newVal = parseInt(input.value) || 10;
            currentStats[index].base = newVal;
            modDiv.innerText = formatMod(newVal);

            renderSkills();
            renderSavingThrows();
            renderPassives();

            debouncedSave();
        };

        deleteBtn.onclick = () => {
            currentStats.splice(index, 1);
            renderStats();
            renderSkills();
            renderSavingThrows();
            renderPassives();
            debouncedSave();
        };

        statsContainer.appendChild(cell);
    });

    updateSkillStatDropdown();
    renderSavingThrows();
    renderPassives();
}

// ---------------- SKILL DROPDOWN ----------------
function updateSkillStatDropdown() {
    const previous = newSkillStat.value;

    newSkillStat.innerHTML = "";

    currentStats.forEach(stat => {
        const opt = document.createElement("option");
        opt.value = stat.key;
        opt.textContent = stat.label;
        newSkillStat.appendChild(opt);
    });

    if ([...newSkillStat.options].some(o => o.value === previous)) {
        newSkillStat.value = previous;
    }
}

// ---------------- RENDER SKILLS ----------------
function renderSkills() {
    skillsContainer.innerHTML = "";

    const level = parseInt(editLevel.value) || 1;
    const profBonus = getProficiencyBonus(level);

    currentSkills.forEach((skill, index) => {
        const statVal = getStatValue(skill.stat);
        const base = getModifier(statVal);

        let prof = 0;
        switch (skill.profLevel) {
            case 1: prof = Math.floor(profBonus / 2); break;
            case 2: prof = profBonus; break;
            case 3: prof = profBonus * 2; break;
        }

        const total = base + prof;

        const statEntry = currentStats.find(s => s.key === skill.stat);
        const statLabel = statEntry ? statEntry.label : skill.stat.toUpperCase();

        const row = document.createElement("div");
        row.className = "skill";

        row.innerHTML = `
            <div class="prof-group">
                <label><input type="radio" name="prof-${index}" value="0" ${skill.profLevel === 0 ? "checked" : ""}></label>
                <label><input type="radio" name="prof-${index}" value="1" ${skill.profLevel === 1 ? "checked" : ""}></label>
                <label><input type="radio" name="prof-${index}" value="2" ${skill.profLevel === 2 ? "checked" : ""}></label>
                <label><input type="radio" name="prof-${index}" value="3" ${skill.profLevel === 3 ? "checked" : ""}></label>
            </div>

            <span class="skill-name">${skill.name} (${statLabel})</span>
            <span class="skill-total">${total >= 0 ? "+" + total : total}</span>

            <button class="skill-delete">✕</button>
        `;

        row.querySelectorAll("input[type=radio]").forEach(radio => {
            radio.onchange = () => {
                currentSkills[index].profLevel = parseInt(radio.value);
                renderSkills();
                debouncedSave();
            };
        });

        row.querySelector(".skill-delete").onclick = () => {
            currentSkills.splice(index, 1);
            renderSkills();
            debouncedSave();
        };

        skillsContainer.appendChild(row);
    });
}

// ---------------- SAVE ----------------
async function saveCharacter() {
    const user = auth.currentUser;
    if (!user || !currentCharId) return;

    await setDoc(doc(db, "users", user.uid, "characters", currentCharId), {
        name: editName.value,
        class: editClass.value,
        level: parseInt(editLevel.value) || 1,

        ac: parseInt(editAC.value) || 10,
        hp: {
            current: parseInt(editHPCurrent.value) || 0,
            max: parseInt(editHPMax.value) || 0,
            temp: parseInt(editTempHP.value) || 0
        },
        inspiration: editInspiration.checked,
        heroPoints: parseInt(editHeroPoints.value) || 0,

        stats: currentStats,
        skills: currentSkills
    }, { merge: true });
}

// ---------------- AUTOSAVE ----------------
[
    editName, editClass, editLevel,
    editAC, editHPCurrent, editHPMax,
    editTempHP, editInspiration, editHeroPoints
].forEach(el => {
    el.oninput = () => {
        renderSkills();
        renderSavingThrows();
        renderPassives();
        debouncedSave();
    };
});

// ---------------- AUTH + CHARACTER LOGIC (UNCHANGED) ----------------
// (kept exactly as your original file)

signUpButton.onclick = async () => {
    try {
        await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
        userStatus.textContent = "";
    } catch (err) {
        userStatus.textContent = `Sign up failed: ${err.message}`;
    }
};

signInButton.onclick = async () => {
    try {
        await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
        userStatus.textContent = "";
    } catch (err) {
        userStatus.textContent = `Sign in failed: ${err.message}`;
    }
};

signOutButton.onclick = async () => {
    await signOut(auth);
};

createCharButton.onclick = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const name = charNameInput.value.trim();
    if (!name) return;

    await addDoc(collection(db, "users", user.uid, "characters"), {
        name,
        class: "Unknown",
        level: 1,
        stats: JSON.parse(JSON.stringify(DEFAULT_STATS)),
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

        const btn = document.createElement("button");
        btn.innerText = `${data.name} (Lv ${data.level})`;
        btn.onclick = () => openCharacter(docSnap.id, data);

        characterList.appendChild(btn);
    });
}

function openCharacter(id, data) {
    currentCharId = id;

    characterListView.style.display = "none";
    editor.style.display = "block";

    editName.value  = data.name;
    editClass.value = data.class;
    editLevel.value = data.level;

    editAC.value = data.ac ?? 10;
    editHPCurrent.value = data.hp?.current ?? 10;
    editHPMax.value = data.hp?.max ?? 10;
    editTempHP.value = data.hp?.temp ?? 0;
    editInspiration.checked = data.inspiration ?? false;
    editHeroPoints.value = data.heroPoints ?? 0;

    currentStats = JSON.parse(JSON.stringify(data.stats || DEFAULT_STATS));
    currentSkills = JSON.parse(JSON.stringify(data.skills || DEFAULT_SKILLS));

    renderStats();
    renderSkills();
    renderSavingThrows();
    renderPassives();
}

onAuthStateChanged(auth, (user) => {
    if (!user) {
        authUiDiv.style.display = "block";
        appContentDiv.style.display = "none";
        return;
    }

    authUiDiv.style.display = "none";
    appContentDiv.style.display = "block";

    loadCharacters();
});
