import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getQueryHistory, addQueryHistory, clearQueryHistory } from "@/lib/query-history";
import { loadSettings } from "@/lib/settings";
import { apiError } from "@/lib/api-utils";
import type { QueryHistoryEntry } from "@/types";

export async function GET() {
  try {
    const connectionId = loadSettings().activeConnectionId;
    if (!connectionId) return NextResponse.json([]);
    return NextResponse.json(getQueryHistory(connectionId));
  } catch (e: unknown) {
    return apiError(e);
  }
}

const postSchema = z.object({
  sql: z.string().min(1),
  durationMs: z.number(),
  rowCount: z.number(),
  error: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const connectionId = loadSettings().activeConnectionId;
    if (!connectionId) {
      return NextResponse.json({ error: "No active connection." }, { status: 400 });
    }
    const body = postSchema.parse(await req.json());
    const entry: QueryHistoryEntry = {
      id: crypto.randomUUID(),
      sql: body.sql,
      executedAt: new Date().toISOString(),
      durationMs: body.durationMs,
      rowCount: body.rowCount,
      error: body.error,
    };
    addQueryHistory(connectionId, entry);
    return NextResponse.json(entry);
  } catch (e: unknown) {
    return apiError(e, 400);
  }
}

export async function DELETE() {
  try {
    const connectionId = loadSettings().activeConnectionId;
    if (!connectionId) {
      return NextResponse.json({ error: "No active connection." }, { status: 400 });
    }
    clearQueryHistory(connectionId);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return apiError(e);
  }
}
