import { NextResponse } from "next/server";
import { getPipelineData } from "@/lib/data/pipeline";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getPipelineData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Pipeline API error:", error);
    return NextResponse.json({ error: "Failed to fetch pipeline" }, { status: 500 });
  }
}
