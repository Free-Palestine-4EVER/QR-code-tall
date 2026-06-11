import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CONFIG } from "../data/config";
import { watchOrders, setOrder, watchCollection, addItem, patchItem, removeItem } from "../firebase";
import { stats, money } from "./analytics";

const CUR = CONFIG.currency.en;
const easing = [0.22, 1, 0.36, 1];

const chime = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + i * 0.18 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.6);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.18);
      o.stop(ctx.currentTime + i * 0.18 + 0.65);
    });
  } catch {}
};

const ago = (ts) => {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};

const NAV = [
  ["overview", "Overview", "◈"],
  ["orders", "Orders", "❑"],
  ["floor", "Floor", "▦"],
  ["sales", "Sales", "📈"],
  ["team", "Team", "👤"],
  ["reminders", "Reminders", "✓"],
];

export default function Dashboard({ onLogout }) {
  const [tab, setTab] = useState("overview");
  const [orders, setOrders] = useState([]);
  const [staff, setStaff] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [, tick] = useState(0);
  const freshIds = useRef(new Set());

  useEffect(() => {
    const iv = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    Notification?.requestPermission?.();
    let first = true;
    const u1 = watchOrders((all, added) => {
      setOrders(all);
      if (first) {
        first = false;
        return;
      }
      added.forEach((o) => {
        freshIds.current.add(o.id);
        chime();
        if (Notification.permission === "granted")
          new Notification(`New order — Table ${o.table}`, {
            body: o.items.map((l) => `${l.qty}× ${l.name.en}`).join(", "),
          });
        setTimeout(() => {
          freshIds.current.delete(o.id);
          tick((n) => n + 1);
        }, 12000);
      });
    });
    const u2 = watchCollection("staff", setStaff);
    const u3 = watchCollection("reminders", setReminders);
    return () => {
      u1 && u1();
      u2 && u2();
      u3 && u3();
    };
  }, []);

  const active = orders.filter((o) => !["done", "cancelled"].includes(o.status));
  const today = stats(orders, "day");
  const openReminders = reminders.filter((r) => !r.done).length;

  return (
    <div className="dash" dir="ltr" lang="en">
      <aside className="dash-nav">
        <div className="dash-brand">
          <div className="monogram" style={{ width: 36, height: 36, margin: 0 }}><span style={{ fontSize: 15 }}>N</span></div>
          <div>
            <div className="db-name">NOIR</div>
            <div className="db-sub">Service Console</div>
          </div>
        </div>
        <nav>
          {NAV.map(([k, label, icon]) => (
            <button key={k} className={`db-tab ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>
              <span className="db-ic">{icon}</span>
              <span>{label}</span>
              {k === "orders" && active.length > 0 && <span className="db-badge">{active.length}</span>}
              {k === "reminders" && openReminders > 0 && <span className="db-badge">{openReminders}</span>}
            </button>
          ))}
        </nav>
        <button className="db-logout" onClick={onLogout}>Lock ⏻</button>
      </aside>

      <main className="dash-main">
        <header className="dash-top">
          <div>
            <h1>{NAV.find((n) => n[0] === tab)[1]}</h1>
            <span className="dash-date">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</span>
          </div>
          <div className="dash-top-r">
            <span className="live"><span className="dot" />live</span>
            <span className="db-pill">{money(today.revenue)} {CUR} today</span>
            <span className="db-pill alt">{active.length} active</span>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: easing }}>
            {tab === "overview" && <Overview orders={orders} active={active} staff={staff} reminders={reminders} setTab={setTab} />}
            {tab === "orders" && <Orders orders={orders} fresh={freshIds.current} />}
            {tab === "floor" && <Floor orders={orders} />}
            {tab === "sales" && <Sales orders={orders} />}
            {tab === "team" && <Team staff={staff} />}
            {tab === "reminders" && <Reminders reminders={reminders} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

/* ───────────────────────── Overview ───────────────────────── */
function Overview({ orders, active, staff, reminders, setTab }) {
  const d = stats(orders, "day");
  const onShift = staff.filter((s) => s.onShift);
  const kpis = [
    { label: "Sales today", value: `${money(d.revenue)}`, unit: CUR, hint: `${d.count} orders` },
    { label: "Avg. order", value: `${money(d.aov)}`, unit: CUR, hint: `${d.covers} items sold` },
    { label: "Active orders", value: active.length, hint: `${orders.filter((o) => o.status === "new").length} new` },
    { label: "Paid today", value: `${money(d.paid)}`, unit: CUR, hint: `${money(d.revenue - d.paid)} pending` },
  ];
  return (
    <div className="ov">
      <div className="kpis">
        {kpis.map((k) => (
          <div className="kpi" key={k.label}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}{k.unit && <small> {k.unit}</small>}</div>
            <div className="kpi-hint">{k.hint}</div>
          </div>
        ))}
      </div>

      <div className="ov-grid">
        <Panel title="Live activity" action={{ label: "All orders →", onClick: () => setTab("orders") }}>
          {active.length === 0 ? (
            <Empty>No active orders right now</Empty>
          ) : (
            active.slice(0, 6).map((o) => (
              <div className="row-line" key={o.id}>
                <span className="rl-tbl">T{o.table}</span>
                <span className="rl-mid">{o.code} · {o.items.reduce((n, l) => n + l.qty, 0)} items</span>
                <span className={`chip s-${o.status}`}>{o.status}</span>
                <span className="rl-amt">{money(o.total)} {CUR}</span>
              </div>
            ))
          )}
        </Panel>

        <Panel title="On shift" action={{ label: "Team →", onClick: () => setTab("team") }}>
          {onShift.length === 0 ? (
            <Empty>Nobody clocked in</Empty>
          ) : (
            onShift.map((s) => (
              <div className="row-line" key={s.id}>
                <span className="avatar">{(s.name || "?")[0]}</span>
                <span className="rl-mid">{s.name}<small> · {s.role}</small></span>
                <span className="chip s-ready">in {ago(s.clockInAt)}</span>
              </div>
            ))
          )}
        </Panel>

        <Panel title="Top sellers today">
          {d.topItems.length === 0 ? <Empty>No sales yet today</Empty> : <BarList items={d.topItems.map((i) => ({ label: i.name, value: i.qty }))} suffix="×" />}
        </Panel>

        <Panel title="Reminders" action={{ label: "Open →", onClick: () => setTab("reminders") }}>
          {reminders.filter((r) => !r.done).length === 0 ? (
            <Empty>All clear</Empty>
          ) : (
            reminders.filter((r) => !r.done).slice(0, 5).map((r) => (
              <div className="row-line" key={r.id}>
                <span className="rl-dot" />
                <span className="rl-mid">{r.text}</span>
              </div>
            ))
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ───────────────────────── Orders ───────────────────────── */
const NEXT = { new: ["preparing", "Start preparing"], preparing: ["ready", "Mark ready"], ready: ["done", "Mark served"] };
function Orders({ orders, fresh }) {
  const [filter, setFilter] = useState("active");
  const shown = useMemo(() => {
    if (filter === "active") return orders.filter((o) => !["done", "cancelled"].includes(o.status));
    if (filter === "all") return orders;
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);
  const patch = (id, body) => setOrder(id, body).catch((e) => console.error(e));

  return (
    <>
      <div className="filters">
        {[["active", "Active"], ["new", "New"], ["preparing", "Preparing"], ["ready", "Ready"], ["done", "Served"], ["all", "All"]].map(([k, lb]) => (
          <button key={k} className={`db-chip ${filter === k ? "on" : ""}`} onClick={() => setFilter(k)}>{lb}</button>
        ))}
      </div>
      {shown.length === 0 && <Empty big>No orders here yet — new ones arrive instantly with a chime</Empty>}
      <div className="ogrid">
        <AnimatePresence>
          {shown.map((o) => (
            <motion.div key={o.id} layout initial={{ opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.4, ease: easing }} className={`ocard ${fresh.has(o.id) ? "fresh" : ""}`}>
              <div className="ocard-top">
                <span className="tbl">T{o.table}</span>
                <span className="code">{o.code}{o.name ? ` · ${o.name}` : ""}</span>
                <span className="ago">{ago(o.createdAt)}</span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className={`badge ${o.paid ? "ok" : "warn"}`}>{o.paid ? "✓ paid" : o.payMethod === "alfan" ? (o.paymentClaimed ? "card — claims paid" : "card — pending") : "pays at counter"}</span>
                <span className="badge warn" style={{ borderColor: "var(--line)", color: "var(--ivory-dim)" }}>{o.status}</span>
              </div>
              <ul>
                {o.items.map((l) => (
                  <li key={l.id}><span className="q">{l.qty}×</span><span>{l.name.en}</span><span className="p">{l.price * l.qty} {CUR}</span></li>
                ))}
                <li style={{ borderTop: "1px solid var(--line)", marginTop: 4, paddingTop: 9 }}><span className="q" /><span style={{ color: "var(--ivory-dim)" }}>Total</span><span className="p" style={{ color: "var(--gold-bright)", fontFamily: "var(--display)" }}>{o.total} {CUR}</span></li>
              </ul>
              {o.note && <div className="note">"{o.note}"</div>}
              <div className="ocard-foot">
                {NEXT[o.status] && <button className="abtn solid" onClick={() => patch(o.id, { status: NEXT[o.status][0] })}>{NEXT[o.status][1]}</button>}
                {!o.paid && <button className="abtn" onClick={() => patch(o.id, { paid: true })}>Confirm payment</button>}
                {o.status === "new" && <button className="abtn danger" onClick={() => patch(o.id, { status: "cancelled" })}>Cancel</button>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}

/* ───────────────────────── Floor ───────────────────────── */
function Floor({ orders }) {
  const today = stats(orders, "day").start;
  const tables = Array.from({ length: CONFIG.tables }, (_, i) => i + 1).map((t) => {
    const tableOrders = orders.filter((o) => o.table === t && o.createdAt >= today && o.status !== "cancelled");
    const live = tableOrders.find((o) => !["done", "cancelled"].includes(o.status));
    const revenue = tableOrders.reduce((s, o) => s + o.total, 0);
    return { t, live, revenue, count: tableOrders.length };
  });
  return (
    <div className="floor">
      {tables.map(({ t, live, revenue, count }) => (
        <div key={t} className={`tcard ${live ? `live s-${live.status}` : ""}`}>
          <div className="tcard-no">{t}</div>
          <div className="tcard-status">{live ? live.status : count ? "served" : "free"}</div>
          {live && <div className="tcard-meta">{live.items.reduce((n, l) => n + l.qty, 0)} items · {live.code}</div>}
          {revenue > 0 && <div className="tcard-rev">{money(revenue)} {CUR}</div>}
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────── Sales ───────────────────────── */
function Sales({ orders }) {
  const [range, setRange] = useState("day");
  const s = stats(orders, range);
  const peak = Math.max(1, ...s.buckets.map((b) => b.value));
  return (
    <div className="sales">
      <div className="filters">
        {[["day", "Today"], ["week", "This week"], ["month", "This month"]].map(([k, lb]) => (
          <button key={k} className={`db-chip ${range === k ? "on" : ""}`} onClick={() => setRange(k)}>{lb}</button>
        ))}
      </div>
      <div className="kpis">
        <div className="kpi"><div className="kpi-label">Revenue</div><div className="kpi-value">{money(s.revenue)}<small> {CUR}</small></div><div className="kpi-hint">{money(s.paid)} {CUR} collected</div></div>
        <div className="kpi"><div className="kpi-label">Orders</div><div className="kpi-value">{s.count}</div><div className="kpi-hint">{s.covers} items</div></div>
        <div className="kpi"><div className="kpi-label">Avg. order</div><div className="kpi-value">{money(s.aov)}<small> {CUR}</small></div><div className="kpi-hint">per ticket</div></div>
        <div className="kpi"><div className="kpi-label">Card vs counter</div><div className="kpi-value">{s.byPay.alfan || 0}<small> / {s.byPay.counter || 0}</small></div><div className="kpi-hint">card / cash</div></div>
      </div>
      <div className="ov-grid">
        <Panel title={range === "day" ? "Revenue by hour" : "Revenue by day"} wide>
          <div className="chart">
            {s.buckets.map((b, i) => (
              <div className="bar-col" key={i}>
                <div className="bar" style={{ height: `${(b.value / peak) * 100}%` }} title={`${money(b.value)} ${CUR}`} />
                <span className="bar-x">{b.label}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Top sellers">
          {s.topItems.length === 0 ? <Empty>No sales in range</Empty> : <BarList items={s.topItems.map((i) => ({ label: i.name, value: i.qty, sub: `${money(i.revenue)} ${CUR}` }))} suffix="×" />}
        </Panel>
      </div>
    </div>
  );
}

/* ───────────────────────── Team ───────────────────────── */
function Team({ staff }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("Barista");
  const add = () => {
    if (!name.trim()) return;
    addItem("staff", { name: name.trim(), role, onShift: false, clockInAt: null });
    setName("");
  };
  const toggle = (s) => patchItem("staff", s.id, s.onShift ? { onShift: false, clockInAt: null } : { onShift: true, clockInAt: Date.now() });
  return (
    <div className="team">
      <div className="team-add">
        <input placeholder="Employee name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          {["Barista", "Server", "Cashier", "Manager", "Kitchen"].map((r) => <option key={r}>{r}</option>)}
        </select>
        <button className="abtn solid" onClick={add}>Add</button>
      </div>
      {staff.length === 0 && <Empty big>No employees yet — add your team above</Empty>}
      <div className="team-grid">
        {staff.map((s) => (
          <div key={s.id} className={`scard ${s.onShift ? "on" : ""}`}>
            <span className="avatar lg">{(s.name || "?")[0]}</span>
            <div className="scard-body">
              <div className="scard-name">{s.name}</div>
              <div className="scard-role">{s.role}{s.onShift && s.clockInAt ? ` · ${ago(s.clockInAt)} on shift` : ""}</div>
            </div>
            <button className={`abtn ${s.onShift ? "danger" : "solid"}`} onClick={() => toggle(s)}>{s.onShift ? "Clock out" : "Clock in"}</button>
            <button className="x" onClick={() => removeItem("staff", s.id)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── Reminders ───────────────────────── */
function Reminders({ reminders }) {
  const [text, setText] = useState("");
  const add = () => {
    if (!text.trim()) return;
    addItem("reminders", { text: text.trim(), done: false });
    setText("");
  };
  const open = reminders.filter((r) => !r.done);
  const done = reminders.filter((r) => r.done);
  return (
    <div className="reminders">
      <div className="team-add">
        <input placeholder="Add a reminder — e.g. restock oat milk, descale machine…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <button className="abtn solid" onClick={add}>Add</button>
      </div>
      {reminders.length === 0 && <Empty big>No reminders — add shift tasks above</Empty>}
      <div className="rem-list">
        {open.map((r) => (
          <div className="rem" key={r.id}>
            <button className="rem-check" onClick={() => patchItem("reminders", r.id, { done: true })} />
            <span className="rem-text">{r.text}</span>
            <button className="x" onClick={() => removeItem("reminders", r.id)}>✕</button>
          </div>
        ))}
        {done.map((r) => (
          <div className="rem done" key={r.id}>
            <button className="rem-check on" onClick={() => patchItem("reminders", r.id, { done: false })}>✓</button>
            <span className="rem-text">{r.text}</span>
            <button className="x" onClick={() => removeItem("reminders", r.id)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── shared bits ───────────────────────── */
function Panel({ title, action, wide, children }) {
  return (
    <section className={`panel ${wide ? "wide" : ""}`}>
      <header className="panel-h">
        <h3>{title}</h3>
        {action && <button className="panel-act" onClick={action.onClick}>{action.label}</button>}
      </header>
      <div className="panel-b">{children}</div>
    </section>
  );
}
const Empty = ({ children, big }) => <div className={`empty ${big ? "big" : ""}`}>{children}</div>;
function BarList({ items, suffix = "" }) {
  const peak = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="barlist">
      {items.map((i) => (
        <div className="bl-row" key={i.label}>
          <span className="bl-label">{i.label}</span>
          <span className="bl-track"><span className="bl-fill" style={{ width: `${(i.value / peak) * 100}%` }} /></span>
          <span className="bl-val">{i.value}{suffix}{i.sub && <small> · {i.sub}</small>}</span>
        </div>
      ))}
    </div>
  );
}
