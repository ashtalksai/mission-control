import { NextResponse } from "next/server";
import { runHealthChecks } from "@/lib/data/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks = await runHealthChecks();
  return NextResponse.json(checks);
}
