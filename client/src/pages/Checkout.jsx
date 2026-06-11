import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../store";
import { createOrder, setOrder } from "../firebase";

const easing = [0.22, 1, 0.36, 1];

export default function Checkout() {
  const { table } = useParams();
  const nav = useNavigate();
  const { t, L, lang, config, cartLines, cartTotal, cur, clearCart } = useApp();
  const [pay, setPay] = useState("alfan");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState(null); // order obj when awaiting alfan payment
  const [opened, setOpened] = useState(false);

  if (!cartLines.length && !placed) {
    return (
      <div className="page center-stage">
        <p style={{ fontFamily: "var(--serif)", fontSize: 20 }}>{t.empty}</p>
        <Link to={`/t/${table}`} className="abtn" style={{ marginTop: 18 }}>{t.backToMenu}</Link>
      </div>
    );
  }

  const placeOrder = async () => {
    setBusy(true);
    try {
      const { id, code } = await createOrder({
        table,
        items: cartLines.map((l) => ({ id: l.id, qty: l.qty, price: l.price, name: l.name })),
        total: cartTotal,
        payMethod: pay,
        name,
        note,
      });
      clearCart();
      if (pay === "alfan") setPlaced({ id, code, total: cartTotal, table });
      else nav(`/t/${table}/order/${id}`, { replace: true });
    } catch (e) {
      console.error(e);
      setBusy(false);
    }
  };

  const finishPayment = async (claimed) => {
    if (claimed) await setOrder(placed.id, { paymentClaimed: true }).catch(() => {});
    nav(`/t/${table}/order/${placed.id}`, { replace: true });
  };

  /* ── step 2: alfan payment ── */
  if (placed) {
    return (
      <div className="page">
        <div className="center-stage">
          <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, ease: easing }} style={{ width: "100%" }}>
            <div className="monogram"><span>N</span></div>
            <div className="ordercode" style={{ marginTop: 18 }}>{t.orderCode} {placed.code} · {t.table} {placed.table}</div>
            <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, marginTop: 14 }}>{t.payTitle}</h2>
            <p style={{ color: "var(--ivory-dim)", fontSize: 14, lineHeight: 1.7, margin: "12px auto 0", maxWidth: 330 }}>{t.payBody}</p>
            <div className="big-amt" style={{ margin: "22px 0 30px" }}>
              {placed.total} <small>{cur}</small>
            </div>
            <button
              className="btn btn-dark"
              onClick={() => {
                navigator.clipboard?.writeText(String(placed.total)).catch(() => {});
                setOpened(true);
              }}
            >
              <AppleMark /> {t.payNow}
            </button>
            <button className="abtn" style={{ marginTop: 26, border: "none", color: "var(--ivory-faint)" }} onClick={() => finishPayment(false)}>
              {t.paySkip}
            </button>
          </motion.div>
        </div>

        {/* In-page payment — Alfan's real Apple Pay / card sheet, embedded. Customer never leaves the site. */}
        <AnimatePresence>
          {opened && (
            <>
              <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} />
              <motion.div
                className="pay-modal"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ duration: 0.5, ease: easing }}
              >
                <div className="pay-modal-bar">
                  <button className="pm-close" onClick={() => setOpened(false)} aria-label="close">✕</button>
                  <span className="pm-amt"><AppleMark /> {placed.total} {cur}</span>
                  <span className="pm-secure">🔒 {t.payAppleHint}</span>
                </div>
                <iframe
                  className="pay-frame"
                  src={config.alfanLink}
                  title="payment"
                  allow="payment"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <div className="pay-modal-foot">
                  <button className="btn btn-gold" onClick={() => finishPayment(true)}>{t.payDone}</button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  /* ── step 1: review + pay method ── */
  return (
    <div className="page">
      <header className="hdr">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: easing }}>
          <div className="monogram"><span>N</span></div>
          <h1 className="brand" style={{ fontSize: 30 }}>{L(config.brand)}</h1>
          <div>
            <span className="table-chip"><span className="dot" />{t.table} {table}</span>
          </div>
        </motion.div>
      </header>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.7, ease: easing }}>
        <div className="rule" style={{ margin: "20px 0 6px" }}><span className="diamond" /></div>
        <p style={{ textAlign: "center", fontSize: 11, letterSpacing: lang === "ar" ? "0.04em" : "0.26em", textTransform: "uppercase", color: "var(--ivory-dim)" }}>{t.summary}</p>

        {cartLines.map((l) => (
          <div className="line" key={l.id}>
            <span className="q" style={{ color: "var(--gold)", fontWeight: 700, minWidth: 26 }}>{l.qty}×</span>
            <span className="nm">{L(l.name)}</span>
            <span className="pr">{l.price * l.qty} {cur}</span>
          </div>
        ))}
        <div className="totalrow">
          <span className="lbl">{t.total}</span>
          <span className="val">{cartTotal} {cur}</span>
        </div>

        <div className="field">
          <label>{t.name}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.namePh} />
        </div>
        <div className="field">
          <label>{t.note}</label>
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.notePh} />
        </div>

        <div className="field">
          <label>{t.payment}</label>
          <button className={`paycard ${pay === "alfan" ? "on" : ""}`} onClick={() => setPay("alfan")}>
            <span className="ic"><AppleMark /></span>
            <span>
              <div className="t1">{t.payApple}</div>
              <div className="t2">{t.payAppleHint}</div>
            </span>
            <span className="radio" />
          </button>
          <button className={`paycard ${pay === "counter" ? "on" : ""}`} onClick={() => setPay("counter")}>
            <span className="ic" style={{ fontFamily: "var(--display)", color: "var(--gold-bright)" }}>{cur}</span>
            <span>
              <div className="t1">{t.payCounter}</div>
              <div className="t2">{t.payCounterHint}</div>
            </span>
            <span className="radio" />
          </button>
        </div>

        <div style={{ marginTop: 28 }}>
          <button className="btn btn-gold" disabled={busy} onClick={placeOrder}>
            {busy ? t.placing : `${t.placeOrder} · ${cartTotal} ${cur}`}
          </button>
          <Link to={`/t/${table}`} style={{ display: "block", textAlign: "center", marginTop: 18, color: "var(--ivory-faint)", fontSize: 13, textDecoration: "none" }}>
            ← {t.backToMenu}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

function AppleMark() {
  return (
    <svg width="16" height="19" viewBox="0 0 16 19" fill="currentColor" aria-hidden="true">
      <path d="M13.06 10.07c.02 2.42 2.12 3.22 2.14 3.23-.02.06-.34 1.15-1.1 2.28-.67.98-1.36 1.95-2.45 1.97-1.07.02-1.42-.63-2.64-.63-1.23 0-1.61.61-2.62.65-1.05.04-1.86-1.06-2.53-2.03C2.49 13.55 1.43 9.9 2.84 7.43c.7-1.23 1.95-2.01 3.31-2.03 1.03-.02 2.01.7 2.64.7.63 0 1.82-.86 3.06-.73.52.02 1.99.21 2.93 1.59-.08.05-1.75 1.02-1.72 3.11ZM11.04 4.07c.56-.68.94-1.62.83-2.57-.81.03-1.79.54-2.37 1.22-.52.6-.97 1.56-.85 2.48.9.07 1.82-.46 2.39-1.13Z" />
    </svg>
  );
}
