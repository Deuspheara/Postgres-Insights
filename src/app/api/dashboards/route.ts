import { NextRequest, NextResponse } from "next/server";
import { getAllDashboards, saveDashboard } from "@/lib/cache";
import type { Dashboard } from "@/types";
import { apiError } from "@/lib/api-utils";

export async function GET() {
  return NextResponse.json(getAllDashboards());
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Partial<Dashboard>;
    const dashboard: Dashboard = {
      id: body.id ?? crypto.randomUUID(),
      title: body.title ?? "Untitled Dashboard",
      description: body.description,
      tiles: body.tiles ?? [],
      state: body.state ?? "draft",
      createdAt: body.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fromSuggestionId: body.fromSuggestionId,
    };
    saveDashboard(dashboard);
    return NextResponse.json(dashboard);
  } catch (e: unknown) {
    return apiError(e, 400);
  }
}
