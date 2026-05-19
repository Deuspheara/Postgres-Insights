import { NextRequest, NextResponse } from "next/server";
import { introspectSchema } from "@/lib/schema";
import { getCachedSchema, setCachedSchema } from "@/lib/cache";

export async function GET(req: NextRequest) {
  const refresh = req.nextUrl.searchParams.get("refresh") === "true";
  if (!refresh) {
    const cached = getCachedSchema();
    if (cached) return NextResponse.json({ ...cached, fromCache: true });
  }
  try {
    const schema = await introspectSchema();
    setCachedSchema(schema);
    return NextResponse.json(schema);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
