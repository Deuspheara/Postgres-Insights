import { withClient } from "./db";
import { getSafetyConfig } from "./settings";
import type { QueryClass, QueryRequest, QueryResult } from "@/types";

// Simple concurrency semaphore
const semaphores: Record<string, number> = { interactive: 0, background: 0 };
const MAX_INTERACTIVE = 4;
const MAX_BACKGROUND = 1;

function classToLane(cls: QueryClass): "interactive" | "background" {
  return cls === "expensive" ? "background" : "interactive";
}

function getLaneMax(lane: "interactive" | "background") {
  return lane === "interactive" ? MAX_INTERACTIVE : MAX_BACKGROUND;
}

function detectMutations(sql: string): boolean {
  const upper = sql.trim().toUpperCase();
  return /^\s*(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|GRANT|REVOKE|COPY)\b/.test(upper);
}

function classifyQuery(sql: string): QueryClass {
  const upper = sql.trim().toUpperCase();
  if (/\bINFORMATION_SCHEMA\b|\bPG_CATALOG\b|\bPG_CLASS\b|\bPG_STAT\b/.test(upper)) return "metadata";
  if (/\bLIMIT\s+\d+\b/.test(upper) && !/\bJOIN\b.*\bJOIN\b/.test(upper)) return "preview";
  if (/\bGROUP BY\b|\bCOUNT\(|\bSUM\(|\bAVG\(/.test(upper)) return "analytics";
  return "expensive";
}

export async function runQuery(req: QueryRequest): Promise<QueryResult> {
  const safety = getSafetyConfig();
  const cls = req.class ?? classifyQuery(req.sql);
  const lane = classToLane(cls);
  const laneMax = getLaneMax(lane);

  // Concurrency check
  if (semaphores[lane] >= laneMax) {
    return {
      rows: [],
      fields: [],
      rowCount: 0,
      durationMs: 0,
      truncated: false,
      error: `Too many concurrent ${lane} queries. Please wait and retry.`,
    };
  }

  // Mutation guard
  if (detectMutations(req.sql) && !safety.writesEnabled) {
    return {
      rows: [],
      fields: [],
      rowCount: 0,
      durationMs: 0,
      truncated: false,
      error: "Write operations are disabled. Enable writes in Settings to proceed.",
    };
  }

  const timeout =
    req.timeoutMs ??
    (cls === "metadata"
      ? 10000
      : cls === "preview"
      ? safety.previewTimeoutMs
      : cls === "analytics"
      ? safety.analyticsTimeoutMs
      : safety.expensiveTimeoutMs);

  const maxRows =
    req.maxRows ??
    (cls === "preview" ? safety.maxPreviewRows : safety.maxChartRows);

  semaphores[lane]++;
  const start = Date.now();

  try {
    const result = await withClient(async (client) => {
      await client.query(`SET statement_timeout = ${timeout}`);
      await client.query("SET transaction_read_only = on");

      const res = await client.query({
        text: req.sql,
        values: req.params as unknown[],
      });

      return res;
    });

    const truncated = result.rows.length >= maxRows;
    return {
      rows: result.rows.slice(0, maxRows) as Record<string, unknown>[],
      fields: result.fields?.map((f) => ({ name: f.name, dataTypeID: f.dataTypeID })) ?? [],
      rowCount: result.rowCount ?? result.rows.length,
      durationMs: Date.now() - start,
      truncated,
    };
  } catch (e: unknown) {
    return {
      rows: [],
      fields: [],
      rowCount: 0,
      durationMs: Date.now() - start,
      truncated: false,
      error: (e as Error).message,
    };
  } finally {
    semaphores[lane]--;
  }
}
