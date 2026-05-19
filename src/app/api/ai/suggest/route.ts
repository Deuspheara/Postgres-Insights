import { NextRequest, NextResponse } from "next/server";
import { generateSuggestions } from "@/lib/ai";
import { getCachedSchema, getCachedSuggestions, setCachedSuggestions } from "@/lib/cache";

export async function POST(req: NextRequest) {
  const refresh = (await req.json().catch(() => ({}))).refresh === true;

  if (!refresh) {
    const cached = getCachedSuggestions();
    if (cached) return NextResponse.json({ ...cached, fromCache: true });
  }

  const schema = getCachedSchema();
  if (!schema) {
    return NextResponse.json({ error: "Schema not loaded. Fetch /api/schema first." }, { status: 400 });
  }

  // Gather available profiles
  const { getCachedProfile } = await import("@/lib/cache");
  const profiles = schema.tables
    .map((t) => getCachedProfile(t.fullName))
    .filter(Boolean) as Awaited<ReturnType<typeof getCachedProfile>>[];

  try {
    const suggestions = await generateSuggestions(schema, profiles as never);
    setCachedSuggestions(suggestions);
    return NextResponse.json(suggestions);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
