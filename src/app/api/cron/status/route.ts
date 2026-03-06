import { NextResponse } from "next/server";
import { getCronStatus } from "@/lib/data/cron";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getCronStatus();
  return NextResponse.json(data);
}
