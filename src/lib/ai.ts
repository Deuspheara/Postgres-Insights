import type { SchemaInfo, TableProfile, AISuggestions, SuggestedDashboard, DataQualityFinding, RecommendedQuery, ChartSpec, AIDashboardResponse, AITileResponse } from "@/types";
import { callOpenRouter, getAIConfig } from "./ai-client";
import { getActiveConnection } from "./settings";

interface CompactTable {
  name: string;
  row_count: number;
  columns: Array<{
    name: string;
    type: string;
    role_hint?: string;
    null_percent?: number;
    top_values?: string[];
  }>;
}

interface CompactRelationship {
  from: string;
  to: string;
}

interface AIPromptPayload {
  tables: CompactTable[];
  relationships: CompactRelationship[];
}

function buildPromptPayload(
  schema: SchemaInfo,
  profiles: TableProfile[],
  allowSampleRows: boolean
): AIPromptPayload {
  const profileMap = new Map(profiles.map((p) => [p.tableName, p]));

  const tables: CompactTable[] = schema.tables.slice(0, 30).map((t) => {
    const profile = profileMap.get(t.fullName);
    return {
      name: t.fullName,
      row_count: t.estimatedRowCount,
      columns: t.columns.slice(0, 25).map((c) => {
        const cp = profile?.columnProfiles.find((p) => p.name === c.name);
        const col: CompactTable["columns"][number] = {
          name: c.name,
          type: c.type,
          role_hint: c.roleHint,
        };
        if (cp) {
          if (cp.nullPercent > 5) col.null_percent = Math.round(cp.nullPercent);
          if (allowSampleRows && cp.topValues && cp.topValues.length > 0) {
            col.top_values = cp.topValues.slice(0, 5).map((v) => v.value);
          }
        }
        return col;
      }),
    };
  });

  const relationships: CompactRelationship[] = schema.relationships.slice(0, 50).map((r) => ({
    from: `${r.from}.${r.fromColumn}`,
    to: `${r.to}.${r.toColumn}`,
  }));

  return { tables, relationships };
}

const SYSTEM_PROMPT = `You are a database analytics expert. Given a compact schema summary, analyze the database and return structured insights as JSON.

Return ONLY valid JSON matching this exact schema:
{
  "database_type_hypotheses": [{"label": string, "confidence": number}],
  "candidate_business_entities": string[],
  "recommended_dashboards": [{
    "id": string,
    "title": string,
    "why": string,
    "tables": string[],
    "chart_specs": [{"metric": string, "dimension": string, "chart_type": string, "title": string, "sql": string}],
    "confidence": number
  }],
  "recommended_queries": [{
    "id": string,
    "title": string,
    "why": string,
    "sql": string,
    "tables": string[],
    "chart_type": string,
    "confidence": number
  }],
  "recommended_alerts": [{
    "id": string,
    "title": string,
    "description": string,
    "table": string,
    "sql": string,
    "confidence": number,
    "estimated_gain": string,
    "ai_insight": string
  }],
  "data_quality_findings": [{
    "id": string,
    "table": string,
    "column": string,
    "severity": "info"|"warning"|"critical",
    "category": "data_quality"|"performance"|"schema_hygiene",
    "title": string,
    "description": string,
    "what_we_found": string,
    "why_it_matters": string,
    "suggested_action": string,
    "sql": string,
    "estimated_gain": string,
    "sample_size": string
  }],
  "confidence": number
}

Rules:
- All SQL must be read-only SELECT statements with LIMIT clauses
- Use actual table and column names from the schema
- Be specific and actionable
- Return at most 5 recommended dashboards, 8 queries, 3 alerts, 5 quality findings
- For data_quality_findings: what_we_found should be 1-2 concise sentences of what was discovered; why_it_matters explains the business impact; sql should be the diagnostic query that reveals the issue; estimated_gain is storage or performance savings (e.g. "-4.2GB", "-30% query time"); sample_size is how many rows were sampled (e.g. "10,000 row sample")
- For recommended_alerts: estimated_gain is the expected improvement (e.g. "-760ms", "-90% latency"); ai_insight is a one-sentence recommendation with confidence level
- chart_specs sql: SELECT date/category column FIRST, then metric columns second — never put COUNT/SUM as the first column
`;

export async function generateSuggestions(
  schema: SchemaInfo,
  profiles: TableProfile[],
  connectionId: string
): Promise<AISuggestions> {
  const { model } = getAIConfig();
  const allowSampleRows = getActiveConnection()?.allowSampleRows ?? false;

  const payload = buildPromptPayload(schema, profiles, allowSampleRows);

  const content = await callOpenRouter([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `Analyze this database schema and provide insights:\n\n${JSON.stringify(payload, null, 2)}` },
  ]);

  const raw = JSON.parse(content) as {
    database_type_hypotheses: Array<{ label: string; confidence: number }>;
    candidate_business_entities: string[];
    recommended_dashboards: Array<{
      id: string; title: string; why: string; tables: string[];
      chart_specs: Array<{ metric: string; dimension: string; chart_type: string; title: string; sql: string }>;
      confidence: number;
    }>;
    recommended_queries: Array<{
      id: string; title: string; why: string; sql: string;
      tables: string[]; chart_type: string; confidence: number;
    }>;
    recommended_alerts: Array<{
      id: string; title: string; description: string; table: string; sql: string; confidence: number;
      estimated_gain?: string; ai_insight?: string;
    }>;
    data_quality_findings: Array<{
      id: string; table: string; column?: string; severity: "info" | "warning" | "critical";
      category?: "data_quality" | "performance" | "schema_hygiene";
      title: string; description: string; suggested_action?: string;
      what_we_found?: string; why_it_matters?: string; sql?: string;
      estimated_gain?: string; sample_size?: string;
    }>;
    confidence: number;
  };

  const recommendedDashboards: SuggestedDashboard[] = (raw.recommended_dashboards ?? []).map((d) => ({
    id: d.id || crypto.randomUUID(),
    title: d.title,
    why: d.why,
    tables: d.tables,
    chartSpecs: (d.chart_specs ?? []).map((cs): ChartSpec => ({
      metric: cs.metric,
      dimension: cs.dimension,
      chartType: (cs.chart_type as ChartSpec["chartType"]) || "line",
      title: cs.title,
      sql: cs.sql,
    })),
    confidence: d.confidence,
    state: "suggested",
  }));

  const dataQualityFindings: DataQualityFinding[] = (raw.data_quality_findings ?? []).map((f) => ({
    id: f.id || crypto.randomUUID(),
    table: f.table,
    column: f.column,
    severity: f.severity,
    category: f.category,
    title: f.title,
    description: f.description,
    whatWeFound: f.what_we_found,
    whyItMatters: f.why_it_matters,
    suggestedAction: f.suggested_action,
    sql: f.sql,
    estimatedGain: f.estimated_gain,
    sampleSize: f.sample_size,
  }));

  const recommendedQueries: RecommendedQuery[] = (raw.recommended_queries ?? []).map((q) => ({
    id: q.id || crypto.randomUUID(),
    title: q.title,
    why: q.why,
    sql: q.sql,
    tables: q.tables,
    chartType: (q.chart_type as ChartSpec["chartType"]) || undefined,
    confidence: q.confidence,
  }));

  return {
    connectionId,
    databaseTypeHypotheses: raw.database_type_hypotheses ?? [],
    candidateBusinessEntities: raw.candidate_business_entities ?? [],
    recommendedDashboards,
    recommendedQueries,
    recommendedAlerts: (raw.recommended_alerts ?? []).map((a) => ({
      id: a.id || crypto.randomUUID(),
      title: a.title,
      description: a.description,
      table: a.table,
      sql: a.sql,
      confidence: a.confidence,
      estimatedGain: a.estimated_gain,
      aiInsight: a.ai_insight,
    })),
    dataQualityFindings,
    confidence: raw.confidence ?? 0.5,
    generatedAt: new Date().toISOString(),
    modelUsed: model,
  };
}

export async function generateSQL(
  prompt: string,
  schema: SchemaInfo
): Promise<{ sql: string; explanation: string }> {
  const tablesSummary = schema.tables
    .slice(0, 20)
    .map((t) => `${t.fullName}(${t.columns.map((c) => `${c.name}:${c.type}`).join(", ")})`)
    .join("\n");

  const content = await callOpenRouter(
    [
      {
        role: "system",
        content: `You are a PostgreSQL expert. Generate safe, read-only SELECT SQL queries.
Always include LIMIT. Never use mutations. Return JSON: {"sql": string, "explanation": string}`,
      },
      {
        role: "user",
        content: `Schema:\n${tablesSummary}\n\nRequest: ${prompt}`,
      },
    ],
    { temperature: 0.2 }
  );

  return JSON.parse(content) as { sql: string; explanation: string };
}

const DASHBOARD_SYSTEM_PROMPT = `You are a PostgreSQL dashboard expert specializing in data visualization and business intelligence. Given a user request and database schema, generate a complete, production-ready dashboard with chart tiles.

Return ONLY valid JSON matching this exact schema:
{
  "title": string,
  "description": string,
  "tiles": [{
    "title": string,
    "chartType": "kpi"|"line"|"bar"|"area"|"donut"|"table"|"stacked-bar"|"pie",
    "sql": string,
    "w": number,
    "h": number
  }],
  "confidence": number
}

CRITICAL SQL RULES:
- ALL SQL must be read-only SELECT statements only - NO INSERT/UPDATE/DELETE/CREATE/DROP
- Always include LIMIT clauses (LIMIT 1 for KPIs, LIMIT 10-15 for charts, LIMIT 50 for tables)
- First column MUST ALWAYS be a dimension (date, category, name, status) - NEVER an aggregate
- Subsequent columns should be numeric metrics (COUNT, SUM, AVG, etc.)
- Use date_trunc('day'/'week'/'month', timestamp_column) for time-based grouping
- Always use ORDER BY for meaningful sorting
- Use COALESCE for null handling when appropriate
- Alias columns with AS for readable labels

CHART TYPE SELECTION GUIDE:
- kpi: Single aggregate metric returning exactly 1 row (COUNT, SUM, AVG, etc.)
- line: Time-series trends (use date_trunc + GROUP BY + ORDER BY date)
- bar: Category comparisons (GROUP BY category ORDER BY count DESC LIMIT 10-15)
- area: Cumulative volume over time (similar to line but emphasizes volume)
- donut/pie: Part-to-whole distributions (GROUP BY status/type with 3-8 categories)
- stacked-bar: Multi-series comparisons (GROUP BY date, category for stacked view)
- table: Raw data grids (SELECT specific columns with LIMIT 50)

TILE DIMENSIONS:
- KPI tiles: w=3, h=3 (compact single metric)
- Chart tiles: w=6, h=5 (standard charts)
- Wide charts: w=8, h=5 (for complex multi-series)
- Table tiles: w=12, h=8 (full-width data grid)

DASHBOARD COMPOSITION RULES:
- Start with 2 KPI tiles showing key metrics
- Follow with 3-5 chart tiles showing trends, comparisons, distributions
- Optionally end with 1 table tile for detailed data
- Maximum 8 tiles total
- Each tile title should be descriptive and business-focused
- Ensure SQL uses ACTUAL table and column names from the provided schema
- If the schema has timestamp columns (created_at, updated_at, date, etc.), use them for time-series
- If the schema has category/status/type columns, use them for breakdowns
- Prefer recent data filters (WHERE created_at >= NOW() - INTERVAL '30 days') when appropriate

COMMON PATTERNS:
- Time trend: SELECT date_trunc('day', created_at) AS day, COUNT(*) AS count FROM table WHERE created_at >= NOW() - INTERVAL '90 days' GROUP BY 1 ORDER BY 1
- Top categories: SELECT category, COUNT(*) AS count FROM table GROUP BY 1 ORDER BY 2 DESC LIMIT 10
- Status breakdown: SELECT status, COUNT(*) AS count FROM table GROUP BY 1 ORDER BY 2 DESC
- Single metric: SELECT COUNT(*) AS total FROM table (returns 1 row for KPI)
- Multi-series: SELECT date_trunc('week', created_at) AS week, category, COUNT(*) AS count FROM table GROUP BY 1, 2 ORDER BY 1`;

export async function generateDashboardFromPrompt(
  prompt: string,
  schema: SchemaInfo,
  profiles: TableProfile[]
): Promise<AIDashboardResponse> {

  const profileMap = new Map(profiles.map((p) => [p.tableName, p]));

  const tables = schema.tables.slice(0, 30).map((t) => {
    const profile = profileMap.get(t.fullName);
    return {
      name: t.fullName,
      row_count: t.estimatedRowCount,
      columns: t.columns.slice(0, 25).map((c) => {
        const cp = profile?.columnProfiles.find((p) => p.name === c.name);
        const col: { name: string; type: string; role_hint?: string; null_percent?: number } = {
          name: c.name,
          type: c.type,
          role_hint: c.roleHint,
        };
        if (cp && cp.nullPercent > 5) {
          col.null_percent = Math.round(cp.nullPercent);
        }
        return col;
      }),
    };
  });

  const relationships = schema.relationships.slice(0, 50).map((r) => ({
    from: `${r.from}.${r.fromColumn}`,
    to: `${r.to}.${r.toColumn}`,
  }));

  const content = await callOpenRouter([
    { role: "system", content: DASHBOARD_SYSTEM_PROMPT },
    { role: "user", content: `Create a dashboard for: "${prompt}"\n\nSchema:\nTables: ${JSON.stringify(tables, null, 2)}\nRelationships: ${JSON.stringify(relationships, null, 2)}` },
  ]);

  const raw = JSON.parse(content) as {
    title: string;
    description: string;
    tiles: Array<{
      title: string;
      chartType: string;
      sql: string;
      w: number;
      h: number;
    }>;
    confidence: number;
  };

  return {
    title: raw.title || "AI Generated Dashboard",
    description: raw.description || "",
    tiles: (raw.tiles ?? []).map((t) => ({
      title: t.title,
      chartType: (t.chartType as AIDashboardResponse["tiles"][number]["chartType"]) || "bar",
      sql: t.sql,
      w: t.w || 6,
      h: t.h || 5,
    })),
    confidence: raw.confidence ?? 0.7,
  };
}

const TILE_SYSTEM_PROMPT = `You are a PostgreSQL expert specializing in data visualization. Given a user request and database schema, generate a single, well-designed chart tile with optimized SQL.

Return ONLY valid JSON matching this exact schema:
{
  "title": string,
  "sql": string,
  "chartType": "kpi"|"line"|"bar"|"area"|"donut"|"table"|"stacked-bar"|"pie",
  "explanation": string
}

CRITICAL SQL RULES:
- ONLY read-only SELECT statements - NO mutations (INSERT/UPDATE/DELETE/CREATE/DROP)
- Always include LIMIT (1 for KPIs, 10-15 for charts, 50 for tables)
- FIRST column MUST be a dimension (date, category, name, status) - NEVER an aggregate like COUNT/SUM
- Subsequent columns should be numeric metrics (COUNT, SUM, AVG, etc.)
- Use date_trunc('day'/'week'/'month', timestamp_column) for time-based data
- Always ORDER BY for meaningful sorting
- Use actual table and column names from the provided schema

CHART TYPE GUIDE:
- kpi: Single metric returning 1 row (SELECT COUNT(*) AS total FROM table)
- line: Time trends (SELECT date_trunc('day', created_at) AS day, COUNT(*) FROM table GROUP BY 1 ORDER BY 1)
- bar: Category comparison (SELECT category, COUNT(*) AS count FROM table GROUP BY 1 ORDER BY 2 DESC LIMIT 10)
- area: Volume over time (similar to line)
- donut/pie: Distribution (SELECT status, COUNT(*) AS count FROM table GROUP BY 1 ORDER BY 2 DESC)
- stacked-bar: Multi-series (SELECT date, category, COUNT(*) FROM table GROUP BY 1, 2 ORDER BY 1)
- table: Raw data (SELECT col1, col2 FROM table ORDER BY created_at DESC LIMIT 50)

Provide a clear, business-focused title and a brief explanation of what the chart shows.`;

const DESTRUCTIVE_SYSTEM_PROMPT = `You are a PostgreSQL expert specializing in safe data cleanup and user account deletion. Given a user request to delete data, generate a comprehensive, safe destructive query plan.

Return ONLY valid JSON matching this exact schema:
{
  "title": string,
  "description": string,
  "steps": [{
    "order": number,
    "type": "verification"|"deletion"|"verification_final",
    "description": string,
    "sql": string
  }],
  "transactionWrapped": true,
  "rollbackSql": string
}

CRITICAL SAFETY RULES:
1. ALWAYS start with verification SELECT queries to identify what will be deleted
2. NEVER propose direct DELETE without prior SELECT verification
3. ALWAYS respect foreign key order - delete child records before parent records
4. ALWAYS wrap in BEGIN/COMMIT transaction
5. ALWAYS include final verification SELECT to confirm deletion
6. Include ROLLBACK SQL for safety
7. Use specific WHERE clauses - NEVER delete without precise conditions
8. Identify all tables with user_id, owner_id, or related foreign keys
9. Check for OAuth links, credentials, sessions, and other related data
10. Provide clear descriptions for each step

STEP TYPES:
- "verification": SELECT queries to show what will be affected (run BEFORE deletion)
- "deletion": DELETE statements in proper foreign key order
- "verification_final": SELECT queries to confirm deletion succeeded

SQL EXAMPLES:
Verification: SELECT id, email, created_at FROM users WHERE email = 'target@example.com';
Dependency check: SELECT COUNT(*) FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email = 'target@example.com');
Deletion: DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email = 'target@example.com');
Final verification: SELECT COUNT(*) FROM users WHERE email = 'target@example.com';

Return a complete, production-ready deletion plan.`;

export async function generateDestructivePlan(
  prompt: string,
  schema: SchemaInfo
): Promise<{ plan: import("@/types").DestructiveQueryPlan; explanation: string }> {

  const tablesSummary = schema.tables
    .slice(0, 30)
    .map((t) => `${t.fullName}(${t.columns.map((c) => `${c.name}:${c.type}`).join(", ")})`)
    .join("\n");

  const foreignKeys = schema.relationships
    .slice(0, 50)
    .map((r) => `${r.from}.${r.fromColumn} -> ${r.to}.${r.toColumn}`)
    .join("\n");

  const content = await callOpenRouter(
    [
      {
        role: "system",
        content: DESTRUCTIVE_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: `Schema:\nTables: ${tablesSummary}\n\nForeign Keys:\n${foreignKeys}\n\nRequest: ${prompt}`,
      },
    ],
    { temperature: 0.2 }
  );

  const parsed = JSON.parse(content) as {
    title: string;
    description: string;
    steps: Array<{
      order: number;
      type: "verification" | "deletion" | "verification_final";
      description: string;
      sql: string;
    }>;
    transactionWrapped: boolean;
    rollbackSql: string;
  };

  const steps: import("@/types").DestructiveStep[] = parsed.steps.map((s) => ({
    ...s,
    executed: false,
  }));

  return {
    plan: {
      id: crypto.randomUUID(),
      title: parsed.title,
      description: parsed.description,
      steps,
      totalTablesAffected: 0,
      totalRowsAffected: 0,
      transactionWrapped: parsed.transactionWrapped ?? true,
      rollbackSql: parsed.rollbackSql ?? "ROLLBACK;",
    },
    explanation: parsed.description,
  };
}

export async function generateTileFromPrompt(
  prompt: string,
  schema: SchemaInfo,
  suggestedChartType?: string
): Promise<AITileResponse> {

  const tablesSummary = schema.tables
    .slice(0, 20)
    .map((t) => `${t.fullName}(${t.columns.map((c) => `${c.name}:${c.type}`).join(", ")})`)
    .join("\n");

  const chartTypeHint = suggestedChartType ? ` Suggested chart type: ${suggestedChartType}` : "";

  const content = await callOpenRouter(
    [
      { role: "system", content: TILE_SYSTEM_PROMPT },
      { role: "user", content: `Schema:\n${tablesSummary}\n\nRequest: ${prompt}${chartTypeHint}` },
    ],
    { temperature: 0.2 }
  );

  const parsed = JSON.parse(content) as {
    title: string;
    sql: string;
    chartType: string;
    explanation: string;
  };

  return {
    title: parsed.title,
    sql: parsed.sql,
    chartType: (parsed.chartType as AITileResponse["chartType"]) || "bar",
    explanation: parsed.explanation,
  };
}
