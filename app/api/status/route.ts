import { NextResponse } from "next/server";
import { getStraitStatus } from "@/lib/portwatch";

export async function GET() {
  try {
    const status = await getStraitStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error("Failed to fetch strait status:", error);
    return NextResponse.json(
      { error: "Failed to fetch status" },
      { status: 500 }
    );
  }
}
