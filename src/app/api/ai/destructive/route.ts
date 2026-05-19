import { NextRequest, NextResponse } from "next/server";
import { generateDestructivePlan } from "@/lib/ai";
import { getCachedSchema } from "@/lib/cache";
import { z } from "zod";

const schema = z.object({ prompt: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    const { prompt } = schema.parse(await req.json());
    const schemaInfo = getCachedSchema();
    if (!schemaInfo) {
      return NextResponse.json({ error: "Schema not loaded. Fetch /api/schema first." }, { status: 400 });
    }
    const result = await generateDestructivePlan(prompt, schemaInfo);
    return NextResponse.json(result);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
