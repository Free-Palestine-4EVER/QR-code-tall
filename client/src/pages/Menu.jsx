import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../store";
import { tagLabel } from "../i18n";
import { ZONE_OF } from "../data/config";

const easing = [0.22, 1, 0.36, 1];

export default function Menu() {
  const { table } = useParams();
  const nav = useNavigate();
  const { t, L, lang, setLang, config, menu, cart, setQty, cartLines, cartCount, cartTotal, cur } = useApp();
  const [active, setActive] = useState(menu.categories[0].id);
  const [detail, setDetail] = useState(null); // item being viewed
  const [cartOpen, setCartOpen] = useState(false);
  const refs = useRef({});

  useEffect(() => {
    const obs = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setActive(e.target.dataset.cat)),
      { rootMargin: "-30% 0px -60% 0px" }
    );
    Object.values(refs.current).forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [menu]);

  const goCat = (id) => refs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="page">
      <header className="hdr">
        <button className="lang" onClick={() => setLang(lang === "en" ? "ar" : "en")}>
          {lang === "en" ? "العربية" : "English"}
        </button>
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: easing }}>
          <div className="monogram"><span>N</span></div>
          <h1 className="brand">{L(config.brand)}</h1>
          <div className="tagline">{L(config.brand.tagline)}</div>
          <div>
            <span className="table-chip">
              <span className="dot" />{t.table} {table}
              {ZONE_OF[table] && <span style={{ opacity: 0.7 }}> · {L(ZONE_OF[table].name)}</span>}
            </span>
          </div>
        </motion.div>
      </header>

      <nav className="cats">
        {menu.categories.map((c) => (
          <button key={c.id} className={`cat ${active === c.id ? "on" : ""}`} onClick={() => goCat(c.id)}>
            {L(c.name)}
          </button>
        ))}
      </nav>

      {menu.categories.map((c, ci) => (
        <section key={c.id} className="section" data-cat={c.id} ref={(el) => (refs.current[c.id] = el)} style={{ scrollMarginTop: 64 }}>
          <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.7, ease: easing }}>
            <h2 className="section-title">{L(c.name)}</h2>
            <div className="rule"><span className="diamond" /></div>
          </motion.div>
          {c.items.map((it, i) => (
            <motion.button
              key={it.id}
              className="dish"
              onClick={() => setDetail(it)}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-20px" }}
              transition={{ duration: 0.55, delay: (i % 5) * 0.05, ease: easing }}
            >
              <img
                className="dish-img"
                src={`/img/${it.id}.jpg`}
                alt=""
                loading="lazy"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
              <div className="dish-body">
                <div className="dish-row">
                  <span className="dish-name">{L(it.name)}</span>
                  <span className="dish-dots" />
                  <span className="dish-price">{it.price} {cur}</span>
                </div>
                <p className="dish-desc">{L(it.desc)}</p>
                <div className="dish-meta">
                  {it.tag && <span className="tag">{L(tagLabel[it.tag])}</span>}
                  {cart[it.id] > 0 && <span className="qty-pill">×{cart[it.id]}</span>}
                </div>
              </div>
            </motion.button>
          ))}
        </section>
      ))}

      <div className="foot">{t.poweredBy}</div>

      {/* floating cart bar */}
      <AnimatePresence>
        {cartCount > 0 && !cartOpen && !detail && (
          <motion.div className="cartbar-wrap" initial={{ y: 90, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 90, opacity: 0 }} transition={{ duration: 0.45, ease: easing }}>
            <button className="cartbar" onClick={() => setCartOpen(true)} style={{ width: "100%" }}>
              <span className="count">{cartCount}</span>
              <span className="label">{t.viewOrder}</span>
              <span className="amt">{cartTotal} {cur}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* item detail sheet */}
      <Sheet open={!!detail} onClose={() => setDetail(null)}>
        {detail && (
          <>
            <img
              className="sheet-hero"
              src={`/img/${detail.id}.jpg`}
              alt=""
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
            <h3>{L(detail.name)}</h3>
            <div className="price-lg">{detail.price} {cur}</div>
            <p className="desc">{L(detail.desc)}</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "26px 0 20px" }}>
              <div className="stepper">
                <button onClick={() => setQty(detail.id, (cart[detail.id] || 0) - 1)}>−</button>
                <span className="n">{cart[detail.id] || 0}</span>
                <button onClick={() => setQty(detail.id, (cart[detail.id] || 0) + 1)}>+</button>
              </div>
              {detail.tag && <span className="tag">{L(tagLabel[detail.tag])}</span>}
            </div>
            <button
              className="btn btn-gold"
              onClick={() => {
                if (!cart[detail.id]) setQty(detail.id, 1);
                setDetail(null);
              }}
            >
              {t.add}
            </button>
          </>
        )}
      </Sheet>

      {/* cart sheet */}
      <Sheet open={cartOpen} onClose={() => setCartOpen(false)}>
        <h3 style={{ textAlign: "center" }}>{t.yourOrder}</h3>
        <div className="rule" style={{ margin: "14px 0 4px" }}><span className="diamond" /></div>
        {cartLines.length === 0 ? (
          <div style={{ textAlign: "center", padding: "34px 0" }}>
            <p style={{ fontFamily: "var(--serif)", fontSize: 19 }}>{t.empty}</p>
            <p style={{ color: "var(--ivory-faint)", fontSize: 13, marginTop: 6 }}>{t.emptyHint}</p>
          </div>
        ) : (
          <>
            {cartLines.map((l) => (
              <div className="line" key={l.id}>
                <div className="stepper sm">
                  <button onClick={() => setQty(l.id, l.qty - 1)}>−</button>
                  <span className="n">{l.qty}</span>
                  <button onClick={() => setQty(l.id, l.qty + 1)}>+</button>
                </div>
                <span className="nm">{L(l.name)}</span>
                <span className="pr">{l.price * l.qty} {cur}</span>
              </div>
            ))}
            <div className="totalrow">
              <span className="lbl">{t.total}</span>
              <span className="val">{cartTotal} {cur}</span>
            </div>
            <button className="btn btn-gold" onClick={() => nav(`/t/${table}/checkout`)}>{t.checkout}</button>
          </>
        )}
      </Sheet>
    </div>
  );
}

export function Sheet({ open, onClose, children }) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [open]);
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} />
          <motion.div
            className="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => info.offset.y > 90 && onClose()}
          >
            <div className="sheet-grip" />
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
