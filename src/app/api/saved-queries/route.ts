import { NextRequest, NextResponse } from "next/server";
import { getAllSavedQueries, saveQuery, deleteQuery } from "@/lib/cache";
import { loadSettings } from "@/lib/settings";
import type { SavedQuery } from "@/types";
import { z } from "zod";
import { apiError } from "@/lib/api-utils";

export async function GET() {
  const connectionId = loadSettings().activeConnectionId;
  if (!connectionId) return NextResponse.json([]);
  return NextResponse.json(getAllSavedQueries(connectionId));
}

const schema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  sql: z.string().min(1),
  description: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const connectionId = loadSettings().activeConnectionId;
    if (!connectionId) {
      return NextResponse.json({ error: "No active connection." }, { status: 400 });
    }
    const body = schema.parse(await req.json());
    const query: SavedQuery = {
      id: body.id ?? crypto.randomUUID(),
      connectionId,
      name: body.name,
      sql: body.sql,
      description: body.description,
      createdAt: new Date().toISOString(),
    };
    saveQuery(connectionId, query);
    return NextResponse.json(query);
  } catch (e: unknown) {
    return apiError(e, 400);
  }
}

export async function DELETE(req: NextRequest) {
  const connectionId = loadSettings().activeConnectionId;
  if (!connectionId) {
    return NextResponse.json({ error: "No active connection." }, { status: 400 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  deleteQuery(connectionId, id);
  return NextResponse.json({ ok: true });
}
