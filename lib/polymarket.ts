import fs from "fs";
import path from "path";
import type { PolymarketOdds } from "./portwatch";

const DATA_PATH = path.join(process.cwd(), "public/data/polymarket.json");

export function getPolymarketOdds(): PolymarketOdds | null {
  try {
    const raw = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
    return raw;
  } catch {
    return null;
  }
}
