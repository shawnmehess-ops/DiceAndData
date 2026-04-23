import {
    createUserWithEmailAndPassword, signInWithEmailAndPassword,
    signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";

import { auth }            from "./firebase.js";
import {
    emailInput, passwordInput, signUpButton, signInButton,
    signOutButton, userStatus, authUiDiv, appContentDiv
} from "./ui.js";
import { loadCharacters }  from "./character.js";

export function initAuth() {
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

    signOutButton.onclick = () => signOut(auth);

    onAuthStateChanged(auth, user => {
        authUiDiv.style.display     = user ? "none"  : "block";
        appContentDiv.style.display = user ? "block" : "none";
        userStatus.textContent      = user ? `Signed in as ${user.email}` : "No user signed in.";

        if (user) loadCharacters();
    });
}
