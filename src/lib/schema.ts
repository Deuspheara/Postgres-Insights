import { withClient } from "./db";
import type { SchemaInfo, TableInfo, ColumnInfo, ForeignKeyInfo, IndexInfo, RelationshipInfo } from "@/types";

export async function introspectSchema(): Promise<SchemaInfo> {
  return withClient(async (client) => {
    // Get all user schemas
    const schemaRes = await client.query<{ schema_name: string }>(`
      SELECT schema_name FROM information_schema.schemata
      WHERE schema_name NOT IN ('pg_catalog','pg_toast','information_schema')
      AND schema_name NOT LIKE 'pg_%'
      ORDER BY schema_name
    `);
    const schemas = schemaRes.rows.map((r) => r.schema_name);

    // Get all tables with size and row estimates
    const tablesRes = await client.query<{
      table_schema: string;
      table_name: string;
      row_estimate: string;
      total_bytes: string;
      total_pretty: string;
    }>(`
      SELECT
        t.table_schema,
        t.table_name,
        COALESCE(c.reltuples::bigint, 0) AS row_estimate,
        COALESCE(pg_total_relation_size(c.oid), 0) AS total_bytes,
        COALESCE(pg_size_pretty(pg_total_relation_size(c.oid)), '0 bytes') AS total_pretty
      FROM information_schema.tables t
      LEFT JOIN pg_class c ON c.relname = t.table_name
        AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = t.table_schema)
      WHERE t.table_type = 'BASE TABLE'
        AND t.table_schema NOT IN ('pg_catalog','information_schema')
        AND t.table_schema NOT LIKE 'pg_%'
      ORDER BY t.table_schema, t.table_name
    `);

    // Get all columns
    const colsRes = await client.query<{
      table_schema: string;
      table_name: string;
      column_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string | null;
    }>(`
      SELECT table_schema, table_name, column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema NOT IN ('pg_catalog','information_schema')
      ORDER BY table_schema, table_name, ordinal_position
    `);

    // Get PKs
    const pkRes = await client.query<{ table_schema: string; table_name: string; column_name: string }>(`
      SELECT kcu.table_schema, kcu.table_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
    `);
    const pkSet = new Set(pkRes.rows.map((r) => `${r.table_schema}.${r.table_name}.${r.column_name}`));

    // Get FKs
    const fkRes = await client.query<{
      table_schema: string;
      table_name: string;
      constraint_name: string;
      column_name: string;
      foreign_table_schema: string;
      foreign_table_name: string;
      foreign_column_name: string;
    }>(`
      SELECT
        kcu.table_schema, kcu.table_name, kcu.constraint_name, kcu.column_name,
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
    `);

    const fkMap = new Map<string, ForeignKeyInfo[]>();
    const fkColSet = new Set<string>();
    for (const r of fkRes.rows) {
      const key = `${r.table_schema}.${r.table_name}`;
      if (!fkMap.has(key)) fkMap.set(key, []);
      fkMap.get(key)!.push({
        constraintName: r.constraint_name,
        fromColumn: r.column_name,
        toTable: `${r.foreign_table_schema}.${r.foreign_table_name}`,
        toColumn: r.foreign_column_name,
      });
      fkColSet.add(`${r.table_schema}.${r.table_name}.${r.column_name}`);
    }

    // Get unique constraints
    const uqRes = await client.query<{ table_schema: string; table_name: string; column_name: string }>(`
      SELECT kcu.table_schema, kcu.table_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'UNIQUE'
    `);
    const uqSet = new Set(uqRes.rows.map((r) => `${r.table_schema}.${r.table_name}.${r.column_name}`));

    // Get indexes
    const idxRes = await client.query<{
      schemaname: string;
      tablename: string;
      indexname: string;
      indexdef: string;
      indisunique: boolean;
      indisprimary: boolean;
    }>(`
      SELECT
        schemaname, tablename, indexname, indexdef,
        ix.indisunique, ix.indisprimary
      FROM pg_indexes pi
      JOIN pg_class c ON c.relname = pi.indexname
      JOIN pg_index ix ON ix.indexrelid = c.oid
      WHERE schemaname NOT IN ('pg_catalog','information_schema')
    `);

    const idxMap = new Map<string, IndexInfo[]>();
    for (const r of idxRes.rows) {
      const key = `${r.schemaname}.${r.tablename}`;
      if (!idxMap.has(key)) idxMap.set(key, []);
      const colMatch = r.indexdef.match(/\(([^)]+)\)/);
      const cols = colMatch ? colMatch[1].split(",").map((c) => c.trim()) : [];
      idxMap.get(key)!.push({
        name: r.indexname,
        columns: cols,
        isUnique: r.indisunique,
        isPrimary: r.indisprimary,
      });
    }

    // Build column map
    const colMap = new Map<string, ColumnInfo[]>();
    for (const r of colsRes.rows) {
      const key = `${r.table_schema}.${r.table_name}`;
      if (!colMap.has(key)) colMap.set(key, []);
      const colKey = `${key}.${r.column_name}`;
      const isPk = pkSet.has(colKey);
      const isFk = fkColSet.has(colKey);
      const fkInfo = fkMap.get(key)?.find((f) => f.fromColumn === r.column_name);

      let roleHint: ColumnInfo["roleHint"] = "other";
      if (isPk) roleHint = "primary_key";
      else if (isFk) roleHint = "foreign_key";
      else if (/created_at|updated_at|timestamp|date|time/i.test(r.column_name)) roleHint = "event_time";
      else if (/amount|price|cost|revenue|total|balance/i.test(r.column_name)) roleHint = "amount";
      else if (/status|state|type|kind/i.test(r.column_name)) roleHint = "status";
      else if (/category|tag|label|group/i.test(r.column_name)) roleHint = "category";
      else if (/text|description|note|comment|body|content/i.test(r.column_name)) roleHint = "text";

      colMap.get(key)!.push({
        name: r.column_name,
        type: r.data_type,
        nullable: r.is_nullable === "YES",
        hasDefault: r.column_default !== null,
        isPrimaryKey: isPk,
        isForeignKey: isFk,
        references: fkInfo ? { table: fkInfo.toTable, column: fkInfo.toColumn } : undefined,
        isUnique: uqSet.has(colKey) || isPk,
        roleHint,
      });
    }

    // Build relationships
    const relationships: RelationshipInfo[] = [];
    for (const [tableKey, fks] of fkMap) {
      for (const fk of fks) {
        const [schema, name] = tableKey.split(".");
        relationships.push({
          from: `${schema}.${name}`,
          fromColumn: fk.fromColumn,
          to: fk.toTable,
          toColumn: fk.toColumn,
        });
      }
    }

    // Build table list
    const tables: TableInfo[] = tablesRes.rows.map((r) => {
      const key = `${r.table_schema}.${r.table_name}`;
      return {
        schema: r.table_schema,
        name: r.table_name,
        fullName: key,
        rowCount: 0,
        estimatedRowCount: parseInt(r.row_estimate, 10) || 0,
        sizeBytes: parseInt(r.total_bytes, 10) || 0,
        sizePretty: r.total_pretty,
        columns: colMap.get(key) ?? [],
        indexes: idxMap.get(key) ?? [],
        foreignKeys: fkMap.get(key) ?? [],
      };
    });

    return {
      schemas,
      tables,
      relationships,
      capturedAt: new Date().toISOString(),
    };
  });
}
