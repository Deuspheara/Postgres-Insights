import { NextRequest, NextResponse } from "next/server";
import { profileTable } from "@/lib/profiler";
import { getCachedProfile, setCachedProfile, getCachedSchema } from "@/lib/cache";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  const { table } = await params;
  const tableName = decodeURIComponent(table);
  const refresh = req.nextUrl.searchParams.get("refresh") === "true";

  if (!refresh) {
    const cached = getCachedProfile(tableName);
    if (cached) return NextResponse.json({ ...cached, fromCache: true });
  }

  const schema = getCachedSchema();
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
      tableInfo.estimatedRowCount
    );
    setCachedProfile(profile);
    return NextResponse.json(profile);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
