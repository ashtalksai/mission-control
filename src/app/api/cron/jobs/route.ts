import { NextResponse } from "next/server";
import { getCronStatus } from "@/lib/data/cron";
import { getCronRunHistory } from "@/lib/data/logs";

export const dynamic = "force-dynamic";

export async function GET() {
  const [cronStatus, runHistory] = await Promise.all([
    getCronStatus(),
    getCronRunHistory(500),
  ]);

  return NextResponse.json({
    jobs: cronStatus.jobs,
    runHistory,
  });
}
