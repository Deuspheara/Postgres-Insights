import { NextRequest, NextResponse } from "next/server";
import { profileTable } from "@/lib/profiler";
import { getCachedProfile, setCachedProfile, getCachedSchema } from "@/lib/cache";
import { loadSettings } from "@/lib/settings";
import { apiError } from "@/lib/api-utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  const connectionId = loadSettings().activeConnectionId;
  if (!connectionId) {
    return NextResponse.json({ error: "No active connection." }, { status: 400 });
  }
  const { table } = await params;
  const tableName = decodeURIComponent(table);
  const refresh = req.nextUrl.searchParams.get("refresh") === "true";

  if (!refresh) {
    const cached = getCachedProfile(connectionId, tableName);
    if (cached) return NextResponse.json({ ...cached, fromCache: true });
  }

  const schema = getCachedSchema(connectionId);
  if (!schema) {
    return NextResponse.json({ error: "Schema not loaded. Fetch /api/schema first." }, { status: 400 });
  }

  const tableInfo = schema.tables.find((t) => t.fullName === tableName);
  if (!tableInfo) {
    return NextResponse.json({ error: `Table ${tableName} not found in schema.` }, { status: 404 });
  }

  try {
    const profile = await profileTable(
      tableInfo.schema,
      tableInfo.name,
      tableInfo.columns,
      tableInfo.estimatedRowCount,
      connectionId
    );
    setCachedProfile(connectionId, profile);
    return NextResponse.json(profile);
  } catch (e: unknown) {
    return apiError(e);
  }
}
