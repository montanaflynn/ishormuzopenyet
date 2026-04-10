import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IN = path.join(__dirname, "../public/data/sample-marinetraffic.json");

const pickByField = (rows, field, filter) => {
  const picked = new Map();
  for (const r of rows) {
    if (filter && !filter(r)) continue;
    const k = r[field] ?? "null";
    if (picked.has(k)) continue;
    if (!/^\d+$/.test(String(r.SHIP_ID))) continue;
    picked.set(k, r);
  }
  return [...picked.entries()]
    .sort((a, b) => {
      const an = Number(a[0]);
      const bn = Number(b[0]);
      if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
      return String(a[0]).localeCompare(String(b[0]));
    })
    .map(([, r]) => r);
};

const extractTypes = () => {
  const text = document.body.innerText;
  const grab = (label) => {
    const re = new RegExp(`${label}\\s*[\\t:\\n]\\s*([^\\n]+)`, "i");
    const m = text.match(re);
    return m ? m[1].trim() : null;
  };
  return {
    generic: grab("General vessel type"),
    detailed: grab("Detailed vessel type"),
  };
};

async function main() {
  const raw = JSON.parse(fs.readFileSync(IN, "utf8"));
  const drillShiptype = process.argv[2]; // e.g. `node spot-check-ship-types.mjs 3`
  const samples = drillShiptype
    ? pickByField(raw.data.rows, "GT_SHIPTYPE", (r) => r.SHIPTYPE === drillShiptype)
    : pickByField(raw.data.rows, "SHIPTYPE");

  const mode = drillShiptype
    ? `one per GT_SHIPTYPE within SHIPTYPE=${drillShiptype}`
    : "one per SHIPTYPE";
  console.log(`Spot-checking ${samples.length} ships, ${mode}:\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );

  const results = [];

  for (const s of samples) {
    const url = `https://www.marinetraffic.com/en/ais/details/ships/shipid:${s.SHIP_ID}`;
    const row = {
      SHIPTYPE: s.SHIPTYPE,
      GT_SHIPTYPE: s.GT_SHIPTYPE ?? null,
      name: s.SHIPNAME,
      ship_id: s.SHIP_ID,
      url,
    };
    try {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
      await new Promise((r) => setTimeout(r, 2000));
      const types = await page.evaluate(extractTypes);
      Object.assign(row, types);
    } catch (err) {
      row.error = err.message;
    }
    results.push(row);
    console.log(
      `SHIPTYPE=${row.SHIPTYPE} GT=${row.GT_SHIPTYPE ?? "-"} ${row.name}`
    );
    console.log(`  generic : ${row.generic ?? "-"}`);
    console.log(`  detailed: ${row.detailed ?? "-"}`);
    if (row.error) console.log(`  ERROR   : ${row.error}`);
    console.log(`  ${url}\n`);
  }

  await browser.close();

  console.log("\n=== Summary ===");
  console.table(
    results.map((r) => ({
      SHIPTYPE: r.SHIPTYPE,
      GT: r.GT_SHIPTYPE ?? "-",
      name: r.name,
      generic: r.generic ?? "-",
      detailed: r.detailed ?? "-",
    }))
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
