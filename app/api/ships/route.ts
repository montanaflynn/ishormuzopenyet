import { NextResponse } from "next/server";
import type { ShipsResponse } from "@/lib/types";
import { getShips } from "@/lib/ships";

const CACHE_TTL_MS = 3 * 60 * 1000;
const MIN_SHIPS_FOR_OPEN = 5;

let cache: { data: ShipsResponse; timestamp: number } | null = null;

export async function GET() {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cache.data);
  }

  try {
    const ships = await getShips();
    const movingShips = ships.filter((s) => s.speed > 0.5);
    const isOpen = movingShips.length >= MIN_SHIPS_FOR_OPEN;

    const response: ShipsResponse = {
      ships,
      isOpen,
      lastUpdated: new Date().toISOString(),
    };

    cache = { data: response, timestamp: Date.now() };
    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to fetch ships:", error);
    if (cache) return NextResponse.json(cache.data);
    return NextResponse.json(
      { ships: [], isOpen: true, lastUpdated: new Date().toISOString() },
      { status: 500 }
    );
  }
}
