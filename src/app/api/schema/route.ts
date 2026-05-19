import { NextRequest, NextResponse } from "next/server";
import { introspectSchema } from "@/lib/schema";
import { getCachedSchema, setCachedSchema } from "@/lib/cache";
import { loadSettings } from "@/lib/settings";
import { apiError } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  const connectionId = loadSettings().activeConnectionId;
  if (!connectionId) {
    return NextResponse.json({ error: "No active connection." }, { status: 400 });
  }
  const refresh = req.nextUrl.searchParams.get("refresh") === "true";
  if (!refresh) {
    const cached = getCachedSchema(connectionId);
    if (cached) return NextResponse.json({ ...cached, fromCache: true });
  }
  try {
    const schema = await introspectSchema(connectionId);
    setCachedSchema(connectionId, schema);
    return NextResponse.json(schema);
  } catch (e: unknown) {
    return apiError(e);
  }
}
