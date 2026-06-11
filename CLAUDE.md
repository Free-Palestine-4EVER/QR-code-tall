# NOIR — QR Table-Ordering (CLAUDE.md)

Luxury bilingual (Arabic RTL default / English) QR table-ordering demo. Two apps,
one static site. **No server in production** — orders sync live via Firebase
Firestore, hosted on Vercel. Demo/pitch template for restaurants & cafés.

- Live domain: `qrcodetalal.website` · Repo: `github.com/Free-Palestine-4EVER/QR-code-tall`
- Firebase project: `qrcodetalal` (ONLY Firestore enabled — no Auth/RTDB/Storage)

## Run

Node lives at `~/.local/node` (NOT on PATH). Prefix everything:
```bash
export PATH="$HOME/.local/node/bin:$PATH"
npm run dev:client      # Vite dev server on :5173, talks to Firestore/demo
npm run build           # → client/dist (Vercel output)
npm run qr              # regenerate per-table QR PNGs + printable poster sheet
npm start               # legacy Express server (server/), only for the QR script / offline
```
There is no test suite; verify with Playwright screenshots (see History).

## Architecture

- **Frontend**: Vite + React 19 + react-router + framer-motion. Custom CSS only
  (no Tailwind) in `client/src/styles.css`. Dark espresso + champagne-gold luxury
  aesthetic; fonts Marcellus / Cormorant Garamond / Mulish (EN) + Amiri / Almarai (AR).
- **Data**: `client/src/firebase.js` is the data layer. When `VITE_FB_*` env vars
  are present it uses **Firestore** (real-time `onSnapshot`); otherwise it falls back
  to `client/src/localStore.js` — a **demo backend** using localStorage that syncs
  across tabs on one machine via the `storage` event. Both expose the SAME API, so
  pages never know which is active. App always runs (no setup-screen block).
- **No backend code path in prod.** `server/` (Express + Socket.IO + JSON store) is
  legacy, kept only so `npm run qr` and offline experiments work.

### Routes (`client/src/App.jsx`)
- `/` Landing — table picker grouped by zone (demo)
- `/t/:table` Menu — browse, cart, bottom sheets
- `/t/:table/checkout` Checkout — review + payment method
- `/t/:table/order/:orderId` Status — live order timeline + Instagram promo
- `/employee` (alias `/staff`) — PIN gate → CRM Dashboard

### Data model (Firestore collections / localStorage keys)
- `orders` — `{ seq, code:"N-001", table, items:[{id,qty,price,name}], total,
  payMethod:"alfan"|"counter", paid, paymentClaimed, name, note,
  status:"new"|"preparing"|"ready"|"done"|"cancelled", createdAt }`.
  Sequential `code` via a Firestore transaction on `counters/orders`.
- `staff` — `{ name, role, onShift, clockInAt, createdAt }`
- `reminders` — `{ text, done, createdAt }`
- Generic helpers: `watchCollection / addItem / patchItem / removeItem` (both backends).

## Key files

- `client/src/data/config.js` — **single source of truth**: brand, currency,
  **zones** (table→section), staff PIN, `alfanLink`, `instagram`. Exports `CONFIG`
  (with derived `CONFIG.tables`) + `ZONE_OF` lookup. `make-qr.mjs` imports this too.
- `client/src/data/menu.json` — bilingual categories & items.
- `client/public/img/<item-id>.jpg` — dish photos (graceful fallback if missing).
- `client/src/i18n.js` — all UI strings (`STR.en` / `STR.ar`).
- `client/src/store.jsx` — `AppProvider` / `useApp()` (lang, cart, config, menu).
- `client/src/employee/Dashboard.jsx` — the CRM (tabs below) + `analytics.js`.
- `scripts/make-qr.mjs` — QR PNGs + `qr/noir-qr-posters.html` print sheet by zone.
- `firestore.rules` — demo-permissive (anyone read/write). Re-publish in Firebase
  console after editing. Harden (anonymous auth) before real customers.

## Employee CRM (`/employee`, PIN in config, default 2468)

Tabbed Service Console: **Overview** (KPIs + live panels), **Orders** (live feed,
chime + browser notification on new, status flow), **Floor** (table map grouped by
zone, per-table live status + revenue), **Sales** (day/week/month toggle, revenue /
orders / AOV / payment split / bar charts / top sellers — all computed client-side
in `analytics.js`), **Team** (add staff, clock in/out, on-shift), **Reminders**
(shift tasks). Pure CSS/SVG charts, no chart lib.

## Payment (important constraint)

Customer pays via the user's **Alfan** link (Stripe-backed: Apple Pay / Mada / card).
Apple Pay buttons are domain-bound by Apple, so the button HTML CANNOT be copied to
another domain. BUT Alfan sends no `X-Frame-Options`/CSP headers (verified), so the
checkout embeds Alfan's real payment page in an **in-page iframe modal**
(`<iframe allow="payment">` in `Checkout.jsx`) — the customer pays without ever
leaving the site. Caveats: the single Alfan link can't be pre-filled with the order
total (copied to clipboard + shown in modal header), and Alfan has no webhook (staff
tap "Confirm payment"). Production upgrade for native, auto-confirmed Apple Pay:
swap in a KSA gateway (Moyasar / Tap) verified on this domain, wired into
`createOrder` + the `paid` flag.

## Deploy (Vercel)

`vercel.json` sets `buildCommand: vite build client`, `outputDirectory: client/dist`,
SPA rewrites. Add the six `VITE_FB_*` keys (from Firebase web config) in Vercel →
Settings → Environment Variables, then redeploy. `client/.env.local` holds them for
local dev and is gitignored. **Never commit the Firebase Admin SDK JSON** — it's a
project master key and this app doesn't use it.

## Conventions

- Bilingual everything: `L(obj)` picks `obj[lang]`; add both `en` + `ar` for any
  user-facing string (strings in `i18n.js`, content in `config.js` / `menu.json`).
- RTL via `dir` on `<html>`; employee dashboard is forced `dir="ltr"`.
- Rebrand a client: edit `config.js` + `menu.json`, drop photos in `public/img/`,
  run `npm run qr` for that domain, rebuild.
