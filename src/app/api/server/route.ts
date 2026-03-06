import { NextResponse } from "next/server";
import { getServerHealth } from "@/lib/data/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getServerHealth();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to reach server",
        disk: { total: "?", used: "?", available: "?", usagePercent: 0 },
        memory: { total: 0, used: 0, available: 0, usagePercent: 0 },
        containers: { total: 0, running: 0, list: [] },
        uptime: "unknown",
        lastChecked: new Date().toISOString(),
      },
      { status: 200 }
    );
  }
}
