import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const config = JSON.parse(readFileSync(join(root, "config.json"), "utf8"));
const menu = JSON.parse(readFileSync(join(__dirname, "menu.json"), "utf8"));

const dataDir = join(__dirname, "data");
const ordersFile = join(dataDir, "orders.json");
if (!existsSync(dataDir)) mkdirSync(dataDir);
let orders = existsSync(ordersFile) ? JSON.parse(readFileSync(ordersFile, "utf8")) : [];
const flush = () => writeFileSync(ordersFile, JSON.stringify(orders, null, 2));

const app = express();
const http = createServer(app);
const io = new Server(http, { cors: { origin: true } });
app.use(express.json());

const priceOf = (id) => {
  for (const c of menu.categories) {
    const it = c.items.find((i) => i.id === id);
    if (it) return it;
  }
  return null;
};

const publicConfig = {
  brand: config.brand,
  currency: config.currency,
  tables: config.tables,
  alfanLink: config.alfanLink,
};

app.get("/api/config", (_req, res) => res.json(publicConfig));
app.get("/api/menu", (_req, res) => res.json(menu));

// ---- orders ----
let seq = orders.reduce((m, o) => Math.max(m, o.seq || 0), 0);

app.post("/api/orders", (req, res) => {
  const { table, items, payMethod, name, note } = req.body || {};
  const t = parseInt(table, 10);
  if (!t || t < 1 || t > config.tables) return res.status(400).json({ error: "bad_table" });
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: "empty" });
  if (!["alfan", "counter"].includes(payMethod)) return res.status(400).json({ error: "bad_pay" });

  const lines = [];
  for (const { id, qty } of items) {
    const it = priceOf(id);
    const q = Math.min(Math.max(parseInt(qty, 10) || 0, 0), 20);
    if (!it || !q) return res.status(400).json({ error: "bad_item" });
    lines.push({ id, qty: q, price: it.price, name: it.name });
  }
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);

  seq += 1;
  const order = {
    id: Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4),
    seq,
    code: `N-${String(seq).padStart(3, "0")}`,
    table: t,
    items: lines,
    total,
    payMethod,
    paid: false,
    name: (name || "").slice(0, 60),
    note: (note || "").slice(0, 300),
    status: "new", // new -> preparing -> ready -> done | cancelled
    createdAt: Date.now(),
  };
  orders.push(order);
  flush();
  io.to("staff").emit("order:new", order);
  res.json(order);
});

app.get("/api/orders/:id", (req, res) => {
  const o = orders.find((o) => o.id === req.params.id);
  if (!o) return res.status(404).json({ error: "not_found" });
  res.json(o);
});

// customer claims they completed the Alfan payment
app.post("/api/orders/:id/payment-claimed", (req, res) => {
  const o = orders.find((o) => o.id === req.params.id);
  if (!o) return res.status(404).json({ error: "not_found" });
  o.paymentClaimed = true;
  flush();
  io.to("staff").emit("order:update", o);
  res.json(o);
});

// ---- staff (PIN protected) ----
const staffOnly = (req, res, next) => {
  if (req.headers["x-staff-pin"] !== config.staffPin) return res.status(401).json({ error: "pin" });
  next();
};

app.post("/api/staff/login", (req, res) => {
  if ((req.body?.pin || "") !== config.staffPin) return res.status(401).json({ ok: false });
  res.json({ ok: true });
});

app.get("/api/staff/orders", staffOnly, (_req, res) => {
  res.json(orders.slice(-200).reverse());
});

app.patch("/api/staff/orders/:id", staffOnly, (req, res) => {
  const o = orders.find((o) => o.id === req.params.id);
  if (!o) return res.status(404).json({ error: "not_found" });
  const { status, paid } = req.body || {};
  if (status && ["new", "preparing", "ready", "done", "cancelled"].includes(status)) o.status = status;
  if (typeof paid === "boolean") o.paid = paid;
  flush();
  io.to("staff").emit("order:update", o);
  io.to(`order:${o.id}`).emit("order:update", o);
  res.json(o);
});

io.on("connection", (socket) => {
  socket.on("staff:join", (pin) => {
    if (pin === config.staffPin) socket.join("staff");
  });
  socket.on("order:watch", (id) => socket.join(`order:${id}`));
});

// ---- static client (production build) ----
const dist = join(root, "client", "dist");
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api|\/socket\.io).*/, (_req, res) => res.sendFile(join(dist, "index.html")));
}

const PORT = process.env.PORT || 4000;
http.listen(PORT, () => console.log(`NOIR server → http://localhost:${PORT}`));
