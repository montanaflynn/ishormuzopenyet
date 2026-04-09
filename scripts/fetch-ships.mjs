import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../public/data/sample-marinetraffic.json");

// Tile coords covering the Strait of Hormuz area
const TILES = [
  { x: 83, y: 53 },
  { x: 84, y: 53 },
  { x: 83, y: 54 },
  { x: 84, y: 54 },
];

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  const allRows = [];

  for (const { x, y } of TILES) {
    const url = `https://www.marinetraffic.com/getData/get_data_json_4/z:8/X:${x}/Y:${y}/station:0`;
    console.log(`Fetching tile ${x},${y}...`);

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
      const text = await page.evaluate(() => document.body.innerText);
      const json = JSON.parse(text);

      if (json.data?.rows) {
        allRows.push(...json.data.rows);
        console.log(`  → ${json.data.rows.length} ships`);
      } else if (Array.isArray(json)) {
        allRows.push(...json);
        console.log(`  → ${json.length} ships`);
      } else {
        console.log(`  → unexpected format:`, Object.keys(json));
      }
    } catch (err) {
      console.error(`  → failed: ${err.message}`);
    }
  }

  // Deduplicate by SHIP_ID
  const seen = new Set();
  const unique = allRows.filter((r) => {
    const id = r.SHIP_ID || `${r.LAT}-${r.LON}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  const output = {
    type: 1,
    capturedAt: new Date().toISOString(),
    data: { rows: unique },
  };

  fs.writeFileSync(OUT, JSON.stringify(output, null, 2));
  console.log(`\nDone! ${unique.length} unique ships → ${OUT}`);

  await browser.close();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
