import { NextRequest, NextResponse } from "next/server";
import { getAllSavedQueries, saveQuery, deleteQuery } from "@/lib/cache";
import type { SavedQuery } from "@/types";
import { z } from "zod";

export async function GET() {
  return NextResponse.json(getAllSavedQueries());
}

const schema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  sql: z.string().min(1),
  description: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const query: SavedQuery = {
      id: body.id ?? crypto.randomUUID(),
      name: body.name,
      sql: body.sql,
      description: body.description,
      createdAt: new Date().toISOString(),
    };
    saveQuery(query);
    return NextResponse.json(query);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  deleteQuery(id);
  return NextResponse.json({ ok: true });
}
