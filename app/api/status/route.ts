import { NextResponse } from "next/server";
import { getStraitStatus } from "@/lib/portwatch";
import { getPolymarketOdds } from "@/lib/polymarket";

export async function GET() {
  try {
    const [status, polymarket] = await Promise.all([
      getStraitStatus(),
      getPolymarketOdds(),
    ]);
    return NextResponse.json({ ...status, polymarket }, {
      headers: {
        // Cache at edge for 1 hour, serve stale for up to 24 hours while revalidating
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
