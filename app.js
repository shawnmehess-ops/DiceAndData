import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    collection,
    addDoc,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";

// Firebase config
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

// DOM refs
let currentCharId = null;

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
const editName = document.getElementById('editName');
const editClass = document.getElementById('editClass');
const editLevel = document.getElementById('editLevel');
const editorStatus = document.getElementById('editorStatus');

// ---------------- SIGN UP ----------------
signUpButton.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    try {
        const userCredential =
            await createUserWithEmailAndPassword(auth, email, password);

        const user = userCredential.user;

        userStatus.innerText = `Signed up as: ${user.email}`;

        // Create initial document (merge-safe)
        await setDoc(doc(db, "users", user.uid), {
            message: "Hello " + user.email,
            randomValue: Math.random()
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

// ---------------- AUTH STATE ----------------
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        authUiDiv.style.display = 'block';
        appContentDiv.style.display = 'none';
        signOutButton.style.display = 'inline';
        userStatus.innerText = 'No user signed in.';
        return;
    }

    await loadCharacters();
    
    authUiDiv.style.display = 'none';
    appContentDiv.style.display = 'block';
    signOutButton.style.display = 'inline';

    userStatus.innerText =
        `Logged in: ${user.email} (UID: ${user.uid})`;
});

createCharButton.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) return;

    const name = charNameInput.value.trim();
    if (!name) return;

    await addDoc(
        collection(db, "users", user.uid, "characters"),
        {
            name: name,
            class: "Unknown",
            level: 1,
            createdAt: Date.now()
        }
    );

    charNameInput.value = "";
    loadCharacters();
});

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
        li.textContent = `${data.name} (Lv ${data.level})`;

        li.addEventListener("click", () => {
            openCharacter(docSnap.id, data);
        });

        characterList.appendChild(li);
    });
}

function openCharacter(id, data) {
    currentCharId = id;

    editor.style.display = "block";

    editName.value = data.name || "";
    editClass.value = data.class || "";
    editLevel.value = data.level || 1;

    editorStatus.innerText = "Loaded character.";
}

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
    loadCharacters(); // update list display
}

editName.addEventListener("input", saveCharacter);
editClass.addEventListener("input", saveCharacter);
editLevel.addEventListener("input", saveCharacter);
