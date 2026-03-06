import { NextResponse } from "next/server";
import { getProjects } from "@/lib/data/projects";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getProjects();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to scan projects" }, { status: 500 });
  }
}
