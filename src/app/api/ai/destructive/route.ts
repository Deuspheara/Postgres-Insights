import { NextRequest, NextResponse } from "next/server";
import { generateDestructivePlan } from "@/lib/ai";
import { getCachedSchema } from "@/lib/cache";
import { loadSettings } from "@/lib/settings";
import { z } from "zod";
import { apiError } from "@/lib/api-utils";

const schema = z.object({ prompt: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    const connectionId = loadSettings().activeConnectionId;
    if (!connectionId) {
      return NextResponse.json({ error: "No active connection." }, { status: 400 });
    }
    const { prompt } = schema.parse(await req.json());
    const schemaInfo = getCachedSchema(connectionId);
    if (!schemaInfo) {
      return NextResponse.json({ error: "Schema not loaded. Fetch /api/schema first." }, { status: 400 });
    }
    const result = await generateDestructivePlan(prompt, schemaInfo);
    return NextResponse.json(result);
  } catch (e: unknown) {
    return apiError(e);
  }
}