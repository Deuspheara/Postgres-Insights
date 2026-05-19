import { NextRequest, NextResponse } from "next/server";
import { runQuery } from "@/lib/query-runner";
import { z } from "zod";

const schema = z.object({
  sql: z.string().min(1),
  class: z.enum(["metadata", "preview", "analytics", "expensive"]).optional(),
  params: z.array(z.unknown()).optional(),
  maxRows: z.number().optional(),
  timeoutMs: z.number().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const result = await runQuery(body);
    return NextResponse.json(result);
  } catch (e: unknown) {
    return NextResponse.json(
      { rows: [], fields: [], rowCount: 0, durationMs: 0, truncated: false, error: (e as Error).message },
      { status: 400 }
    );
  }
}
