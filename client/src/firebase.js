import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  limit,
  runTransaction,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

const cfg = {
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_SENDER_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
};

// If Firebase isn't configured yet, the app shows a setup screen instead of crashing.
export const firebaseReady = Boolean(cfg.projectId && cfg.apiKey);
const db = firebaseReady ? getFirestore(initializeApp(cfg)) : null;

const ms = (ts) => (ts?.toMillis ? ts.toMillis() : ts || Date.now());

/** Create an order with a sequential code (N-001…) via a transaction. */
export async function createOrder({ table, items, total, payMethod, name, note }) {
  const counterRef = doc(db, "counters", "orders");
  const ref = doc(collection(db, "orders"));
  let code = "N-001";
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const seq = (snap.exists() ? snap.data().seq : 0) + 1;
    code = `N-${String(seq).padStart(3, "0")}`;
    tx.set(counterRef, { seq }, { merge: true });
    tx.set(ref, {
      seq,
      code,
      table: Number(table),
      items,
      total,
      payMethod,
      name: name || "",
      note: note || "",
      paid: false,
      paymentClaimed: false,
      status: "new",
      createdAt: serverTimestamp(),
    });
  });
  return { id: ref.id, code };
}

/** Live single order (customer status page). */
export function watchOrder(id, cb) {
  return onSnapshot(doc(db, "orders", id), (s) =>
    cb(s.exists() ? { id: s.id, ...s.data(), createdAt: ms(s.data().createdAt) } : null)
  );
}

/** Live order feed (employee app). handler(orders, addedOrders). */
export function watchOrders(handler) {
  const q = query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(200));
  return onSnapshot(q, (snap) => {
    const map = (d) => ({ id: d.id, ...d.data(), createdAt: ms(d.data().createdAt) });
    const orders = snap.docs.map(map);
    const added = snap
      .docChanges()
      .filter((c) => c.type === "added" && !c.doc.metadata.hasPendingWrites)
      .map((c) => map(c.doc));
    handler(orders, added);
  });
}

export const setOrder = (id, patch) => updateDoc(doc(db, "orders", id), patch);
