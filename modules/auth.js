// ============================================================
// AUTH.JS — Sign in, sign up, sign out, auth state
// ============================================================
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    fetchSignInMethodsForEmail
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";

import { auth }           from "./firebase.js";
import { signOutButton,
         authUiDiv,
         appContentDiv }  from "./ui.js";
import { loadCharacters } from "./character.js";

// ---- DOM refs (all local to auth panel) --------------------
const tabSignIn   = document.getElementById("tabSignIn");
const tabSignUp   = document.getElementById("tabSignUp");
const panelSignIn = document.getElementById("panelSignIn");
const panelSignUp = document.getElementById("panelSignUp");

const siEmail     = document.getElementById("siEmail");
const siPassword  = document.getElementById("siPassword");
const siMsg       = document.getElementById("siMsg");
const formSignIn  = document.getElementById("formSignIn");

const suEmail     = document.getElementById("suEmail");
const suPassword  = document.getElementById("suPassword");
const suConfirm   = document.getElementById("suConfirm");
const suMsg       = document.getElementById("suMsg");
const formSignUp  = document.getElementById("formSignUp");

// ---- Error message with flash animation --------------------
function showMsg(el, text, type = "error") {
    el.textContent  = text;
    el.className    = `auth-msg auth-msg--${type}`;
    // Remove and re-add flash class to re-trigger animation
    el.classList.remove("auth-msg--flash");
    void el.offsetWidth; // force reflow
    el.classList.add("auth-msg--flash");
}

function clearMsg(el) {
    el.textContent = "";
    el.className   = "auth-msg";
}

// ---- Friendly Firebase error messages ----------------------
function friendlyError(code, context) {
    switch (code) {
        // Sign-in errors
        case "auth/user-not-found":
        case "auth/invalid-credential":
        case "auth/wrong-password":
            return context === "signin"
                ? "Incorrect email or password. Remember: password must be at least 6 characters."
                : "Incorrect credentials.";
        case "auth/invalid-email":
            return "That doesn't look like a valid email format (e.g. name@domain.ext).";
        case "auth/too-many-requests":
            return "Too many failed attempts. Please wait a moment before trying again.";
        case "auth/user-disabled":
            return "This account has been disabled. Please contact support.";

        // Sign-up errors
        case "auth/email-already-in-use":
            return "An account with that email already exists. Try signing in instead.";
        case "auth/weak-password":
            return "Password must be at least 6 characters long.";

        // Network / server errors
        case "auth/network-request-failed":
            return "Could not reach the account server. Please check your internet connection — if your connection is fine, the account management server may be temporarily unavailable (this is not your fault).";
        case "auth/internal-error":
        case "auth/api-key-not-valid":
        case "auth/app-deleted":
            return "The account management server is not responding. This is not related to your login details — please try again shortly.";

        default:
            // Catch-all for any other firebase errors — check for network hint
            return "Something went wrong. If you have internet access, the account management server may be temporarily unavailable (this is not your fault). Please try again.";
    }
}

// ---- Tab switching -----------------------------------------
function switchTab(tab) {
    const isSignIn = tab === "signin";

    tabSignIn.classList.toggle("auth-tab--active", isSignIn);
    tabSignUp.classList.toggle("auth-tab--active", !isSignIn);

    tabSignIn.setAttribute("aria-selected", isSignIn ? "true" : "false");
    tabSignUp.setAttribute("aria-selected", isSignIn ? "false" : "true");

    panelSignIn.classList.toggle("auth-panel--hidden", !isSignIn);
    panelSignUp.classList.toggle("auth-panel--hidden", isSignIn);

    clearMsg(siMsg);
    clearMsg(suMsg);
}

// ---- Eye toggle (show/hide password) -----------------------
function initEyeToggles() {
    document.querySelectorAll(".auth-eye").forEach(btn => {
        btn.addEventListener("click", () => {
            const input   = document.getElementById(btn.dataset.target);
            const showing = input.type === "text";
            input.type    = showing ? "password" : "text";
            btn.textContent    = showing ? "👁" : "🙈";
            btn.setAttribute("aria-label", showing ? "Show password" : "Hide password");
        });
    });
}

// ---- Sign In -----------------------------------------------
function initSignIn() {
    formSignIn.addEventListener("submit", async e => {
        e.preventDefault();
        clearMsg(siMsg);

        const email    = siEmail.value.trim();
        const password = siPassword.value;

        if (!email || !password) {
            showMsg(siMsg, "Please enter your email and password.");
            return;
        }

        try {
            await signInWithEmailAndPassword(auth, email, password);
            // onAuthStateChanged handles the rest
        } catch (err) {
            showMsg(siMsg, friendlyError(err.code, "signin"));
        }
    });
}

// ---- Sign Up -----------------------------------------------
function initSignUp() {
    formSignUp.addEventListener("submit", async e => {
        e.preventDefault();
        clearMsg(suMsg);

        const email    = suEmail.value.trim();
        const password = suPassword.value;
        const confirm  = suConfirm.value;

        // Client-side validation first
        if (!email) {
            showMsg(suMsg, "Please enter an email address.");
            return;
        }

        if (password.length < 6) {
            showMsg(suMsg, "Password must be at least 6 characters long.");
            return;
        }

        if (password !== confirm) {
            showMsg(suMsg, "Passwords do not match.");
            return;
        }

        try {
            await createUserWithEmailAndPassword(auth, email, password);
            // onAuthStateChanged handles the rest
        } catch (err) {
            showMsg(suMsg, friendlyError(err.code, "signup"));
        }
    });
}

// ---- Main entry point --------------------------------------
export function initAuth() {
    initEyeToggles();
    initSignIn();
    initSignUp();

    tabSignIn.addEventListener("click", () => switchTab("signin"));
    tabSignUp.addEventListener("click", () => switchTab("signup"));

    signOutButton.onclick = () => signOut(auth);

    onAuthStateChanged(auth, user => {
        authUiDiv.style.display     = user ? "none"  : "block";
        appContentDiv.style.display = user ? "block" : "none";

        if (user) loadCharacters();
    });
}
