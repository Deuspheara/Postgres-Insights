import { NextRequest, NextResponse } from "next/server";
import { generateDashboardFromPrompt } from "@/lib/ai";
import { getCachedSchema, getCachedProfile } from "@/lib/cache";
import { z } from "zod";

const schema = z.object({ 
  prompt: z.string().min(1, "Prompt is required"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt } = schema.parse(body);
    
    const schemaInfo = getCachedSchema();
    if (!schemaInfo) {
      return NextResponse.json({ error: "Schema not loaded. Fetch /api/schema first." }, { status: 400 });
    }

    const profiles = schemaInfo.tables
      .map((t) => getCachedProfile(t.fullName))
      .filter((p): p is NonNullable<typeof p> => p !== null);

    const result = await generateDashboardFromPrompt(prompt, schemaInfo, profiles);
    return NextResponse.json(result);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
