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
    apiKey: "YOUR_KEY",
    authDomain: "YOUR_DOMAIN",
    projectId: "YOUR_PROJECT_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ---------------- STATE ----------------
let currentCharId = null;
let currentSkills = [];

// ---------------- DOM ----------------
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const signUpButton = document.getElementById("signUpButton");
const signInButton = document.getElementById("signInButton");
const signOutButton = document.getElementById("signOutButton");

const authUiDiv = document.getElementById("auth-ui");
const appContentDiv = document.getElementById("app-content");

const charNameInput = document.getElementById("charNameInput");
const createCharButton = document.getElementById("createCharButton");
const characterList = document.getElementById("characterList");

const editor = document.getElementById("editor");
const editName = document.getElementById("editName");
const editClass = document.getElementById("editClass");
const editLevel = document.getElementById("editLevel");

const statStr = document.getElementById("statStr");
const statDex = document.getElementById("statDex");
const statCon = document.getElementById("statCon");
const statInt = document.getElementById("statInt");
const statWis = document.getElementById("statWis");
const statCha = document.getElementById("statCha");

const skillsContainer = document.getElementById("skillsContainer");

const newSkillName = document.getElementById("newSkillName");
const newSkillStat = document.getElementById("newSkillStat");
const addSkillButton = document.getElementById("addSkillButton");

const backButton = document.getElementById("backButton");
const deleteCharButton = document.getElementById("deleteCharButton");

// ---------------- UTIL ----------------
function debounce(fn, delay = 500) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

const debouncedSave = debounce(() => saveCharacter(), 500);

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

function getStatValue(stat) {
    switch (stat) {
        case "str": return parseInt(statStr.value) || 10;
        case "dex": return parseInt(statDex.value) || 10;
        case "con": return parseInt(statCon.value) || 10;
        case "int": return parseInt(statInt.value) || 10;
        case "wis": return parseInt(statWis.value) || 10;
        case "cha": return parseInt(statCha.value) || 10;
        default: return 10;
    }
}

// ---------------- MODIFIERS ----------------
function updateAllStats() {
    const map = [
        ["statStr", "modStr"],
        ["statDex", "modDex"],
        ["statCon", "modCon"],
        ["statInt", "modInt"],
        ["statWis", "modWis"],
        ["statCha", "modCha"]
    ];

    map.forEach(([inputId, modId]) => {
        const input = document.getElementById(inputId);
        const mod = document.getElementById(modId);
        if (!input || !mod) return;

        const val = parseInt(input.value) || 10;
        mod.innerText = formatMod(val);
    });
}

// ---------------- SKILLS ----------------
function renderSkills() {
    skillsContainer.innerHTML = "";

    const level = parseInt(editLevel.value) || 1;
    const profBonus = getProficiencyBonus(level);

    currentSkills.forEach((skill, index) => {
        const statVal = getStatValue(skill.stat);
        const base = getModifier(statVal);
        const total = skill.proficient ? base + profBonus : base;

        const row = document.createElement("div");
        row.className = "skill";

        row.innerHTML = `
            <input type="checkbox" ${skill.proficient ? "checked" : ""}>
            <span>${skill.name} (${skill.stat.toUpperCase()})</span>
            <span>${total >= 0 ? "+" + total : total}</span>
            <button>X</button>
        `;

        const checkbox = row.children[0];
        const deleteBtn = row.children[3];

        checkbox.onchange = () => {
            currentSkills[index].proficient = checkbox.checked;
            renderSkills();
            debouncedSave();
        };

        deleteBtn.onclick = () => {
            currentSkills.splice(index, 1);
            renderSkills();
            debouncedSave();
        };

        skillsContainer.appendChild(row);
    });
}

// ---------------- AUTH ----------------
signUpButton.onclick = async () => {
    await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
};

signInButton.onclick = async () => {
    await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
};

signOutButton.onclick = async () => {
    await signOut(auth);
};

// ---------------- CHARACTER CRUD ----------------
createCharButton.onclick = async () => {
    const user = auth.currentUser;
    if (!user) return;

    await addDoc(collection(db, "users", user.uid, "characters"), {
        name: charNameInput.value,
        class: "Unknown",
        level: 1,
        attributes: {
            str: { base: 10 },
            dex: { base: 10 },
            con: { base: 10 },
            int: { base: 10 },
            wis: { base: 10 },
            cha: { base: 10 }
        },
        skills: [
            { name: "Athletics", stat: "str", proficient: false },
            { name: "Stealth", stat: "dex", proficient: false },
            { name: "Arcana", stat: "int", proficient: false },
            { name: "Perception", stat: "wis", proficient: false }
        ],
        createdAt: Date.now()
    });

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

    editName.value = data.name;
    editClass.value = data.class;
    editLevel.value = data.level;

    const a = data.attributes || {};

    statStr.value = a.str?.base ?? 10;
    statDex.value = a.dex?.base ?? 10;
    statCon.value = a.con?.base ?? 10;
    statInt.value = a.int?.base ?? 10;
    statWis.value = a.wis?.base ?? 10;
    statCha.value = a.cha?.base ?? 10;

    currentSkills = JSON.parse(JSON.stringify(data.skills || []));

    updateAllStats();
    renderSkills();
    bindAutosave();
}

// ---------------- SAVE ----------------
async function saveCharacter() {
    const user = auth.currentUser;
    if (!user || !currentCharId) return;

    await setDoc(doc(db, "users", user.uid, "characters", currentCharId), {
        name: editName.value,
        class: editClass.value,
        level: parseInt(editLevel.value) || 1,
        attributes: {
            str: { base: parseInt(statStr.value) || 10 },
            dex: { base: parseInt(statDex.value) || 10 },
            con: { base: parseInt(statCon.value) || 10 },
            int: { base: parseInt(statInt.value) || 10 },
            wis: { base: parseInt(statWis.value) || 10 },
            cha: { base: parseInt(statCha.value) || 10 }
        },
        skills: currentSkills
    }, { merge: true });
}

// ---------------- AUTOSAVE ----------------
function bindAutosave() {
    const inputs = [
        editName, editClass, editLevel,
        statStr, statDex, statCon, statInt, statWis, statCha
    ];

    inputs.forEach(el => {
        el.oninput = () => {
            updateAllStats();
            renderSkills();
            debouncedSave();
        };
    });
}

// ---------------- ADD SKILL ----------------
addSkillButton.onclick = () => {
    const name = newSkillName.value.trim();
    const stat = newSkillStat.value;
    if (!name) return;

    currentSkills.push({ name, stat, proficient: false });

    newSkillName.value = "";

    renderSkills();
    debouncedSave();
};

// ---------------- DELETE ----------------
deleteCharButton.onclick = async () => {
    const user = auth.currentUser;
    if (!user || !currentCharId) return;

    await deleteDoc(doc(db, "users", user.uid, "characters", currentCharId));

    editor.style.display = "none";
    loadCharacters();
};

// ---------------- NAV ----------------
backButton.onclick = () => {
    editor.style.display = "none";
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
