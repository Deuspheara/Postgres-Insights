import { NextRequest, NextResponse } from "next/server";
import { getAllDashboards, saveDashboard } from "@/lib/cache";
import { loadSettings } from "@/lib/settings";
import type { Dashboard } from "@/types";
import { apiError } from "@/lib/api-utils";

export async function GET() {
  const connectionId = loadSettings().activeConnectionId;
  if (!connectionId) return NextResponse.json([]);
  return NextResponse.json(getAllDashboards(connectionId));
}

export async function POST(req: NextRequest) {
  try {
    const connectionId = loadSettings().activeConnectionId;
    if (!connectionId) {
      return NextResponse.json({ error: "No active connection." }, { status: 400 });
    }
    const body = await req.json() as Partial<Dashboard>;
    const dashboard: Dashboard = {
      id: body.id ?? crypto.randomUUID(),
      connectionId,
      title: body.title ?? "Untitled Dashboard",
      description: body.description,
      tiles: body.tiles ?? [],
      state: body.state ?? "draft",
      createdAt: body.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fromSuggestionId: body.fromSuggestionId,
    };
    saveDashboard(connectionId, dashboard);
    return NextResponse.json(dashboard);
  } catch (e: unknown) {
    return apiError(e, 400);
  }
}
