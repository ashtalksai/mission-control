import { NextResponse } from "next/server";
import { getProjectDetail } from "@/lib/data/projects";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  try {
    const data = await getProjectDetail(name);
    if (!data) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to load project" }, { status: 500 });
  }
}
