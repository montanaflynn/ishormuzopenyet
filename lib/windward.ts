import fs from "fs";
import path from "path";
import type { WindwardData, WindwardDay } from "./portwatch";

const DATA_PATH = path.join(process.cwd(), "public/data/windward-crossings.json");

export function getWindwardData(): WindwardData | null {
  try {
    const raw = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
    const days: WindwardDay[] = Object.values(raw.days || {});
    days.sort((a, b) => b.date.localeCompare(a.date)); // newest first

    return {
      fetchedAt: raw.fetchedAt,
      source: raw.source,
      days,
      latest: days[0] || null,
    };
  } catch {
    return null;
  }
}
