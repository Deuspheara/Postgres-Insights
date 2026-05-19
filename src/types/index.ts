// ─── Connection ───────────────────────────────────────────────────────────────

export interface ConnectionConfig {
  connectionString: string;
  openRouterApiKey?: string;
  aiModel?: string;
  allowSampleRows?: boolean;
  privacyMode?: boolean;
  safeMode?: boolean;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  hasDefault: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  references?: { table: string; column: string };
  isUnique: boolean;
  roleHint?: "primary_key" | "foreign_key" | "event_time" | "amount" | "status" | "category" | "text" | "other";
}

export interface IndexInfo {
  name: string;
  columns: string[];
  isUnique: boolean;
  isPrimary: boolean;
}

export interface TableInfo {
  schema: string;
  name: string;
  fullName: string;
  rowCount: number;
  estimatedRowCount: number;
  sizeBytes: number;
  sizePretty: string;
  columns: ColumnInfo[];
  indexes: IndexInfo[];
  foreignKeys: ForeignKeyInfo[];
  lastAnalyzed?: string;
}

export interface ForeignKeyInfo {
  constraintName: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
}

export interface SchemaInfo {
  schemas: string[];
  tables: TableInfo[];
  relationships: RelationshipInfo[];
  capturedAt: string;
}

export interface RelationshipInfo {
  from: string;
  fromColumn: string;
  to: string;
  toColumn: string;
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export interface ColumnProfile {
  name: string;
  type: string;
  nullCount: number;
  nullPercent: number;
  distinctCount?: number;
  min?: string | number;
  max?: string | number;
  avg?: number;
  topValues?: Array<{ value: string; count: number; percent: number }>;
  exampleValues?: string[];
  isHighCardinality?: boolean;
  roleHint?: ColumnInfo["roleHint"];
}

export interface TableProfile {
  tableName: string;
  rowCount: number;
  columnProfiles: ColumnProfile[];
  profiledAt: string;
  isPartial: boolean;
}

// ─── Query ────────────────────────────────────────────────────────────────────

export type QueryClass = "metadata" | "preview" | "analytics" | "expensive";

export interface QueryRequest {
  sql: string;
  class?: QueryClass;
  params?: unknown[];
  maxRows?: number;
  timeoutMs?: number;
}

export interface QueryResult {
  rows: Record<string, unknown>[];
  fields: Array<{ name: string; dataTypeID: number }>;
  rowCount: number;
  durationMs: number;
  truncated: boolean;
  error?: string;
}

export interface SavedQuery {
  id: string;
  name: string;
  sql: string;
  description?: string;
  createdAt: string;
  lastRunAt?: string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export type ChartType = "line" | "bar" | "area" | "stacked-bar" | "stacked-area" | "kpi" | "table" | "histogram" | "scatter" | "pie" | "donut";

export interface ChartSpec {
  metric: string;
  dimension?: string;
  chartType: ChartType;
  title?: string;
  color?: string;
  sql?: string;
  filters?: Record<string, unknown>;
}

export interface DashboardTile {
  id: string;
  title: string;
  subtitle?: string;
  chartType: ChartType;
  sql: string;
  x: number;
  y: number;
  w: number;
  h: number;
  config?: Record<string, unknown>;
  lastResult?: QueryResult;
  lastRefreshedAt?: string;
  status?: "idle" | "loading" | "success" | "error";
  error?: string;
}

export interface Dashboard {
  id: string;
  title: string;
  description?: string;
  tiles: DashboardTile[];
  state: "draft" | "published";
  createdAt: string;
  updatedAt: string;
  fromSuggestionId?: string;
}

// ─── AI / Insights ────────────────────────────────────────────────────────────

export interface DatabaseTypeHypothesis {
  label: string;
  confidence: number;
}

export interface SuggestedDashboard {
  id: string;
  title: string;
  why: string;
  tables: string[];
  chartSpecs: ChartSpec[];
  confidence: number;
  state?: "suggested" | "draft" | "built" | "dismissed";
}

export interface DataQualityFinding {
  id: string;
  table: string;
  column?: string;
  severity: "info" | "warning" | "critical";
  category?: "data_quality" | "performance" | "schema_hygiene";
  title: string;
  description: string;
  whatWeFound?: string;
  whyItMatters?: string;
  suggestedAction?: string;
  sql?: string;
  estimatedGain?: string;
  sampleSize?: string;
}

export interface RecommendedQuery {
  id: string;
  title: string;
  why: string;
  sql: string;
  tables: string[];
  chartType?: ChartType;
  confidence: number;
}

export interface RecommendedAlert {
  id: string;
  title: string;
  description: string;
  table: string;
  sql: string;
  confidence: number;
  estimatedGain?: string;
  aiInsight?: string;
}

export interface AIDashboardRequest {
  prompt: string;
  template?: string;
}

export interface AIDashboardResponse {
  title: string;
  description: string;
  tiles: Array<{
    title: string;
    chartType: ChartType;
    sql: string;
    w: number;
    h: number;
    explanation?: string;
  }>;
  confidence: number;
}

export interface AITileRequest {
  prompt: string;
  suggestedChartType?: ChartType;
}

export interface AITileResponse {
  title: string;
  sql: string;
  chartType: ChartType;
  explanation: string;
}

// ─── Destructive Operations ───────────────────────────────────────────────────

export interface TableImpact {
  tableName: string;
  rowCountBefore: number;
  rowCountAffected: number;
  sampleRows?: Record<string, unknown>[];
  foreignKeys?: ForeignKeyInfo[];
}

export interface DestructiveStep {
  order: number;
  type: "verification" | "deletion" | "verification_final";
  description: string;
  sql: string;
  tableImpact?: TableImpact;
  executed?: boolean;
  error?: string;
}

export interface DestructiveQueryPlan {
  id: string;
  title: string;
  description: string;
  steps: DestructiveStep[];
  totalTablesAffected: number;
  totalRowsAffected: number;
  estimatedDurationMs?: number;
  transactionWrapped: boolean;
  rollbackSql?: string;
}

export interface DestructiveExecutionResult {
  planId: string;
  success: boolean;
  steps: Array<{
    order: number;
    type: string;
    sql: string;
    success: boolean;
    rowsAffected?: number;
    durationMs: number;
    error?: string;
  }>;
  totalDurationMs: number;
  committed: boolean;
  rolledBack: boolean;
}

export interface AISuggestions {
  databaseTypeHypotheses: DatabaseTypeHypothesis[];
  candidateBusinessEntities: string[];
  recommendedDashboards: SuggestedDashboard[];
  recommendedQueries: RecommendedQuery[];
  recommendedAlerts: RecommendedAlert[];
  dataQualityFindings: DataQualityFinding[];
  confidence: number;
  generatedAt: string;
  modelUsed: string;
}

// ─── App Settings ─────────────────────────────────────────────────────────────

export interface AppSettings {
  connection: ConnectionConfig | null;
  safetyConfig: SafetyConfig;
  lastConnectedAt?: string;
}

export interface SafetyConfig {
  maxPreviewRows: number;
  maxChartRows: number;
  previewTimeoutMs: number;
  analyticsTimeoutMs: number;
  expensiveTimeoutMs: number;
  maxConcurrentTiles: number;
  maxConcurrentExpensive: number;
  safeMode: boolean;
  writesEnabled: boolean;
}

export const DEFAULT_SAFETY_CONFIG: SafetyConfig = {
  maxPreviewRows: 100,
  maxChartRows: 10000,
  previewTimeoutMs: 30000,
  analyticsTimeoutMs: 30000,
  expensiveTimeoutMs: 120000,
  maxConcurrentTiles: 4,
  maxConcurrentExpensive: 1,
  safeMode: true,
  writesEnabled: false,
};

export const SENTINEL_API_KEY = "***configured***";
