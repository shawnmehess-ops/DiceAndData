import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    collection,
    addDoc,
    getDocs,
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

// ---------------- DOM ----------------
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');

const signUpButton = document.getElementById('signUpButton');
const signInButton = document.getElementById('signInButton');
const signOutButton = document.getElementById('signOutButton');

const userStatus = document.getElementById('userStatus');

const authUiDiv = document.getElementById('auth-ui');
const appContentDiv = document.getElementById('app-content');

const charNameInput = document.getElementById('charNameInput');
const createCharButton = document.getElementById('createCharButton');
const characterList = document.getElementById('characterList');

const editor = document.getElementById('editor');
const editorTitle = document.getElementById('editorTitle');

const editName = document.getElementById('editName');
const editClass = document.getElementById('editClass');
const editLevel = document.getElementById('editLevel');

const statStr = document.getElementById('statStr');
const statDex = document.getElementById('statDex');
const statCon = document.getElementById('statCon');
const statInt = document.getElementById('statInt');
const statWis = document.getElementById('statWis');
const statCha = document.getElementById('statCha');

const editorStatus = document.getElementById('editorStatus');

const backButton = document.getElementById('backButton');
const deleteCharButton = document.getElementById('deleteCharButton');

// ---------------- MODIFIER ENGINE ----------------
function getModifier(score) {
    return Math.floor((score - 10) / 2);
}

function formatMod(score) {
    const mod = getModifier(score);
    return mod >= 0 ? `+${mod}` : `${mod}`;
}

function updateAllStats() {
    const str = parseInt(statStr.value) || 10;
    const dex = parseInt(statDex.value) || 10;
    const con = parseInt(statCon.value) || 10;
    const int = parseInt(statInt.value) || 10;
    const wis = parseInt(statWis.value) || 10;
    const cha = parseInt(statCha.value) || 10;

    document.getElementById("modStr").innerText = formatMod(str);
    document.getElementById("modDex").innerText = formatMod(dex);
    document.getElementById("modCon").innerText = formatMod(con);
    document.getElementById("modInt").innerText = formatMod(int);
    document.getElementById("modWis").innerText = formatMod(wis);
    document.getElementById("modCha").innerText = formatMod(cha);
}

// ---------------- AUTH ----------------
signUpButton.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    try {
        const userCredential =
            await createUserWithEmailAndPassword(auth, email, password);

        const user = userCredential.user;

        userStatus.innerText = `Signed up as: ${user.email}`;

        await setDoc(doc(db, "users", user.uid), {
            createdAt: Date.now()
        }, { merge: true });

        passwordInput.value = '';
    } catch (err) {
        userStatus.innerText = `Sign Up Error: ${err.message}`;
    }
});

signInButton.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    try {
        const userCredential =
            await signInWithEmailAndPassword(auth, email, password);

        userStatus.innerText = `Logged in as: ${userCredential.user.email}`;
        passwordInput.value = '';
    } catch (err) {
        userStatus.innerText = `Sign In Error: ${err.message}`;
    }
});

signOutButton.addEventListener('click', async () => {
    await signOut(auth);
    userStatus.innerText = 'No user signed in.';
});

// ---------------- CREATE CHARACTER ----------------
createCharButton.addEventListener('click', async () => {
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

        modifiers: [],
        createdAt: Date.now()
    });

    charNameInput.value = "";
    loadCharacters();
});

// ---------------- LOAD CHARACTERS ----------------
async function loadCharacters() {
    const user = auth.currentUser;
    if (!user) return;

    const snap = await getDocs(collection(db, "users", user.uid, "characters"));

    characterList.innerHTML = "";

    snap.forEach((docSnap) => {
        const data = docSnap.data();

        const li = document.createElement("li");
        const btn = document.createElement("button");

        btn.textContent = `${data.name} (Lv ${data.level})`;

        btn.addEventListener("click", () => {
            openCharacter(docSnap.id, data);
        });

        li.appendChild(btn);
        characterList.appendChild(li);
    });
}

// ---------------- OPEN CHARACTER ----------------
function openCharacter(id, data) {
    currentCharId = id;

    editor.style.display = "block";

    editorTitle.innerText = `Editing: ${data.name}`;

    editName.value = data.name || "";
    editClass.value = data.class || "";
    editLevel.value = data.level || 1;

    const attrs = data.attributes || {};

    statStr.value = attrs.str?.base ?? 10;
    statDex.value = attrs.dex?.base ?? 10;
    statCon.value = attrs.con?.base ?? 10;
    statInt.value = attrs.int?.base ?? 10;
    statWis.value = attrs.wis?.base ?? 10;
    statCha.value = attrs.cha?.base ?? 10;

    updateAllStats();
    bindStatListeners();
}

// ---------------- SAVE CHARACTER ----------------
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

        modifiers: []
    }, { merge: true });

    editorStatus.innerText = "Saved.";
}

// auto-save stats
[statStr, statDex, statCon, statInt, statWis, statCha]
    .forEach(el => el.addEventListener("input", () => {
        updateAllStats();
        saveCharacter();
    }));

// ---------------- DELETE ----------------
deleteCharButton.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user || !currentCharId) return;

    if (!confirm("Delete this character?")) return;

    await deleteDoc(doc(db, "users", user.uid, "characters", currentCharId));

    currentCharId = null;

    editor.style.display = "none";
    loadCharacters();
});

// ---------------- BACK ----------------
backButton.addEventListener('click', () => {
    currentCharId = null;
    editor.style.display = "none";
    loadCharacters();
});

// ---------------- AUTH STATE ----------------
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        authUiDiv.style.display = "block";
        appContentDiv.style.display = "none";
        return;
    }

    authUiDiv.style.display = "none";
    appContentDiv.style.display = "block";

    loadCharacters();
});


function bindStatListeners() {
    const stats = [statStr, statDex, statCon, statInt, statWis, statCha];

    stats.forEach(el => {
        el.oninput = () => {
            updateAllStats();
            saveCharacter();
        };
    });
}
