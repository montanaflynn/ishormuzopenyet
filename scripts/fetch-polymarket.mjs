import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../public/data/polymarket.json");

const GAMMA_API = "https://gamma-api.polymarket.com";

const MARKETS = [
  {
    slug: "strait-of-hormuz-traffic-returns-to-normal-by-april-30",
    useUntil: "2026-05-01",
  },
  {
    slug: "strait-of-hormuz-traffic-returns-to-normal-by-end-of-may",
    useUntil: "2026-06-01",
  },
];

async function main() {
  const now = new Date().toISOString().split("T")[0];
  const market = MARKETS.find((m) => now < m.useUntil);

  if (!market) {
    console.log("No active market found");
    fs.writeFileSync(OUT, JSON.stringify(null));
    return;
  }

  console.log(`Fetching Polymarket: ${market.slug}...`);

  const res = await fetch(`${GAMMA_API}/markets?slug=${market.slug}`);
  const data = await res.json();

  if (!data || data.length === 0) {
    console.log("No market data returned");
    fs.writeFileSync(OUT, JSON.stringify(null));
    return;
  }

  const m = data[0];
  const prices = JSON.parse(m.outcomePrices);

  const output = {
    fetchedAt: new Date().toISOString(),
    question: m.question,
    yesPrice: parseFloat(prices[0]),
    volume: Math.round(m.volumeNum),
    slug: m.slug,
    endDate: m.endDate,
    url: `https://polymarket.com/event/${market.slug}`,
  };

  const pct = Math.round(output.yesPrice * 100);
  console.log(`${pct}% yes, $${output.volume.toLocaleString()} vol`);
  fs.writeFileSync(OUT, JSON.stringify(output, null, 2));
  console.log(`Written to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
