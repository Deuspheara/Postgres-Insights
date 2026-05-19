import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { loadSettings, saveSettings } from "@/lib/settings";
import { testConnection } from "@/lib/db";
import { apiError, badRequest } from "@/lib/api-utils";
import { SENTINEL_API_KEY } from "@/types";

export async function GET() {
  const settings = loadSettings();
  const connections = settings.connections.map((c) => ({
    ...c,
    connectionString: c.connectionString ? SENTINEL_API_KEY : null,
    openRouterApiKey: c.openRouterApiKey ? SENTINEL_API_KEY : undefined,
  }));
  return NextResponse.json({ connections });
}

const createSchema = z.object({
  name: z.string().min(1),
  connectionString: z.string().min(1),
  color: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = createSchema.parse(await req.json());
    const result = await testConnection(body.connectionString);
    if (!result.ok) {
      return badRequest(result.error ?? "Connection test failed.");
    }
    const settings = loadSettings();
    const id = crypto.randomUUID();
    const connection = {
      id,
      name: body.name,
      color: body.color,
      connectionString: body.connectionString,
    };
    settings.connections.push(connection);
    saveSettings(settings);
    return NextResponse.json({
      ...connection,
      connectionString: SENTINEL_API_KEY,
    });
  } catch (e: unknown) {
    if (e instanceof z.ZodError) return badRequest(e.issues[0].message);
    return apiError(e, 400);
  }
}
