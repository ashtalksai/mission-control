import { NextResponse } from "next/server";
import { getGatewayLogs, getCronRunHistory } from "@/lib/data/logs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source"); // "cron" | "gateway" | null (all)
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "200"), 500);

  const [gatewayLogs, cronRuns] = await Promise.all([
    source === "cron" ? Promise.resolve([]) : getGatewayLogs(limit),
    source === "gateway" ? Promise.resolve([]) : getCronRunHistory(limit),
  ]);

  return NextResponse.json({ gatewayLogs, cronRuns });
}
