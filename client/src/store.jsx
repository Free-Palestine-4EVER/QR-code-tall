import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { STR } from "./i18n";

const Ctx = createContext(null);

export function AppProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("noir.lang") || "ar");
  const [config, setConfig] = useState(null);
  const [menu, setMenu] = useState(null);
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem("noir.cart") || "{}"));

  useEffect(() => {
    fetch("/api/config").then((r) => r.json()).then(setConfig);
    fetch("/api/menu").then((r) => r.json()).then(setMenu);
  }, []);

  useEffect(() => {
    localStorage.setItem("noir.lang", lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  useEffect(() => localStorage.setItem("noir.cart", JSON.stringify(cart)), [cart]);

  const itemsById = useMemo(() => {
    const m = {};
    menu?.categories.forEach((c) => c.items.forEach((i) => (m[i.id] = i)));
    return m;
  }, [menu]);

  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .filter(([id, q]) => q > 0 && itemsById[id])
        .map(([id, qty]) => ({ ...itemsById[id], qty })),
    [cart, itemsById]
  );
  const cartCount = cartLines.reduce((s, l) => s + l.qty, 0);
  const cartTotal = cartLines.reduce((s, l) => s + l.qty * l.price, 0);

  const t = STR[lang];
  const value = {
    lang,
    setLang,
    t,
    L: (obj) => obj?.[lang] ?? obj?.en ?? "",
    config,
    menu,
    cart,
    setQty: (id, qty) => setCart((c) => ({ ...c, [id]: Math.max(0, Math.min(20, qty)) })),
    clearCart: () => setCart({}),
    cartLines,
    cartCount,
    cartTotal,
    cur: config ? config.currency[lang] : "",
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useApp = () => useContext(Ctx);
