import { NextResponse } from "next/server";
import { getStraitStatus } from "@/lib/portwatch";
import { getPolymarketOdds } from "@/lib/polymarket";
import { getWindwardData } from "@/lib/windward";

export function GET() {
  try {
    const status = getStraitStatus();
    const windward = getWindwardData();
    const polymarket = getPolymarketOdds();

    // Open = latest Windward day >= 75% of pre-crisis average
    const isOpen = windward?.latest
      ? windward.latest.total >= status.avgPreCrisis * 0.5
      : false;

    return NextResponse.json({ ...status, isOpen, polymarket, windward }, {
      headers: {
        "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Failed to fetch strait status:", error);
    return NextResponse.json(
      { error: "Failed to fetch status" },
      { status: 500 }
    );
  }
}
