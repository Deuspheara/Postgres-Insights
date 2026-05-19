import { NextRequest, NextResponse } from "next/server";
import { loadSettings, saveSettings } from "@/lib/settings";
import { apiError, notFound } from "@/lib/api-utils";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const settings = loadSettings();
    if (!settings.connections.some((c) => c.id === id)) {
      return notFound("Connection not found.");
    }
    settings.activeConnectionId = id;
    saveSettings(settings);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return apiError(e, 400);
  }
}
