// ============================================================
// REGISTRY.JS — Cross-module dependency registry
//
// Replaces the window.__grimoire__ / window.__grimoireClasses__
// etc. globals that were being used to share data and callbacks
// between modules that can't directly import each other without
// creating circular dependencies.
//
// Usage:
//   import { registry } from "./registry.js";
//
//   // Register something (done once, usually at module init):
//   registry.set("myFunction", myFunction);
//   registry.set("MY_DATA", MY_DATA);
//
//   // Call / read it from another module:
//   registry.call("myFunction", arg1, arg2);  // calls if registered
//   registry.get("MY_DATA");                  // returns value or null
//
// All keys are strings. Registering the same key twice overwrites
// the previous value (last writer wins). Getting an unregistered
// key returns null — never throws.
// ============================================================

const _store = new Map();

export const registry = {
    // Store a value (data object or function)
    set(key, value) {
        _store.set(key, value);
    },

    // Retrieve a value, or null if not registered
    get(key) {
        return _store.get(key) ?? null;
    },

    // Call a registered function with optional arguments.
    // Silent no-op if the key isn't registered or isn't a function.
    call(key, ...args) {
        const fn = _store.get(key);
        if (typeof fn === "function") fn(...args);
    },
};