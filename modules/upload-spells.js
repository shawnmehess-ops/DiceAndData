// ============================================================
// upload-spells.js
//
// Uploads spells from a JSON file to Firestore and removes
// duplicates (matched by name, case-insensitive).
//
// SETUP
//   1. npm install firebase-admin
//   2. Download your Firebase service account key:
//        Firebase Console → Project Settings → Service Accounts
//        → Generate new private key → save as serviceAccountKey.json
//        in the same folder as this script.
//   3. Place your spells JSON file in the same folder.
//      Default filename: spells.json
//
// USAGE
//   node upload-spells.js                   # upload spells.json
//   node upload-spells.js my-spells.json    # upload a named file
//   node upload-spells.js --dedup-only      # only remove duplicates, no upload
//   node upload-spells.js --dry-run         # preview without writing anything
// ============================================================

import { readFileSync } from "fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

// ---- Config ------------------------------------------------
const COLLECTION     = "spells";
const KEY_FILE       = "./serviceAccountKey.json";
const DEFAULT_INPUT  = "./spells.json";

// ---- Args --------------------------------------------------
const args       = process.argv.slice(2);
const dedupOnly  = args.includes("--dedup-only");
const dryRun     = args.includes("--dry-run");
const inputFile  = args.find(a => !a.startsWith("--")) ?? DEFAULT_INPUT;

// ---- Init Firebase Admin -----------------------------------
let serviceAccount;
try {
    serviceAccount = JSON.parse(readFileSync(KEY_FILE, "utf8"));
} catch {
    console.error(`\n✗ Could not read ${KEY_FILE}`);
    console.error("  Download it from: Firebase Console → Project Settings → Service Accounts\n");
    process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ---- Helpers -----------------------------------------------
function normalizeName(name) {
    return name.trim().toLowerCase();
}

function log(msg)  { console.log(msg); }
function warn(msg) { console.warn(`  ⚠  ${msg}`); }
function ok(msg)   { console.log(`  ✓  ${msg}`); }
function err(msg)  { console.error(`  ✗  ${msg}`); }

// ---- Load existing spells from Firestore -------------------
async function loadExisting() {
    const snap = await db.collection(COLLECTION).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ---- Deduplicate -------------------------------------------
// Keeps the first document found for each name (by Firestore order),
// deletes all subsequent duplicates.
async function deduplicateSpells(existing) {
    log(`\n── Duplicate check ─────────────────────────────`);

    const seen    = new Map(); // normName → first doc id
    const toDelete = [];

    for (const doc of existing) {
        const key = normalizeName(doc.name ?? "");
        if (!key) { warn(`Document ${doc.id} has no name — skipping`); continue; }

        if (seen.has(key)) {
            toDelete.push({ id: doc.id, name: doc.name });
        } else {
            seen.set(key, doc.id);
        }
    }

    if (!toDelete.length) {
        ok("No duplicates found.");
        return 0;
    }

    log(`  Found ${toDelete.length} duplicate(s):`);
    toDelete.forEach(d => log(`    – "${d.name}" (id: ${d.id})`));

    if (dryRun) {
        warn("Dry run — no deletions performed.");
        return toDelete.length;
    }

    // Delete in batches of 500 (Firestore batch limit)
    let deleted = 0;
    for (let i = 0; i < toDelete.length; i += 500) {
        const batch = db.batch();
        toDelete.slice(i, i + 500).forEach(d => {
            batch.delete(db.collection(COLLECTION).doc(d.id));
            deleted++;
        });
        await batch.commit();
    }

    ok(`Deleted ${deleted} duplicate(s).`);
    return deleted;
}

// ---- Upload spells -----------------------------------------
async function uploadSpells(spells, existing) {
    log(`\n── Upload ──────────────────────────────────────`);
    log(`  Input file:  ${inputFile}`);
    log(`  Spells to upload: ${spells.length}`);

    // Build set of existing names for skip-checking
    const existingNames = new Set(existing.map(d => normalizeName(d.name ?? "")));

    const toUpload = [];
    const skipped  = [];

    for (const spell of spells) {
        if (!spell.name?.trim()) { warn(`Spell missing name — skipped`); continue; }
        const key = normalizeName(spell.name);
        if (existingNames.has(key)) {
            skipped.push(spell.name);
        } else {
            toUpload.push(spell);
            existingNames.add(key); // prevent duplicates within the input file too
        }
    }

    if (skipped.length) {
        log(`\n  Already in Firestore (skipped):`);
        skipped.forEach(n => log(`    – ${n}`));
    }

    if (!toUpload.length) {
        ok("Nothing new to upload.");
        return 0;
    }

    log(`\n  Uploading ${toUpload.length} new spell(s):`);
    toUpload.forEach(s => log(`    + ${s.name} (level ${s.level ?? 0}, ${s.school ?? "?"})`));

    if (dryRun) {
        warn("Dry run — no writes performed.");
        return toUpload.length;
    }

    // Write in batches of 500
    let uploaded = 0;
    const now    = Date.now();

    for (let i = 0; i < toUpload.length; i += 500) {
        const batch = db.batch();
        toUpload.slice(i, i + 500).forEach(spell => {
            const ref = db.collection(COLLECTION).doc();
            batch.set(ref, {
                // Core spell fields with safe defaults
                name:          spell.name.trim(),
                level:         parseInt(spell.level) ?? 0,
                school:        spell.school        ?? "",
                castingTime:   spell.castingTime   ?? "1 action",
                range:         spell.range         ?? "Self",
                duration:      spell.duration      ?? "Instantaneous",
                components: {
                    verbal:    spell.components?.verbal    ?? false,
                    somatic:   spell.components?.somatic   ?? false,
                    material:  spell.components?.material  ?? false,
                    materials: spell.components?.materials ?? "",
                },
                concentration: spell.concentration ?? false,
                ritual:        spell.ritual        ?? false,
                description:   spell.description   ?? "",
                requirements:  spell.requirements  ?? [],
                // Approval metadata — admin upload = auto-approved
                status:        "approved",
                submittedBy:   "seed-script",
                submittedAt:   now,
                approvedBy:    "seed-script",
                approvedAt:    now,
            });
            uploaded++;
        });
        await batch.commit();
    }

    ok(`Uploaded ${uploaded} spell(s).`);
    return uploaded;
}

// ---- Main --------------------------------------------------
async function main() {
    log(`\n╔══════════════════════════════════════════════╗`);
    log(`║         Grimoire — Spell Uploader            ║`);
    log(`╚══════════════════════════════════════════════╝`);
    if (dryRun) log(`  [DRY RUN — no changes will be made]\n`);

    // Load existing docs first (needed by both paths)
    log(`\n── Loading existing spells from Firestore ──────`);
    let existing;
    try {
        existing = await loadExisting();
        ok(`Found ${existing.length} existing spell(s).`);
    } catch (e) {
        err(`Failed to read Firestore: ${e.message}`);
        process.exit(1);
    }

    // Dedup first (so upload skip-check is accurate)
    const deleted = await deduplicateSpells(existing);
    if (deleted > 0 && !dryRun) {
        // Reload after deletions so upload sees the cleaned state
        existing = await loadExisting();
    }

    // Upload
    if (!dedupOnly) {
        let spells;
        try {
            const raw = readFileSync(inputFile, "utf8");
            spells    = JSON.parse(raw);
            if (!Array.isArray(spells)) throw new Error("JSON must be an array of spell objects.");
        } catch (e) {
            err(`Could not read ${inputFile}: ${e.message}`);
            process.exit(1);
        }

        await uploadSpells(spells, existing);
    }

    log(`\n── Done ────────────────────────────────────────\n`);
    process.exit(0);
}

main().catch(e => {
    console.error("\nFatal error:", e);
    process.exit(1);
});
