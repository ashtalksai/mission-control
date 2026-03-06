import { NextResponse } from "next/server";
import { getAgentStatus } from "@/lib/data/agents";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getAgentStatus();
  return NextResponse.json(data);
}
