# NOIR — Luxury QR Table-Ordering (demo template)

Two apps, one self-hosted Node server. No Firebase, no external services except the Alfan payment link.

- **Customer app** — `/t/:table` (each table's QR encodes its own URL → table auto-assigned). Bilingual AR (default, RTL) / EN. Browse → cart → checkout → pay via Alfan (Apple Pay/card) or at counter → live order status.
- **Staff app** — `/staff` (PIN: see `config.json`, default **2468**). Real-time order feed via WebSocket with chime + browser notification, status flow `new → preparing → ready → done`, payment confirmation, cancel.

## Run

```bash
export PATH="$HOME/.local/node/bin:$PATH"
npm run build && npm start          # production: everything on http://localhost:4000
# or dev: npm run dev:server + npm run dev:client (Vite on :5173, proxied)
```

## QR codes

```bash
npm run qr                          # → qr/table-01.png … (uses baseUrl from config.json)
npm run qr -- https://yourdomain.com   # regenerate for the deployed domain
```

## Rebrand / configure

- `config.json` — brand name (EN/AR), currency, table count, staff PIN, **alfanLink**, baseUrl.
- `server/menu.json` — categories & items, all names/descriptions bilingual.

## Payment reality check

Alfan payment links run on Stripe under Alfan's domain. Apple Pay buttons are domain-verified by Apple, so they **cannot be embedded** on another site — no scraping workaround exists. This template gives the closest UX: order is sent to the kitchen first, the checkout shows the total (auto-copied to clipboard), opens the Alfan sheet in one tap, and the customer confirms return ("I've completed payment"); staff see `card — claims paid` and confirm. To get a native in-page Apple Pay sheet with auto-confirmation, swap in a gateway with embeddable Apple Pay + webhooks (Moyasar / Tap Payments in KSA) — hook it into `POST /api/orders` and the `paid` flag.

Orders persist in `server/data/orders.json`.
