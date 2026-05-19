import { NextResponse } from "next/server";
import { loadSettings, saveSettings } from "@/lib/settings";
import { z } from "zod";
import { NextRequest } from "next/server";

export async function GET() {
  const settings = loadSettings();
  // Redact secrets
  const safe = {
    ...settings,
    connection: settings.connection
      ? {
          ...settings.connection,
          connectionString: settings.connection.connectionString ? "***configured***" : null,
          openRouterApiKey: settings.connection.openRouterApiKey ? "***configured***" : undefined,
        }
      : null,
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
});

export async function PATCH(req: NextRequest) {
  try {
    const body = patchSchema.parse(await req.json());
    const settings = loadSettings();
    if (body.safetyConfig) {
      settings.safetyConfig = { ...settings.safetyConfig, ...body.safetyConfig };
    }
    if (body.connection && settings.connection) {
      settings.connection = { ...settings.connection, ...body.connection };
    }
    saveSettings(settings);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
