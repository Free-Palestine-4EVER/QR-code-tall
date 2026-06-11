// Demo backend (no Firebase): orders live in localStorage and sync across tabs
// on the same machine via the `storage` event + a same-tab custom event.
// Same API shape as firebase.js so the app code doesn't care which is active.

const KEY = "noir.orders.demo";
const EVT = "noir.orders.changed";

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
};
const write = (arr) => {
  localStorage.setItem(KEY, JSON.stringify(arr));
  window.dispatchEvent(new Event(EVT)); // notify this tab (storage event only fires in other tabs)
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

export async function createOrder({ table, items, total, payMethod, name, note }) {
  const all = read();
  const seq = all.reduce((m, o) => Math.max(m, o.seq || 0), 0) + 1;
  const code = `N-${String(seq).padStart(3, "0")}`;
  const order = {
    id: `${Date.now().toString(36)}${Math.floor((seq * 97) % 1000)}`,
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
    createdAt: Date.now(),
  };
  write([...all, order]);
  return { id: order.id, code };
}

export function watchOrder(id, cb) {
  const emit = () => cb(read().find((o) => o.id === id) || null);
  emit();
  return subscribe(emit);
}

export function watchOrders(handler) {
  let prev = new Set();
  const emit = () => {
    const all = read().slice().sort((a, b) => b.createdAt - a.createdAt);
    const added = all.filter((o) => !prev.has(o.id));
    prev = new Set(all.map((o) => o.id));
    handler(all, added);
  };
  emit();
  return subscribe(emit);
}

export async function setOrder(id, patch) {
  write(read().map((o) => (o.id === id ? { ...o, ...patch } : o)));
}
