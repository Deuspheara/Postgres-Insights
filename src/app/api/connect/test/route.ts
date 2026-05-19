import { NextRequest, NextResponse } from "next/server";
import { testConnection, resetPool } from "@/lib/db";
import { loadSettings, saveSettings } from "@/lib/settings";
import { z } from "zod";

const schema = z.object({
  connectionString: z.string().min(1),
  openRouterApiKey: z.string().optional(),
  aiModel: z.string().optional(),
  allowSampleRows: z.boolean().optional(),
  privacyMode: z.boolean().optional(),
  safeMode: z.boolean().optional(),
  save: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const result = await testConnection(body.connectionString);

    if (result.ok && body.save) {
      resetPool();
      const settings = loadSettings();
      settings.connection = {
        connectionString: body.connectionString,
        openRouterApiKey: body.openRouterApiKey,
        aiModel: body.aiModel ?? "openai/gpt-4o-mini",
        allowSampleRows: body.allowSampleRows ?? false,
        privacyMode: body.privacyMode ?? true,
        safeMode: body.safeMode ?? true,
      };
      settings.lastConnectedAt = new Date().toISOString();
      saveSettings(settings);
    }

    return NextResponse.json(result);
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }
}
