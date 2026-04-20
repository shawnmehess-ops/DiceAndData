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

// ---------------- STATE ----------------
let currentCharId = null;
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

const statStr           = document.getElementById("statStr");
const statDex           = document.getElementById("statDex");
const statCon           = document.getElementById("statCon");
const statInt           = document.getElementById("statInt");
const statWis           = document.getElementById("statWis");
const statCha           = document.getElementById("statCha");

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

const statElements = { str: statStr, dex: statDex, con: statCon, int: statInt, wis: statWis, cha: statCha };

function getStatValue(stat) {
    return parseInt(statElements[stat]?.value) || 10;
}

// ---------------- MODIFIERS ----------------
const statModMap = [
    [statStr, "modStr"],
    [statDex, "modDex"],
    [statCon, "modCon"],
    [statInt, "modInt"],
    [statWis, "modWis"],
    [statCha, "modCha"]
];

function updateAllStats() {
    statModMap.forEach(([input, modId]) => {
        const mod = document.getElementById(modId);
        if (!mod) return;
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

        row.children[0].onchange = (e) => {
            currentSkills[index].proficient = e.target.checked;
            renderSkills();
            debouncedSave();
        };

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
        attributes: {
            str: { base: 10 },
            dex: { base: 10 },
            con: { base: 10 },
            int: { base: 10 },
            wis: { base: 10 },
            cha: { base: 10 }
        },
        skills: [
            { name: "Athletics",  stat: "str", proficient: false },
            { name: "Stealth",    stat: "dex", proficient: false },
            { name: "Arcana",     stat: "int", proficient: false },
            { name: "Perception", stat: "wis", proficient: false }
        ],
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
}

// ---------------- SAVE ----------------
async function saveCharacter() {
    const user = auth.currentUser;
    if (!user || !currentCharId) return;

    await setDoc(doc(db, "users", user.uid, "characters", currentCharId), {
        name:  editName.value,
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

// ---------------- AUTOSAVE (wired once at startup) ----------------
[editName, editClass, editLevel, statStr, statDex, statCon, statInt, statWis, statCha].forEach(el => {
    el.oninput = () => {
        updateAllStats();
        renderSkills();
        debouncedSave();
    };
});

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
