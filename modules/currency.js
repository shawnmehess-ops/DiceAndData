// ============================================================
// CURRENCY.JS — Coin helpers: CP, SP, EP, GP, PP
// Standard D&D 5e conversion:
//   1 PP = 10 GP = 20 EP = 100 SP = 1000 CP
// ============================================================

export const COINS = ["cp", "sp", "ep", "gp", "pp"];

export const COIN_LABELS = {
    cp: "Copper",
    sp: "Silver",
    ep: "Electrum",
    gp: "Gold",
    pp: "Platinum",
};

// Value of each coin in copper pieces
export const COIN_VALUE_CP = {
    cp: 1,
    sp: 10,
    ep: 50,
    gp: 100,
    pp: 1000,
};

// Convert a cost object to total copper pieces
export function costToCP(cost = {}) {
    return COINS.reduce((sum, c) => sum + (parseInt(cost[c]) || 0) * COIN_VALUE_CP[c], 0);
}

// Convert a purse object (cp/sp/ep/gp/pp fields) to total copper
export function purseToCP(purse = {}) {
    return costToCP(purse); // same math
}

// Check if purse can afford cost (both as objects)
export function canAfford(purse, cost) {
    return purseToCP(purse) >= costToCP(cost);
}

// Deduct cost from purse.
// Strategy: convert everything to CP, subtract, then re-distribute
// from lowest denomination upward (greedy, no change-making).
// Returns a NEW purse object, or null if insufficient funds.
export function deductCost(purse, cost) {
    const total = purseToCP(purse);
    const price = costToCP(cost);
    if (total < price) return null;

    let remaining = total - price;

    // Re-distribute: PP first (greedy from highest)
    const newPurse = {};
    for (let i = COINS.length - 1; i >= 0; i--) {
        const coin = COINS[i];
        const val  = COIN_VALUE_CP[coin];
        newPurse[coin] = Math.floor(remaining / val);
        remaining      = remaining % val;
    }
    return newPurse;
}

// Format a cost object as a readable string, e.g. "5 GP, 2 SP"
export function formatCost(cost = {}) {
    const parts = COINS
        .filter(c => parseInt(cost[c]) > 0)
        .map(c => `${cost[c]} ${COIN_LABELS[c]}`)
        .reverse(); // PP first
    return parts.length ? parts.join(", ") : "Free";
}

// Build a blank purse
export function zeroPurse() {
    return { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
}

// Extract purse values from a character's flat fields
// Expects state.blocks to be populated
export function purseFromState(state) {
    const purse = zeroPurse();
    const allFields = state.blocks.flatMap(b => b.fields ?? []);
    COINS.forEach(c => {
        const f = allFields.find(f => f.id === `f_coin_${c}`);
        if (f) purse[c] = parseInt(f.value) || 0;
    });
    return purse;
}

// Write purse values back into state fields
export function pursToState(state, purse) {
    const allFields = state.blocks.flatMap(b => b.fields ?? []);
    COINS.forEach(c => {
        const f = allFields.find(f => f.id === `f_coin_${c}`);
        if (f) f.value = purse[c] ?? 0;
    });
}
