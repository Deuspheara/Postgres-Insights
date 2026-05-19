import { NextRequest, NextResponse } from "next/server";
import { withClient } from "@/lib/db";
import { z } from "zod";
import { apiError } from "@/lib/api-utils";

const schema = z.object({ sql: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    const { sql } = schema.parse(await req.json());
    const result = await withClient(async (client) => {
      await client.query("SET statement_timeout = 10000");
      return client.query(`EXPLAIN (FORMAT JSON, ANALYZE false, BUFFERS false) ${sql}`);
    });
    return NextResponse.json({ plan: result.rows[0]["QUERY PLAN"] });
  } catch (e: unknown) {
    return apiError(e, 400);
  }
}
