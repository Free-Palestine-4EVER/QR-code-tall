// Public client config (demo). Rebrand here, then `npm run build`.
export const CONFIG = {
  brand: { en: "NOIR", ar: "نوار", tagline: { en: "Specialty House", ar: "بيت القهوة المختصة" } },
  currency: { en: "SAR", ar: "ر.س" },
  // Floor zones — each table belongs to one. Edit freely; the QR sheet & apps follow this.
  zones: [
    { id: "indoor", name: { en: "Indoor", ar: "الصالة الداخلية" }, tables: [1, 2, 3, 4, 5] },
    { id: "terrace", name: { en: "Terrace", ar: "التراس" }, tables: [6, 7, 8] },
    { id: "garden", name: { en: "Garden", ar: "الحديقة" }, tables: [9, 10, 11, 12] },
  ],
  staffPin: "2468",
  alfanLink: "https://alfan.link/jordanaiacademy?payment-link=BptmRm",
  instagram: "noir",
};

// Derived: total table count + table→zone lookup.
CONFIG.tables = CONFIG.zones.reduce((n, z) => n + z.tables.length, 0);
export const ZONE_OF = {};
CONFIG.zones.forEach((z) => z.tables.forEach((t) => (ZONE_OF[t] = z)));
