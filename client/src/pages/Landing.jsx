import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useApp } from "../store";

export default function Landing() {
  const { t, L, config, lang, setLang } = useApp();
  return (
    <div className="page">
      <header className="hdr">
        <button className="lang" onClick={() => setLang(lang === "en" ? "ar" : "en")}>
          {lang === "en" ? "العربية" : "English"}
        </button>
        <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>
          <div className="monogram"><span>N</span></div>
          <h1 className="brand">{L(config.brand)}</h1>
          <div className="tagline">{L(config.brand.tagline)}</div>
        </motion.div>
      </header>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8 }}>
        <div className="rule" style={{ margin: "30px 0 8px" }}><span className="diamond" /></div>
        <p style={{ textAlign: "center", color: "var(--ivory-dim)", fontSize: 14 }}>{t.scanHint}</p>

        <p style={{ textAlign: "center", marginTop: 36, fontSize: 11, letterSpacing: lang === "ar" ? "0.04em" : "0.26em", textTransform: "uppercase", color: "var(--ivory-faint)" }}>
          {t.chooseTable}
        </p>
        <div className="tables-grid">
          {Array.from({ length: config.tables }, (_, i) => (
            <Link key={i} to={`/t/${i + 1}`} className="tcell">{i + 1}</Link>
          ))}
        </div>

        <div style={{ marginTop: 40, display: "flex", justifyContent: "center" }}>
          <Link to="/staff" className="abtn">{t.staffApp} →</Link>
        </div>
      </motion.div>

      <div className="foot">{t.poweredBy}</div>
    </div>
  );
}
