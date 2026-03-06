import { NextResponse } from "next/server";
import { getAllAgentProfiles } from "@/lib/data/agent-profiles";

export const dynamic = "force-dynamic";

export async function GET() {
  const profiles = await getAllAgentProfiles();
  // Return without full instructions for the list view
  const summaries = profiles.map(({ instructions, ...rest }) => ({
    ...rest,
    instructionsPreview: instructions.slice(0, 200),
  }));
  return NextResponse.json(summaries);
}
