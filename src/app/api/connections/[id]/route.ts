import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { loadSettings, saveSettings } from "@/lib/settings";
import { resetPool } from "@/lib/db";
import { apiError, badRequest, notFound } from "@/lib/api-utils";
import { SENTINEL_API_KEY } from "@/types";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  connectionString: z.string().min(1).optional(),
  color: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = patchSchema.parse(await req.json());
    const { id } = await params;
    const settings = loadSettings();
    const idx = settings.connections.findIndex((c) => c.id === id);
    if (idx === -1) return notFound("Connection not found.");

    const existing = settings.connections[idx];
    const connectionStringChanged = body.connectionString && body.connectionString !== existing.connectionString;

    settings.connections[idx] = { ...existing, ...body };
    saveSettings(settings);

    if (connectionStringChanged) {
      resetPool(id);
    }

    const updated = settings.connections[idx];
    return NextResponse.json({
      ...updated,
      connectionString: updated.connectionString ? SENTINEL_API_KEY : null,
      openRouterApiKey: updated.openRouterApiKey ? SENTINEL_API_KEY : undefined,
    });
  } catch (e: unknown) {
    if (e instanceof z.ZodError) return badRequest(e.issues[0].message);
    return apiError(e, 400);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const settings = loadSettings();
    const idx = settings.connections.findIndex((c) => c.id === id);
    if (idx === -1) return notFound("Connection not found.");

    settings.connections.splice(idx, 1);

    if (settings.activeConnectionId === id) {
      settings.activeConnectionId = settings.connections[0]?.id ?? null;
    }

    saveSettings(settings);
    resetPool(id);

    const dataDir = path.join(process.cwd(), "data", id);
    if (fs.existsSync(dataDir)) {
      fs.rmSync(dataDir, { recursive: true, force: true });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return apiError(e, 400);
  }
}
