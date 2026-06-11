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
import * as demo from "./localStore";

const cfg = {
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_SENDER_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
};

// Real Firestore when configured; otherwise a localStorage demo backend that
// still syncs across tabs on the same machine. The app upgrades automatically
// once VITE_FB_* env vars are set.
export const firebaseReady = Boolean(cfg.projectId && cfg.apiKey);
const db = firebaseReady ? getFirestore(initializeApp(cfg)) : null;

const ms = (ts) => (ts?.toMillis ? ts.toMillis() : ts || Date.now());

async function createOrderFB({ table, items, total, payMethod, name, note }) {
  const counterRef = doc(db, "counters", "orders");
  const ref = doc(collection(db, "orders"));
  let code = "N-001";
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const seq = (snap.exists() ? snap.data().seq : 0) + 1;
    code = `N-${String(seq).padStart(3, "0")}`;
    tx.set(counterRef, { seq }, { merge: true });
    tx.set(ref, {
      seq, code, table: Number(table), items, total, payMethod,
      name: name || "", note: note || "",
      paid: false, paymentClaimed: false, status: "new",
      createdAt: serverTimestamp(),
    });
  });
  return { id: ref.id, code };
}

function watchOrderFB(id, cb) {
  return onSnapshot(doc(db, "orders", id), (s) =>
    cb(s.exists() ? { id: s.id, ...s.data(), createdAt: ms(s.data().createdAt) } : null)
  );
}

function watchOrdersFB(handler) {
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

const setOrderFB = (id, patch) => updateDoc(doc(db, "orders", id), patch);

export const createOrder = firebaseReady ? createOrderFB : demo.createOrder;
export const watchOrder = firebaseReady ? watchOrderFB : demo.watchOrder;
export const watchOrders = firebaseReady ? watchOrdersFB : demo.watchOrders;
export const setOrder = firebaseReady ? setOrderFB : demo.setOrder;
