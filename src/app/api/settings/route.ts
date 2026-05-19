import { apiError } from "@/lib/api-utils";
import { NextResponse } from "next/server";
import { loadSettings, saveSettings } from "@/lib/settings";
import { SENTINEL_API_KEY } from "@/types";
import { z } from "zod";
import { NextRequest } from "next/server";

export async function GET() {
  const settings = loadSettings();
  const safe = {
    ...settings,
    connections: settings.connections.map((c) => ({
      ...c,
      connectionString: c.connectionString ? SENTINEL_API_KEY : null,
      openRouterApiKey: c.openRouterApiKey ? SENTINEL_API_KEY : undefined,
    })),
  };
  return NextResponse.json(safe);
}

const patchSchema = z.object({
  safetyConfig: z
    .object({
      maxPreviewRows: z.number().min(1).max(10000),
      maxChartRows: z.number().min(100).max(1000000),
      previewTimeoutMs: z.number().min(1000).max(60000),
      analyticsTimeoutMs: z.number().min(5000).max(300000),
      expensiveTimeoutMs: z.number().min(10000).max(600000),
      maxConcurrentTiles: z.number().min(1).max(20),
      maxConcurrentExpensive: z.number().min(1).max(5),
      safeMode: z.boolean(),
      writesEnabled: z.boolean(),
    })
    .partial()
    .optional(),
  connection: z
    .object({
      openRouterApiKey: z.string().optional(),
      aiModel: z.string().optional(),
      allowSampleRows: z.boolean().optional(),
      safeMode: z.boolean().optional(),
    })
    .optional(),
  activeConnectionId: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const body = patchSchema.parse(await req.json());
    const settings = loadSettings();
    if (body.safetyConfig) {
      settings.safetyConfig = { ...settings.safetyConfig, ...body.safetyConfig };
    }
    if (body.activeConnectionId) {
      settings.activeConnectionId = body.activeConnectionId;
    }
    if (body.connection && settings.activeConnectionId) {
      const idx = settings.connections.findIndex((c) => c.id === settings.activeConnectionId);
      if (idx !== -1) {
        settings.connections[idx] = { ...settings.connections[idx], ...body.connection };
      }
    }
    saveSettings(settings);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return apiError(e, 400);
  }
}
