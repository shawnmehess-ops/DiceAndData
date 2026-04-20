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
            debouncedSave();
        };

        deleteBtn.onclick = () => {
            currentStats.splice(index, 1);
            renderStats();
            updateSkillStatDropdown();
            renderSkills();
            debouncedSave();
        };

        statsContainer.appendChild(cell);
    });

    updateSkillStatDropdown();
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
                <label title="No proficiency"><input type="radio" name="prof-${index}" value="0" ${skill.profLevel === 0 ? "checked" : ""}>—</label>
                <label title="Half proficiency"><input type="radio" name="prof-${index}" value="1" ${skill.profLevel === 1 ? "checked" : ""}>½</label>
                <label title="Proficient"><input type="radio" name="prof-${index}" value="2" ${skill.profLevel === 2 ? "checked" : ""}>✓</label>
                <label title="Expertise"><input type="radio" name="prof-${index}" value="3" ${skill.profLevel === 3 ? "checked" : ""}>★</label>
            </div>
            <span>${skill.name} (${statLabel})</span>
            <span>${total >= 0 ? "+" + total : total}</span>
            <button>✕</button>
        `;

        const radios = row.querySelectorAll("input[type=radio]");
        radios.forEach(radio => {
            radio.onchange = () => {
                currentSkills[index].profLevel = parseInt(radio.value);
                renderSkills();
                debouncedSave();
            };
        });

        row.children[3].onclick = () => {
            currentSkills.splice(index, 1);
            renderSkills();
            debouncedSave();
        };

        skillsContainer.appendChild(row);
    });
}

// ---------------- AUTH ----------------
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

// ---------------- CHARACTER CRUD ----------------
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

    if (data.stats && Array.isArray(data.stats)) {
        currentStats = JSON.parse(JSON.stringify(data.stats));
    } else {
        const a = data.attributes || {};
        currentStats = DEFAULT_STATS.map(s => ({
            key: s.key,
            label: s.label,
            base: a[s.key]?.base ?? 10
        }));
    }

    // ✅ MIGRATION LOGIC
    currentSkills = (data.skills || []).map(s => {
        if (typeof s.proficient === "boolean") {
            return {
                name: s.name,
                stat: s.stat,
                profLevel: s.proficient ? 2 : 0
            };
        }

        return {
            name: s.name,
            stat: s.stat,
            profLevel: s.profLevel ?? 0
        };
    });

    renderStats();
    renderSkills();
}

// ---------------- SAVE ----------------
async function saveCharacter() {
    const user = auth.currentUser;
    if (!user || !currentCharId) return;

    await setDoc(doc(db, "users", user.uid, "characters", currentCharId), {
        name: editName.value,
        class: editClass.value,
        level: parseInt(editLevel.value) || 1,
        stats: currentStats,
        skills: currentSkills
    }, { merge: true });
}

// ---------------- AUTOSAVE ----------------
[editName, editClass, editLevel].forEach(el => {
    el.oninput = () => {
        renderSkills();
        debouncedSave();
    };
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

    renderStats();
    debouncedSave();
};

// ---------------- ADD SKILL ----------------
addSkillButton.onclick = () => {
    const name = newSkillName.value.trim();
    const stat = newSkillStat.value;
    if (!name || !stat) return;

    currentSkills.push({ name, stat, profLevel: 0 });

    newSkillName.value = "";
    renderSkills();
    debouncedSave();
};

// ---------------- DELETE CHARACTER ----------------
deleteCharButton.onclick = async () => {
    const user = auth.currentUser;
    if (!user || !currentCharId) return;

    await deleteDoc(doc(db, "users", user.uid, "characters", currentCharId));

    currentCharId = null;
    editor.style.display = "none";
    characterListView.style.display = "block";
    loadCharacters();
};

// ---------------- NAV ----------------
backButton.onclick = () => {
    editor.style.display = "none";
    characterListView.style.display = "block";
};

// ---------------- AUTH STATE ----------------
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
