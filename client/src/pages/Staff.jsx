import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../store";
import { CONFIG } from "../data/config";
import { watchOrders, setOrder } from "../firebase";

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

const NEXT = { new: ["preparing", "Start preparing"], preparing: ["ready", "Mark ready"], ready: ["done", "Mark served"] };

export default function Staff() {
  const { config } = useApp();
  const cur = config?.currency?.en || "SAR";
  const [pin, setPin] = useState(() => sessionStorage.getItem("noir.pin") || "");
  const [authed, setAuthed] = useState(false);
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("active");
  const [, tick] = useState(0);
  const freshIds = useRef(new Set());

  // re-render every 30s for "x min ago"
  useEffect(() => {
    const iv = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!pin) return;
    if (pin === CONFIG.staffPin) {
      sessionStorage.setItem("noir.pin", pin);
      setAuthed(true);
    } else {
      sessionStorage.removeItem("noir.pin");
      setPin("");
    }
  }, [pin]);

  useEffect(() => {
    if (!authed) return;
    Notification?.requestPermission?.();
    let first = true;
    const unsub = watchOrders((all, added) => {
      setOrders(all);
      if (first) {
        first = false;
        return; // don't chime for the initial backlog
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
    return unsub;
  }, [authed]); // eslint-disable-line

  const patch = (id, body) => setOrder(id, body).catch((e) => console.error(e));

  const shown = useMemo(() => {
    if (filter === "active") return orders.filter((o) => !["done", "cancelled"].includes(o.status));
    if (filter === "all") return orders;
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  if (!authed) return <PinGate onSubmit={setPin} />;

  const counts = { active: orders.filter((o) => !["done", "cancelled"].includes(o.status)).length };

  return (
    <div className="staff" dir="ltr" lang="en">
      <header className="staff-hdr">
        <div className="monogram" style={{ width: 40, height: 40, margin: 0 }}><span style={{ fontSize: 16 }}>N</span></div>
        <h1>NOIR · SERVICE</h1>
        <span className="live"><span className="dot" />live</span>
        <span style={{ marginLeft: "auto", color: "var(--ivory-dim)", fontSize: 13 }}>{counts.active} active</span>
      </header>

      <div className="filters">
        {[["active", "Active"], ["new", "New"], ["preparing", "Preparing"], ["ready", "Ready"], ["done", "Served"], ["all", "All"]].map(([k, lb]) => (
          <button key={k} className={`cat ${filter === k ? "on" : ""}`} onClick={() => setFilter(k)}>{lb}</button>
        ))}
      </div>

      {shown.length === 0 && (
        <div className="center-stage" style={{ minHeight: "40dvh" }}>
          <p style={{ fontFamily: "var(--serif)", fontSize: 20, color: "var(--ivory-dim)" }}>No orders here yet</p>
          <p style={{ fontSize: 13, color: "var(--ivory-faint)", marginTop: 6 }}>New orders appear instantly with a chime</p>
        </div>
      )}

      <div className="ogrid">
        <AnimatePresence>
          {shown.map((o) => (
            <motion.div
              key={o.id}
              layout
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className={`ocard ${freshIds.current.has(o.id) ? "fresh" : ""}`}
            >
              <div className="ocard-top">
                <span className="tbl">T{o.table}</span>
                <span className="code">{o.code}{o.name ? ` · ${o.name}` : ""}</span>
                <span className="ago">{ago(o.createdAt)}</span>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className={`badge ${o.paid ? "ok" : "warn"}`}>
                  {o.paid ? "✓ paid" : o.payMethod === "alfan" ? (o.paymentClaimed ? "card — claims paid" : "card — pending") : "pays at counter"}
                </span>
                <span className="badge warn" style={{ borderColor: "var(--line)", color: "var(--ivory-dim)" }}>{o.status}</span>
              </div>

              <ul>
                {o.items.map((l) => (
                  <li key={l.id}>
                    <span className="q">{l.qty}×</span>
                    <span>{l.name.en}</span>
                    <span className="p">{l.price * l.qty} {cur || "SAR"}</span>
                  </li>
                ))}
                <li style={{ borderTop: "1px solid var(--line)", marginTop: 4, paddingTop: 9 }}>
                  <span className="q" />
                  <span style={{ color: "var(--ivory-dim)" }}>Total</span>
                  <span className="p" style={{ color: "var(--gold-bright)", fontFamily: "var(--display)" }}>{o.total} {cur || "SAR"}</span>
                </li>
              </ul>

              {o.note && <div className="note">“{o.note}”</div>}

              <div className="ocard-foot">
                {NEXT[o.status] && (
                  <button className="abtn solid" onClick={() => patch(o.id, { status: NEXT[o.status][0] })}>
                    {NEXT[o.status][1]}
                  </button>
                )}
                {!o.paid && <button className="abtn" onClick={() => patch(o.id, { paid: true })}>Confirm payment</button>}
                {o.status === "new" && <button className="abtn danger" onClick={() => patch(o.id, { status: "cancelled" })}>Cancel</button>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function PinGate({ onSubmit }) {
  const [val, setVal] = useState("");
  useEffect(() => {
    if (val.length === 4) {
      onSubmit(val);
      setTimeout(() => setVal(""), 600);
    }
  }, [val, onSubmit]);
  return (
    <div className="pin-gate" dir="ltr">
      <div className="monogram"><span>N</span></div>
      <p style={{ letterSpacing: "0.3em", textTransform: "uppercase", fontSize: 11, color: "var(--ivory-dim)" }}>Staff access</p>
      <div className="pin-dots">
        {[0, 1, 2, 3].map((i) => <span key={i} className={i < val.length ? "f" : ""} />)}
      </div>
      <div className="pad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].map((k, i) =>
          k === "" ? (
            <span key={i} />
          ) : (
            <button key={i} onClick={() => setVal((v) => (k === "⌫" ? v.slice(0, -1) : (v + k).slice(0, 4)))}>
              {k}
            </button>
          )
        )}
      </div>
    </div>
  );
}
