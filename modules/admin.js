// ============================================================
// ADMIN.JS — Admin panel: approve/reject/hide/edit items
//
// Admin UIDs are set in ADMIN_UIDS below.
// Future: migrate to a Firestore-backed role document.
//
// Campaign DM hook (stub):
//   When campaign support lands, DMs will also come through here
//   with a reduced permission set (campaign-scoped items only).
// ============================================================
import {
    collection, getDocs, doc, updateDoc, deleteDoc, addDoc,
    query, orderBy
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

import { db, auth } from "./firebase.js";

// ---- Set your Firebase UID here to get admin access --------
// Find your UID in the Firebase console under Authentication.
const ADMIN_UIDS = [
    "Xh7I67tJ20bxV9SPbwFJ9BH0EO43",
];

export function isAdmin() {
    const uid = auth.currentUser?.uid;
    return uid ? ADMIN_UIDS.includes(uid) : false;
}

// ---- Load all items (admin sees all statuses) --------------
async function loadAllItems() {
    const q    = query(collection(db, "items"), orderBy("submittedAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ---- Status actions ----------------------------------------
export async function approveItem(itemId) {
    await updateDoc(doc(db, "items", itemId), {
        status:     "approved",
        approvedBy: auth.currentUser?.uid,
        approvedAt: Date.now(),
    });
}

export async function rejectItem(itemId) {
    await deleteDoc(doc(db, "items", itemId));
}

export async function hideItem(itemId) {
    await updateDoc(doc(db, "items", itemId), { status: "hidden" });
}

export async function unhideItem(itemId) {
    await updateDoc(doc(db, "items", itemId), { status: "approved" });
}

export async function setPendingItem(itemId) {
    await updateDoc(doc(db, "items", itemId), { status: "pending" });
}

// ---- Add item directly (admin bypass — no approval needed) -
export async function adminAddItem(itemData) {
    await addDoc(collection(db, "items"), {
        ...itemData,
        status:      "approved",
        submittedBy: auth.currentUser?.uid,
        submittedAt: Date.now(),
        approvedBy:  auth.currentUser?.uid,
        approvedAt:  Date.now(),
    });
}

// ---- Render admin panel ------------------------------------
export async function renderAdminPanel() {
    const container = document.getElementById("adminPanelContent");
    if (!container) return;

    container.innerHTML = `<p class="admin-loading">Loading items…</p>`;

    const items = await loadAllItems();

    const groups = { pending: [], approved: [], hidden: [] };
    items.forEach(item => {
        const bucket = groups[item.status] ?? groups.pending;
        bucket.push(item);
    });

    container.innerHTML = "";

    const STATUS_CONFIG = [
        { key: "pending",  label: "Pending Approval", cls: "admin-group--pending"  },
        { key: "approved", label: "Approved",          cls: "admin-group--approved" },
        { key: "hidden",   label: "Hidden",            cls: "admin-group--hidden"   },
    ];

    STATUS_CONFIG.forEach(({ key, label, cls }) => {
        const section = document.createElement("div");
        section.className = `admin-group ${cls}`;

        const heading = document.createElement("h4");
        heading.textContent = `${label} (${groups[key].length})`;
        section.appendChild(heading);

        if (!groups[key].length) {
            const empty = document.createElement("p");
            empty.className   = "admin-empty";
            empty.textContent = "None.";
            section.appendChild(empty);
        }

        groups[key].forEach(item => {
            const row = document.createElement("div");
            row.className = "admin-item-row";
            row.dataset.itemId = item.id;

            const info = document.createElement("div");
            info.className = "admin-item-info";
            info.innerHTML = `
                <strong class="admin-item-name">${item.name}</strong>
                <span class="admin-item-cat">${item.category}</span>
                <span class="admin-item-submitter">by ${item.submittedBy?.slice(0, 8) ?? "?"}…</span>
            `;

            const actions = document.createElement("div");
            actions.className = "admin-item-actions";

            if (key === "pending") {
                const approveBtn = makeAdminBtn("Approve", "admin-btn--approve");
                approveBtn.onclick = async () => {
                    await approveItem(item.id);
                    renderAdminPanel();
                };
                const rejectBtn = makeAdminBtn("Delete", "admin-btn--reject");
                rejectBtn.onclick = async () => {
                    if (!confirm(`Permanently delete "${item.name}"?`)) return;
                    await rejectItem(item.id);
                    renderAdminPanel();
                };
                actions.append(approveBtn, rejectBtn);
            }

            if (key === "approved") {
                const hideBtn = makeAdminBtn("Hide", "admin-btn--hide");
                hideBtn.onclick = async () => {
                    await hideItem(item.id);
                    renderAdminPanel();
                };
                const deleteBtn = makeAdminBtn("Delete", "admin-btn--reject");
                deleteBtn.onclick = async () => {
                    if (!confirm(`Permanently delete "${item.name}"?`)) return;
                    await rejectItem(item.id);
                    renderAdminPanel();
                };
                actions.append(hideBtn, deleteBtn);
            }

            if (key === "hidden") {
                const unhideBtn = makeAdminBtn("Unhide", "admin-btn--approve");
                unhideBtn.onclick = async () => {
                    await unhideItem(item.id);
                    renderAdminPanel();
                };
                const deleteBtn = makeAdminBtn("Delete", "admin-btn--reject");
                deleteBtn.onclick = async () => {
                    if (!confirm(`Permanently delete "${item.name}"?`)) return;
                    await rejectItem(item.id);
                    renderAdminPanel();
                };
                actions.append(unhideBtn, deleteBtn);
            }

            row.append(info, actions);
            section.appendChild(row);
        });

        container.appendChild(section);
    });
}

function makeAdminBtn(label, cls) {
    const btn = document.createElement("button");
    btn.className   = `admin-btn ${cls}`;
    btn.textContent = label;
    return btn;
}

// ---- Init --------------------------------------------------
export function initAdmin() {
    if (!isAdmin()) return;

    // Show the admin tab in the shop modal
    const adminTab = document.getElementById("adminTab");
    if (adminTab) adminTab.style.display = "inline-block";

    document.getElementById("adminRefreshBtn")?.addEventListener("click", renderAdminPanel);
}
