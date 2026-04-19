import {
    getFirestore,
    doc,
    setDoc,
    getDoc
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
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');

const signUpButton = document.getElementById('signUpButton');
const signInButton = document.getElementById('signInButton');
const signOutButton = document.getElementById('signOutButton');

const userStatus = document.getElementById('userStatus');
const authUiDiv = document.getElementById('auth-ui');
const appContentDiv = document.getElementById('app-content');

const testField = document.getElementById('testField');
const saveButton = document.getElementById('saveButton');
const saveStatus = document.getElementById('saveStatus');

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

// ---------------- SAVE BUTTON ----------------
saveButton.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) return;

    await setDoc(doc(db, "users", user.uid), {
        text: testField.value
    }, { merge: true });

    saveStatus.innerText = "Saved!";
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

    authUiDiv.style.display = 'none';
    appContentDiv.style.display = 'block';
    signOutButton.style.display = 'inline';

    userStatus.innerText =
        `Logged in: ${user.email} (UID: ${user.uid})`;

    // Load user data
    const snap = await getDoc(doc(db, "users", user.uid));

    if (snap.exists()) {
        const data = snap.data();
        testField.value = data.text || "";
        saveStatus.innerText = "Data loaded.";
    } else {
        testField.value = "";
        saveStatus.innerText = "No saved data yet.";
    }
});
