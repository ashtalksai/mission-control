import { NextResponse } from "next/server";
import { getAgentProfile } from "@/lib/data/agent-profiles";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const profile = await getAgentProfile(name);
  if (!profile) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }
  return NextResponse.json(profile);
}
