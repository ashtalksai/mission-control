import { NextResponse } from "next/server";
import { getCostSummary } from "@/lib/data/costs";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getCostSummary();
  return NextResponse.json(data);
}
