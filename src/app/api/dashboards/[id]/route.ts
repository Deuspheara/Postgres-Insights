import { NextRequest, NextResponse } from "next/server";
import { getDashboard, saveDashboard, deleteDashboard } from "@/lib/cache";
import type { Dashboard } from "@/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const dashboard = getDashboard(id);
  if (!dashboard) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(dashboard);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = getDashboard(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json() as Partial<Dashboard>;
  const updated: Dashboard = { ...existing, ...body, id, updatedAt: new Date().toISOString() };
  saveDashboard(updated);
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  deleteDashboard(id);
  return NextResponse.json({ ok: true });
}
