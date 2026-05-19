import { withClient } from "./db";
import type { TableProfile, ColumnProfile, ColumnInfo } from "@/types";
import { PROFILE_MAX_COLUMNS, PROFILE_STATEMENT_TIMEOUT_MS } from "./constants";

const SKIP_TYPES = new Set(["bytea", "json", "jsonb", "xml", "tsvector", "tsquery"]);
const MAX_TOP_VALUES = 10;
const SAMPLE_THRESHOLD = 100_000; // rows above which we sample

export async function profileTable(
  schema: string,
  table: string,
  columns: ColumnInfo[],
  estimatedRowCount: number,
  connectionId: string
): Promise<TableProfile> {
  const tableName = `"${schema}"."${table}"`;
  const usesSample = estimatedRowCount > SAMPLE_THRESHOLD;
  const sampleClause = usesSample ? `TABLESAMPLE BERNOULLI(${Math.max(1, Math.round(10_000 / estimatedRowCount * 100))})` : "";

  const profileable = columns.filter(
    (c) =>
      !SKIP_TYPES.has(c.type) &&
      c.roleHint !== "text" &&
      !c.name.toLowerCase().includes("password") &&
      !c.name.toLowerCase().includes("secret") &&
      !c.name.toLowerCase().includes("token") &&
      !c.name.toLowerCase().includes("hash")
  ).slice(0, PROFILE_MAX_COLUMNS); // max columns per quick profile

  const columnProfiles: ColumnProfile[] = [];

  await withClient(async (client) => {
    await client.query(`SET statement_timeout = ${PROFILE_STATEMENT_TIMEOUT_MS}`);

    // Get actual row count (bounded)
    let rowCount = estimatedRowCount;
    try {
      const countRes = await client.query<{ cnt: string }>(
        `SELECT COUNT(*) AS cnt FROM ${tableName} ${sampleClause}`
      );
      rowCount = parseInt(countRes.rows[0].cnt, 10);
      if (usesSample) rowCount = Math.round(rowCount * (estimatedRowCount / rowCount));
    } catch {
      console.warn("Row count query failed, using estimate");
    }

    for (const col of profileable) {
      try {
        const colExpr = `"${col.name}"`;
        const isNumeric = ["integer", "bigint", "numeric", "real", "double precision", "smallint", "money"].includes(col.type);
        const isDate = ["date", "timestamp", "timestamp without time zone", "timestamp with time zone"].includes(col.type);
        const isCategorical = col.roleHint === "status" || col.roleHint === "category" || col.type === "boolean";

        // Null count
        const nullRes = await client.query<{ null_count: string; distinct_count: string }>(
          `SELECT
            COUNT(*) FILTER (WHERE ${colExpr} IS NULL) AS null_count,
            COUNT(DISTINCT ${colExpr}) AS distinct_count
           FROM ${tableName} ${sampleClause}`
        );
        const nullCount = parseInt(nullRes.rows[0].null_count, 10);
        const distinctCount = parseInt(nullRes.rows[0].distinct_count, 10);
        const nullPercent = rowCount > 0 ? (nullCount / rowCount) * 100 : 0;
        const isHighCardinality = distinctCount > 1000;

        let min: string | number | undefined;
        let max: string | number | undefined;
        let avg: number | undefined;

        if (isNumeric || isDate) {
          const rangeRes = await client.query<{ min_val: unknown; max_val: unknown; avg_val: unknown }>(
            `SELECT MIN(${colExpr}) AS min_val, MAX(${colExpr}) AS max_val${isNumeric ? `, AVG(${colExpr}) AS avg_val` : ", NULL AS avg_val"} FROM ${tableName} ${sampleClause}`
          );
          min = rangeRes.rows[0].min_val as string | number | undefined;
          max = rangeRes.rows[0].max_val as string | number | undefined;
          avg = rangeRes.rows[0].avg_val != null ? parseFloat(String(rangeRes.rows[0].avg_val)) : undefined;
        }

        let topValues: ColumnProfile["topValues"];
        if ((isCategorical || !isHighCardinality) && distinctCount <= 1000) {
          const tvRes = await client.query<{ val: unknown; cnt: string }>(
            `SELECT ${colExpr} AS val, COUNT(*) AS cnt FROM ${tableName} ${sampleClause} GROUP BY ${colExpr} ORDER BY cnt DESC LIMIT ${MAX_TOP_VALUES}`
          );
          topValues = tvRes.rows.map((r) => ({
            value: String(r.val ?? "NULL"),
            count: parseInt(r.cnt, 10),
            percent: rowCount > 0 ? (parseInt(r.cnt, 10) / rowCount) * 100 : 0,
          }));
        }

        columnProfiles.push({
          name: col.name,
          type: col.type,
          nullCount,
          nullPercent,
          distinctCount,
          min: min !== undefined && min !== null ? String(min) : undefined,
          max: max !== undefined && max !== null ? String(max) : undefined,
          avg,
          topValues,
          isHighCardinality,
          roleHint: col.roleHint,
        });
      } catch {
        console.warn("Column profiling failed for", col.name);
      }
    }
  });

  return {
    connectionId,
    tableName: `${schema}.${table}`,
    rowCount: estimatedRowCount,
    columnProfiles,
    profiledAt: new Date().toISOString(),
    isPartial: profileable.length < columns.length,
  };
}
