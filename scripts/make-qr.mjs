// Generates per-table QR codes + a printable luxury poster sheet grouped by zone.
//   node scripts/make-qr.mjs [baseUrl]
// Outputs:
//   qr/table-01.png …        individual QR PNGs (transparent-free, brand colours)
//   qr/noir-qr-posters.html  print sheet — open in a browser, print or screenshot
import QRCode from "qrcode";
import { readFileSync, mkdirSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { CONFIG } from "../client/src/data/config.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const base =
  process.argv[2] ||
  (() => {
    try {
      return JSON.parse(readFileSync(join(root, "config.json"), "utf8")).baseUrl;
    } catch {
      return "http://localhost:4000";
    }
  })();

const outDir = join(root, "qr");
mkdirSync(outDir, { recursive: true });

const pad = (n) => String(n).padStart(2, "0");
const cards = [];

for (const zone of CONFIG.zones) {
  for (const t of zone.tables) {
    const url = `${base}/t/${t}`;
    const file = join(outDir, `table-${pad(t)}.png`);
    await QRCode.toFile(file, url, { width: 1024, margin: 2, color: { dark: "#15110b", light: "#f5eedf" } });
    const dataUrl = await QRCode.toDataURL(url, { width: 600, margin: 1, color: { dark: "#15110b", light: "#f5eedf" } });
    cards.push({ t, zone, url, dataUrl });
    console.log(`✓ table ${pad(t)} · ${zone.name.en}  →  ${url}`);
  }
}

const brand = CONFIG.brand;
const sections = CONFIG.zones
  .map((z) => {
    const posters = cards
      .filter((c) => c.zone.id === z.id)
      .map(
        (c) => `
      <article class="poster">
        <div class="frame">
          <div class="mono"><span>N</span></div>
          <div class="bn">${brand.en}</div>
          <div class="tg">${brand.tagline.en}</div>
          <div class="qr"><img src="${c.dataUrl}" alt="Table ${c.t}"/></div>
          <div class="tn">TABLE ${pad(c.t)}</div>
          <div class="zn">${z.name.en} · ${z.name.ar}</div>
          <div class="hint">Scan to view the menu &amp; order — امسح لعرض القائمة والطلب</div>
        </div>
      </article>`
      )
      .join("");
    return `<section class="zone"><h2><span>${z.name.en}</span><em>${z.name.ar}</em></h2><div class="grid">${posters}</div></section>`;
  })
  .join("");

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<title>${brand.en} — QR Table Posters</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Marcellus&family=Cormorant+Garamond:ital@0;1&family=Mulish:wght@300;500;600&family=Amiri&display=swap" rel="stylesheet"/>
<style>
  :root{--ink:#0e0b07;--ink2:#1a130b;--gold:#c9a96a;--goldb:#e8cd92;--line:rgba(201,169,106,.4);--ivory:#f2ead8}
  *{box-sizing:border-box;margin:0}body{background:#080603;color:var(--ivory);font-family:"Mulish",sans-serif;padding:34px}
  h1{font-family:"Marcellus",serif;letter-spacing:.3em;text-align:center;font-weight:400;font-size:30px;margin-bottom:6px}
  .sub{text-align:center;color:var(--gold);font-family:"Cormorant Garamond",serif;font-style:italic;font-size:18px;margin-bottom:30px}
  .zone{margin:0 auto 34px;max-width:1100px}
  .zone h2{display:flex;align-items:center;gap:14px;font-family:"Marcellus",serif;font-weight:400;font-size:20px;letter-spacing:.16em;color:var(--goldb);margin:0 0 16px;padding-bottom:10px;border-bottom:1px solid rgba(201,169,106,.2)}
  .zone h2 em{font-family:"Amiri",serif;font-style:normal;color:var(--gold);letter-spacing:0;font-size:19px;margin-inline-start:auto}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:18px}
  .poster{break-inside:avoid}
  .frame{background:linear-gradient(180deg,var(--ink2),var(--ink));border:1px solid var(--line);border-radius:14px;padding:22px 20px;text-align:center;box-shadow:0 0 0 1px rgba(201,169,106,.08) inset}
  .mono{width:40px;height:40px;border:1px solid var(--line);transform:rotate(45deg);display:grid;place-items:center;margin:0 auto 12px}
  .mono span{transform:rotate(-45deg);font-family:"Marcellus",serif;color:var(--goldb);font-size:18px}
  .bn{font-family:"Marcellus",serif;letter-spacing:.28em;text-indent:.28em;font-size:20px}
  .tg{font-family:"Cormorant Garamond",serif;font-style:italic;color:var(--gold);font-size:13px;margin-bottom:14px}
  .qr{background:#f5eedf;border-radius:12px;padding:12px;width:172px;height:172px;margin:0 auto;display:grid;place-items:center}
  .qr img{width:100%;height:100%;display:block}
  .tn{font-family:"Marcellus",serif;letter-spacing:.2em;font-size:19px;margin-top:14px;color:var(--ivory)}
  .zn{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold);margin-top:4px}
  .hint{font-size:10.5px;color:rgba(242,234,216,.5);margin-top:10px;line-height:1.5}
  @media print{body{background:#fff}.frame{box-shadow:none}}
</style></head>
<body>
  <h1>${brand.en}</h1>
  <div class="sub">${brand.tagline.en} — scan · order · pay from your table</div>
  ${sections}
</body></html>`;

const sheet = join(outDir, "noir-qr-posters.html");
writeFileSync(sheet, html);
console.log(`\n✓ printable poster sheet → ${sheet}`);
console.log(`  open it in a browser, then print or screenshot. Base URL: ${base}`);
