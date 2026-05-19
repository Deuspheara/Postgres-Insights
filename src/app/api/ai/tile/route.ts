import { NextRequest, NextResponse } from "next/server";
import { generateTileFromPrompt } from "@/lib/ai";
import { getCachedSchema } from "@/lib/cache";
import { loadSettings } from "@/lib/settings";
import { z } from "zod";
import { apiError } from "@/lib/api-utils";

const schema = z.object({ 
  prompt: z.string().min(1, "Prompt is required"),
  suggestedChartType: z.string().optional()
});

export async function POST(req: NextRequest) {
  try {
    const connectionId = loadSettings().activeConnectionId;
    if (!connectionId) {
      return NextResponse.json({ error: "No active connection." }, { status: 400 });
    }
    const body = await req.json();
    const { prompt, suggestedChartType } = schema.parse(body);
    
    const schemaInfo = getCachedSchema(connectionId);
    if (!schemaInfo) {
      return NextResponse.json({ error: "Schema not loaded. Fetch /api/schema first." }, { status: 400 });
    }

    const result = await generateTileFromPrompt(prompt, schemaInfo, suggestedChartType);
    return NextResponse.json(result);
  } catch (e: unknown) {
    return apiError(e);
  }
}