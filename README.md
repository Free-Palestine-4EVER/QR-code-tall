# NOIR — Luxury QR Table-Ordering (demo template)

Two apps, one static site. No server to run — orders sync live through **Firebase Firestore**, so it deploys to **Vercel** as static files.

- **Customer app** — `/t/:table` (each table's QR encodes its own URL → table auto-assigned). Bilingual AR (default, RTL) / EN. Browse → cart → checkout → **pay with Apple Pay / card without ever leaving the site** → live order status.
- **Employee app** — `/employee` (PIN in `client/src/data/config.js`, default **2468**). Real-time Firestore feed with chime + browser notification on each new order, status flow `new → preparing → ready → done`, payment confirmation, cancel.

## 1. Firebase (one-time, ~3 min)

1. [console.firebase.google.com](https://console.firebase.google.com) → add project.
2. Build → **Firestore Database** → create (production mode).
3. Rules → paste `firestore.rules` from this repo → Publish.
4. Project settings → Your apps → **Web app** → copy the config values.

## 2. Env vars

Copy `client/.env.example` → `client/.env.local` and fill the `VITE_FB_*` values for local dev.
In **Vercel → Project → Settings → Environment Variables**, add the same six keys.

## 3. Deploy

Push to GitHub → import the repo in Vercel. `vercel.json` already sets the build command and output dir. Done — you get `https://yourproject.vercel.app` (or attach `qrcodetalal.website`).

## QR codes

```bash
export PATH="$HOME/.local/node/bin:$PATH"
npm run qr                              # → qr/table-01.png … (uses baseUrl in config.json)
npm run qr -- https://qrcodetalal.website
```

## Rebrand

- `client/src/data/config.js` — brand (EN/AR), currency, tables, staff PIN, **alfanLink**.
- `client/src/data/menu.json` — categories & items (all bilingual).
- `client/public/img/<item-id>.jpg` — dish photos (graceful fallback if missing).

## Payment — how "never leave the site" works

The checkout opens Alfan's real payment page (Apple Pay / Mada / card, powered by Stripe) **inside an in-page modal iframe** — the customer pays without the page navigating away. Verified: Alfan sends no `X-Frame-Options`/CSP frame-blocking headers, so it embeds.

Two honest caveats:
- Alfan's single payment link can't be pre-filled with the order total, so the amount is copied to the clipboard and shown in the modal header for the customer to enter. Alfan has no webhook, so staff tap **Confirm payment** in the employee app.
- The bulletproof upgrade (native in-page Apple Pay sheet, auto-confirmed total, no manual amount) is a KSA gateway with merchant-domain verification on your domain — **Moyasar** or **Tap Payments**. Swap it into `createOrder` and the `paid` flag; everything else stays.

## Local dev

```bash
export PATH="$HOME/.local/node/bin:$PATH"
npm run dev:client      # Vite on :5173, talks to your Firestore
```
The old Express server (`server/`) is kept only for the QR script and offline experiments; production needs no server.
