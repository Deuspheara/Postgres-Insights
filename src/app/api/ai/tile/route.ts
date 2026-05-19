import { NextRequest, NextResponse } from "next/server";
import { generateTileFromPrompt } from "@/lib/ai";
import { getCachedSchema } from "@/lib/cache";
import { z } from "zod";
import { apiError } from "@/lib/api-utils";

const schema = z.object({ 
  prompt: z.string().min(1, "Prompt is required"),
  suggestedChartType: z.string().optional()
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, suggestedChartType } = schema.parse(body);
    
    const schemaInfo = getCachedSchema();
    if (!schemaInfo) {
      return NextResponse.json({ error: "Schema not loaded. Fetch /api/schema first." }, { status: 400 });
    }

    const result = await generateTileFromPrompt(prompt, schemaInfo, suggestedChartType);
    return NextResponse.json(result);
  } catch (e: unknown) {
    return apiError(e);
  }
}
