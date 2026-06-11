// Generates one QR code per table → qr/table-XX.png
// Usage: node scripts/make-qr.mjs [baseUrl]   (defaults to config.baseUrl)
import QRCode from "qrcode";
import { readFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(readFileSync(join(root, "config.json"), "utf8"));
const base = process.argv[2] || config.baseUrl;

const outDir = join(root, "qr");
mkdirSync(outDir, { recursive: true });

for (let t = 1; t <= config.tables; t++) {
  const url = `${base}/t/${t}`;
  const file = join(outDir, `table-${String(t).padStart(2, "0")}.png`);
  await QRCode.toFile(file, url, {
    width: 1024,
    margin: 2,
    color: { dark: "#15110b", light: "#f5eedf" },
  });
  console.log(`✓ ${file}  →  ${url}`);
}
