import { NextResponse } from "next/server";
import { getRateLimitData } from "@/lib/data/ratelimits";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getRateLimitData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to parse error logs" },
      { status: 500 }
    );
  }
}
