import { NextRequest, NextResponse } from "next/server";
import { generateDashboardFromPrompt } from "@/lib/ai";
import { getCachedSchema, getCachedProfile } from "@/lib/cache";
import { loadSettings } from "@/lib/settings";
import { z } from "zod";
import { apiError } from "@/lib/api-utils";

const schema = z.object({ 
  prompt: z.string().min(1, "Prompt is required"),
});

export async function POST(req: NextRequest) {
  try {
    const connectionId = loadSettings().activeConnectionId;
    if (!connectionId) {
      return NextResponse.json({ error: "No active connection." }, { status: 400 });
    }
    const body = await req.json();
    const { prompt } = schema.parse(body);
    
    const schemaInfo = getCachedSchema(connectionId);
    if (!schemaInfo) {
      return NextResponse.json({ error: "Schema not loaded. Fetch /api/schema first." }, { status: 400 });
    }

    const profiles = schemaInfo.tables
      .map((t) => getCachedProfile(connectionId, t.fullName))
      .filter((p): p is NonNullable<typeof p> => p !== null);

    const result = await generateDashboardFromPrompt(prompt, schemaInfo, profiles);
    return NextResponse.json(result);
  } catch (e: unknown) {
    return apiError(e);
  }
}