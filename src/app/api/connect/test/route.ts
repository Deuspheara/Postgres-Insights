import { NextRequest, NextResponse } from "next/server";
import { testConnection, resetPool } from "@/lib/db";
import { loadSettings, saveSettings } from "@/lib/settings";
import { z } from "zod";
import { apiError } from "@/lib/api-utils";
import crypto from "crypto";

const schema = z.object({
  connectionString: z.string().min(1),
  name: z.string().optional(),
  color: z.string().optional(),
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

    if (body.save) {
      resetPool();
      const settings = loadSettings();
      const id = crypto.randomUUID();
      settings.connections.push({
        id,
        name: body.name || "Connection",
        color: body.color,
        connectionString: body.connectionString,
        openRouterApiKey: body.openRouterApiKey,
        aiModel: body.aiModel ?? "openai/gpt-4o-mini",
        allowSampleRows: body.allowSampleRows ?? false,
        privacyMode: body.privacyMode ?? true,
        safeMode: body.safeMode ?? true,
      });
      settings.activeConnectionId = id;
      settings.lastConnectedAt = new Date().toISOString();
      saveSettings(settings);
    }

    return NextResponse.json({ ...result, saved: body.save && result.ok });
  } catch (e: unknown) {
    return apiError(e, 400);
  }
}
