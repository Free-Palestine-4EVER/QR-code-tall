// Demo backend (no Firebase): collections live in localStorage and sync across
// tabs on the same machine via the `storage` event + a same-tab custom event.
// Same API shape as firebase.js so the app code doesn't care which is active.

const keyFor = (name) => `noir.${name}.demo`;
const EVT = "noir.data.changed";

const read = (name) => {
  try {
    return JSON.parse(localStorage.getItem(keyFor(name)) || "[]");
  } catch {
    return [];
  }
};
const write = (name, arr) => {
  localStorage.setItem(keyFor(name), JSON.stringify(arr));
  window.dispatchEvent(new Event(EVT)); // storage event only fires in OTHER tabs
};
const subscribe = (fn) => {
  const h = () => fn();
  window.addEventListener("storage", h);
  window.addEventListener(EVT, h);
  return () => {
    window.removeEventListener("storage", h);
    window.removeEventListener(EVT, h);
  };
};
const uid = (n) => `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;

// ── orders (sequential code) ──
export async function createOrder({ table, items, total, payMethod, name, note }) {
  const all = read("orders");
  const seq = all.reduce((m, o) => Math.max(m, o.seq || 0), 0) + 1;
  const code = `N-${String(seq).padStart(3, "0")}`;
  const order = {
    id: uid(), seq, code, table: Number(table), items, total, payMethod,
    name: name || "", note: note || "",
    paid: false, paymentClaimed: false, status: "new", createdAt: Date.now(),
  };
  write("orders", [...all, order]);
  return { id: order.id, code };
}

export function watchOrder(id, cb) {
  const emit = () => cb(read("orders").find((o) => o.id === id) || null);
  emit();
  return subscribe(emit);
}

export function watchOrders(handler) {
  let prev = new Set();
  const emit = () => {
    const all = read("orders").slice().sort((a, b) => b.createdAt - a.createdAt);
    const added = all.filter((o) => !prev.has(o.id));
    prev = new Set(all.map((o) => o.id));
    handler(all, added);
  };
  emit();
  return subscribe(emit);
}

export const setOrder = (id, patch) =>
  write("orders", read("orders").map((o) => (o.id === id ? { ...o, ...patch } : o)));

// ── generic collections (staff, reminders) ──
export function watchCollection(name, cb) {
  const emit = () => cb(read(name).slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
  emit();
  return subscribe(emit);
}
export async function addItem(name, data) {
  const item = { id: uid(), createdAt: Date.now(), ...data };
  write(name, [...read(name), item]);
  return item.id;
}
export const patchItem = (name, id, patch) =>
  write(name, read(name).map((x) => (x.id === id ? { ...x, ...patch } : x)));
export const removeItem = (name, id) =>
  write(name, read(name).filter((x) => x.id !== id));
