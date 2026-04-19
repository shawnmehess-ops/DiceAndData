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

// ---------------- FIREBASE CONFIG ----------------
const firebaseConfig = {
    apiKey: "AIzaSyBYYgS04lxcbeawj7WDahEN7SbzYgVGLjE",
    authDomain: "diceanddata-81ebe.firebaseapp.com",
    projectId: "diceanddata-81ebe",
    storageBucket: "diceanddata-81ebe.firebasestorage.app",
    messagingSenderId: "547850961878",
    appId: "1:547850961878:web:8b2a99076d66c0ab451a77",
    measurementId: "G-LSZ59FPDTL"
};

// ---------------- INIT ----------------
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

const characterListView = document.getElementById('characterListView');
const characterList = document.getElementById('characterList');

const charNameInput = document.getElementById('charNameInput');
const createCharButton = document.getElementById('createCharButton');

const editor = document.getElementById('editor');
const editorTitle = document.getElementById('editorTitle');
const editName = document.getElementById('editName');
const editClass = document.getElementById('editClass');
const editLevel = document.getElementById('editLevel');
const editorStatus = document.getElementById('editorStatus');

const backButton = document.getElementById('backButton');
const deleteCharButton = document.getElementById('deleteCharButton');

// ---------------- SIGN UP ----------------
signUpButton.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    try {
        const userCredential =
            await createUserWithEmailAndPassword(auth, email, password);

        const user = userCredential.user;

        userStatus.innerText = `Signed up as: ${user.email}`;

        await setDoc(doc(db, "users", user.uid), {
            message: "Hello " + user.email,
            createdAt: Date.now()
        }, { merge: true });

        passwordInput.value = '';
    } catch (err) {
        userStatus.innerText = `Sign Up Error: ${err.message}`;
    }
});

// ---------------- SIGN IN ----------------
signInButton.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    try {
        const userCredential =
            await signInWithEmailAndPassword(auth, email, password);

        const user = userCredential.user;
        userStatus.innerText = `Logged in as: ${user.email}`;

        passwordInput.value = '';
    } catch (err) {
        userStatus.innerText = `Sign In Error: ${err.message}`;
    }
});

// ---------------- SIGN OUT ----------------
signOutButton.addEventListener('click', async () => {
    await signOut(auth);

    userStatus.innerText = 'No user signed in.';
    emailInput.value = '';
    passwordInput.value = '';
});

// ---------------- CREATE CHARACTER ----------------
createCharButton.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) return;

    const name = charNameInput.value.trim();
    if (!name) return;

    await addDoc(
        collection(db, "users", user.uid, "characters"),
        {
            name,
            class: "Unknown",
            level: 1,
            createdAt: Date.now()
        }
    );

    charNameInput.value = "";
    loadCharacters();
});

// ---------------- LOAD CHARACTERS ----------------
async function loadCharacters() {
    const user = auth.currentUser;
    if (!user) return;

    const snap = await getDocs(
        collection(db, "users", user.uid, "characters")
    );

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

    characterListView.style.display = "none";
    editor.style.display = "block";

    editorTitle.innerText = `Editing: ${data.name}`;

    editName.value = data.name || "";
    editClass.value = data.class || "";
    editLevel.value = data.level || 1;

    editorStatus.innerText = "";
}

// ---------------- SAVE CHARACTER ----------------
async function saveCharacter() {
    const user = auth.currentUser;
    if (!user || !currentCharId) return;

    await setDoc(
        doc(db, "users", user.uid, "characters", currentCharId),
        {
            name: editName.value,
            class: editClass.value,
            level: parseInt(editLevel.value) || 1
        },
        { merge: true }
    );

    editorStatus.innerText = "Saved.";

    loadCharacters();
}

// auto-save
editName.addEventListener("input", saveCharacter);
editClass.addEventListener("input", saveCharacter);
editLevel.addEventListener("input", saveCharacter);

// ---------------- DELETE CHARACTER ----------------
deleteCharButton.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user || !currentCharId) return;

    const ok = confirm("Delete this character? This cannot be undone.");
    if (!ok) return;

    await deleteDoc(
        doc(db, "users", user.uid, "characters", currentCharId)
    );

    currentCharId = null;

    editor.style.display = "none";
    characterListView.style.display = "block";

    loadCharacters();
});

// ---------------- BACK BUTTON ----------------
backButton.addEventListener("click", () => {
    currentCharId = null;

    editor.style.display = "none";
    characterListView.style.display = "block";

    loadCharacters();
});

// ---------------- AUTH STATE ----------------
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        authUiDiv.style.display = "block";
        appContentDiv.style.display = "none";
        signOutButton.style.display = "none";
        return;
    }

    authUiDiv.style.display = "none";
    appContentDiv.style.display = "block";
    signOutButton.style.display = "inline";

    characterListView.style.display = "block";
    editor.style.display = "none";

    userStatus.innerText = `Logged in: ${user.email}`;

    await loadCharacters();
});
