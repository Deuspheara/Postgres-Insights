import { NextRequest, NextResponse } from "next/server";
import { generateSuggestions } from "@/lib/ai";
import { getCachedSchema, getCachedSuggestions, setCachedSuggestions, getCachedProfile } from "@/lib/cache";
import { loadSettings } from "@/lib/settings";
import { apiError } from "@/lib/api-utils";

function getConnectionId() {
  return loadSettings().activeConnectionId;
}

export async function POST(req: NextRequest) {
  const connectionId = getConnectionId();
  if (!connectionId) {
    return NextResponse.json({ error: "No active connection." }, { status: 400 });
  }
  const refresh = (await req.json().catch(() => ({}))).refresh === true;

  if (!refresh) {
    const cached = getCachedSuggestions(connectionId);
    if (cached) return NextResponse.json({ ...cached, fromCache: true });
  }

  const schema = getCachedSchema(connectionId);
  if (!schema) {
    return NextResponse.json({ error: "Schema not loaded. Fetch /api/schema first." }, { status: 400 });
  }

  const profiles = schema.tables
    .map((t) => getCachedProfile(connectionId, t.fullName))
    .filter(Boolean);

  try {
    const suggestions = await generateSuggestions(schema, profiles as never, connectionId);
    setCachedSuggestions(connectionId, suggestions);
    return NextResponse.json(suggestions);
  } catch (e: unknown) {
    return apiError(e);
  }
}
