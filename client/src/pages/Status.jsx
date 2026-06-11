import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { io } from "socket.io-client";
import { useApp } from "../store";

const STEPS = ["new", "preparing", "ready", "done"];

export default function Status() {
  const { table, orderId } = useParams();
  const { t, L, cur } = useApp();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    fetch(`/api/orders/${orderId}`).then((r) => (r.ok ? r.json() : null)).then(setOrder);
    const s = io();
    s.emit("order:watch", orderId);
    s.on("order:update", (o) => o.id === orderId && setOrder(o));
    return () => s.disconnect();
  }, [orderId]);

  if (!order) return <div className="center-stage"><div className="monogram"><span>N</span></div></div>;

  const idx = STEPS.indexOf(order.status);
  const labels = [t.sNew, t.sPreparing, t.sReady, t.sDone];

  return (
    <div className="page">
      <div className="center-stage" style={{ justifyContent: "flex-start", paddingTop: 60 }}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} style={{ width: "100%" }}>
          <div className="monogram"><span>N</span></div>
          <div className="ordercode" style={{ marginTop: 20 }}>{t.orderCode} {order.code} · {t.table} {order.table}</div>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 500, marginTop: 12 }}>{t.statusTitle}</h2>
          <p style={{ color: "var(--ivory-dim)", fontSize: 14, marginTop: 8 }}>{t.statusSub}</p>

          <div style={{ marginTop: 20 }}>
            {order.paid ? (
              <span className="badge ok">✓ {t.paid}</span>
            ) : order.paymentClaimed ? (
              <span className="badge warn">{t.claimed}</span>
            ) : (
              <span className="badge warn">{t.unpaid}</span>
            )}
          </div>

          <div className="timeline">
            {labels.map((lb, i) => (
              <div key={i} className={`tstep ${i < idx || idx === 3 ? "done" : i === idx ? "now" : ""}`}>
                <span className="bullet" />
                <span className="rail" />
                <span className="tl">{lb}</span>
              </div>
            ))}
          </div>

          <div style={{ margin: "36px auto 0", maxWidth: 340, textAlign: "start", borderTop: "1px solid var(--line)", paddingTop: 8 }}>
            {order.items.map((l) => (
              <div className="line" key={l.id}>
                <span style={{ color: "var(--gold)", fontWeight: 700, minWidth: 26 }}>{l.qty}×</span>
                <span className="nm">{L(l.name)}</span>
                <span className="pr">{l.price * l.qty} {cur}</span>
              </div>
            ))}
            <div className="totalrow">
              <span className="lbl">{t.total}</span>
              <span className="val">{order.total} {cur}</span>
            </div>
          </div>

          <Link to={`/t/${table}`} className="abtn" style={{ display: "inline-block", marginTop: 30, textDecoration: "none" }}>
            {t.newOrder}
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
