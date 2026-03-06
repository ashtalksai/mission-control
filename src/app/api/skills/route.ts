import { NextResponse } from "next/server";
import { getAllSkills } from "@/lib/data/skills";

export const dynamic = "force-dynamic";

export async function GET() {
  const skills = await getAllSkills();
  // Return without full content for the list view
  const summaries = skills.map(({ content, ...rest }) => ({
    ...rest,
    contentPreview: content.slice(0, 200),
  }));
  return NextResponse.json(summaries);
}
