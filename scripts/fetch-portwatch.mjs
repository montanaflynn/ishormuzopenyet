import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../public/data/portwatch.json");

const ARCGIS_URL =
  "https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/Daily_Chokepoints_Data/FeatureServer/0/query";

async function main() {
  console.log("Fetching IMF PortWatch data...");

  const params = new URLSearchParams({
    where: "portid='chokepoint6'",
    outFields: "*",
    orderByFields: "date DESC",
    resultRecordCount: "365",
    maxRecordCountFactor: "5",
    f: "json",
  });

  const res = await fetch(`${ARCGIS_URL}?${params}`);
  const data = await res.json();
  const features = data.features ?? [];

  const days = features.map((f) => {
    const a = f.attributes;
    return {
      date: new Date(a.date).toISOString().split("T")[0],
      total: a.n_total ?? 0,
      tanker: a.n_tanker ?? 0,
      container: a.n_container ?? 0,
      dryBulk: a.n_dry_bulk ?? 0,
      generalCargo: a.n_general_cargo ?? 0,
      roro: a.n_roro ?? 0,
      capacity: a.capacity ?? 0,
    };
  });

  const output = {
    fetchedAt: new Date().toISOString(),
    days,
  };

  console.log(`${days.length} days, latest: ${days[0]?.date}`);
  fs.writeFileSync(OUT, JSON.stringify(output));
  console.log(`Written to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
