import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../public/data/windward-crossings.json");

// Parse "8 April 2026" -> "2026-04-08"
function parseDate(str) {
  const d = new Date(str);
  return d.toISOString().split("T")[0];
}

async function main() {
  console.log("Fetching Windward insights page...");

  const res = await fetch("https://insights.windward.ai/");
  const html = await res.text();

  // Extract "Data as of ..." date
  const dateMatch = html.match(/Data as of (\d{1,2} \w+ \d{4})/);
  if (!dateMatch) {
    console.error("Could not find date on page");
    process.exit(1);
  }
  const asOfDate = dateMatch[1];

  // Extract 7-day chart labels: 'Apr 2', 'Apr 3', etc.
  const labelMatches = [...html.matchAll(/'((?:Apr|Mar|May|Jun|Feb|Jan) \d+)'/g)];
  const labels = labelMatches.map((m) => m[1]);

  // Extract chart data arrays: data:[1,3,6,3,4,4,1]
  const dataMatches = [...html.matchAll(/data:\[([0-9., ]+)\]/g)];
  const inboundData = dataMatches[0]
    ? dataMatches[0][1].split(",").map(Number)
    : [];
  const outboundData = dataMatches[1]
    ? dataMatches[1][1].split(",").map(Number)
    : [];

  // Extract today's key metrics
  const gulfMatch = html.match(/Vessels in Gulf[\s\S]*?(\d{2,4})/);
  const vesselsInGulf = gulfMatch ? parseInt(gulfMatch[1]) : null;

  const darkMatch = html.match(/Dark Activity Events[\s\S]*?(\d{2,4})/);
  const darkEvents = darkMatch ? parseInt(darkMatch[1]) : null;

  // Infer year from asOfDate
  const year = new Date(asOfDate).getFullYear();

  // Build daily entries from chart data
  const scraped = {};
  for (let i = 0; i < labels.length; i++) {
    const dateStr = parseDate(`${labels[i]} ${year}`);
    const inbound = inboundData[i] ?? 0;
    const outbound = outboundData[i] ?? 0;
    scraped[dateStr] = {
      date: dateStr,
      inbound,
      outbound,
      total: inbound + outbound,
    };
  }

  // Also extract today's AIS/dark breakdown for the latest day
  const inboundSection = html.match(
    /Inbound Crossings[\s\S]*?(\d+)\s*AIS[\s\S]*?(\d+)\s*Dark/i
  );
  const outboundSection = html.match(
    /Outbound Crossings[\s\S]*?(\d+)\s*AIS[\s\S]*?(\d+)\s*Dark/i
  );

  const latestDate = parseDate(asOfDate);
  if (scraped[latestDate]) {
    scraped[latestDate].inboundAIS = inboundSection
      ? parseInt(inboundSection[1])
      : null;
    scraped[latestDate].inboundDark = inboundSection
      ? parseInt(inboundSection[2])
      : null;
    scraped[latestDate].outboundAIS = outboundSection
      ? parseInt(outboundSection[1])
      : null;
    scraped[latestDate].outboundDark = outboundSection
      ? parseInt(outboundSection[2])
      : null;
    scraped[latestDate].vesselsInGulf = vesselsInGulf;
    scraped[latestDate].darkEvents = darkEvents;
  }

  // Load existing data and merge (existing data wins for days already saved)
  let existing = { days: {}, fetchedAt: null, source: null };
  if (fs.existsSync(OUT)) {
    try {
      existing = JSON.parse(fs.readFileSync(OUT, "utf-8"));
    } catch {}
  }

  // Merge: scraped data fills in missing days, doesn't overwrite existing
  const merged = { ...scraped };
  for (const [date, entry] of Object.entries(existing.days || {})) {
    if (merged[date]) {
      // Keep richer data (more fields = better)
      merged[date] = { ...merged[date], ...entry };
    } else {
      merged[date] = entry;
    }
  }

  // Sort by date
  const sortedDays = Object.fromEntries(
    Object.entries(merged).sort(([a], [b]) => a.localeCompare(b))
  );

  const output = {
    fetchedAt: new Date().toISOString(),
    source: "https://insights.windward.ai/",
    days: sortedDays,
  };

  const dayCount = Object.keys(sortedDays).length;
  const newDays = Object.keys(scraped).filter(
    (d) => !existing.days || !existing.days[d]
  ).length;

  console.log(`Date: ${asOfDate}`);
  console.log(`Chart data: ${labels.length} days`);
  for (let i = 0; i < labels.length; i++) {
    console.log(
      `  ${labels[i]}: ${inboundData[i] ?? "?"} in / ${outboundData[i] ?? "?"} out`
    );
  }
  console.log(`Vessels in Gulf: ${vesselsInGulf}`);
  console.log(`Dark Events: ${darkEvents}`);
  console.log(`\n${dayCount} total days (${newDays} new) → ${OUT}`);

  fs.writeFileSync(OUT, JSON.stringify(output, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
