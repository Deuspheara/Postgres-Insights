import { NextRequest, NextResponse } from "next/server";
import { getDashboard, saveDashboard, deleteDashboard } from "@/lib/cache";
import { loadSettings } from "@/lib/settings";
import type { Dashboard } from "@/types";

function getConnectionId() {
  return loadSettings().activeConnectionId;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const connectionId = getConnectionId();
  if (!connectionId) return NextResponse.json({ error: "No active connection." }, { status: 400 });
  const { id } = await params;
  const dashboard = getDashboard(connectionId, id);
  if (!dashboard) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(dashboard);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const connectionId = getConnectionId();
  if (!connectionId) return NextResponse.json({ error: "No active connection." }, { status: 400 });
  const { id } = await params;
  const existing = getDashboard(connectionId, id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json() as Partial<Dashboard>;
  const updated: Dashboard = { ...existing, ...body, id, updatedAt: new Date().toISOString() };
  saveDashboard(connectionId, updated);
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const connectionId = getConnectionId();
  if (!connectionId) return NextResponse.json({ error: "No active connection." }, { status: 400 });
  const { id } = await params;
  deleteDashboard(connectionId, id);
  return NextResponse.json({ ok: true });
}
