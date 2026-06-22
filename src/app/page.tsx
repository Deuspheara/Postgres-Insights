"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Database,
  AlertTriangle,
  RefreshCw,
  Plus,
  Clock,
  Shield,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { SchemaInfo, TableInfo, SavedQuery, AppSettings } from "@/types";
import { SENTINEL_API_KEY } from "@/types";
import { cn, timeAgo, formatRows, ageInHours } from "@/lib/utils";
import { useActiveConnectionId } from "@/components/active-connection-provider";

function TableCard({ table }: { table: TableInfo }) {
  return (
    <Link href={`/explore/${encodeURIComponent(table.fullName)}`}>
      <div className="rounded-xl border border-border/70 bg-card p-4 transition-shadow hover:shadow-[0_8px_28px_-18px_rgba(28,28,26,0.18)]">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Database className="h-4 w-4" />
          </div>
          <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {table.schema}
          </Badge>
        </div>
        <p className="text-sm font-semibold tracking-tight text-foreground">
          {table.name}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatRows(table.estimatedRowCount)} rows · {table.columns.length} columns
        </p>
      </div>
    </Link>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card px-4 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

interface HealthSignal {
  id: string;
  severity: "warning" | "info";
  title: string;
  desc: string;
  action: string;
  href: string;
}

function HealthSignalRow({ signal }: { signal: HealthSignal }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-card px-4 py-3">
      <div
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          signal.severity === "warning"
            ? "bg-amber-100 text-amber-600"
            : "bg-sky-100 text-sky-600",
        )}
      >
        <AlertTriangle className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{signal.title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {signal.desc}
        </p>
      </div>
      <Button asChild variant="ghost" size="sm" className="shrink-0">
        <Link href={signal.href}>{signal.action}</Link>
      </Button>
    </div>
  );
}

export default function HomePage() {
  const connectionId = useActiveConnectionId();

  const { data: schema, isLoading: schemaLoading } = useQuery<SchemaInfo>({
    queryKey: ["schema", connectionId],
    queryFn: () => fetch("/api/schema").then((r) => r.json()),
    enabled: !!connectionId,
  });

  const { data: settings } = useQuery<AppSettings>({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then((r) => r.json()),
  });

  const { data: savedQueries } = useQuery<SavedQuery[]>({
    queryKey: ["saved-queries", connectionId],
    queryFn: () => fetch("/api/saved-queries").then((r) => r.json()),
    enabled: !!connectionId,
  });

  const isConnected = !!connectionId;
  const activeConnection = settings?.connections?.find((c) => c.id === connectionId);
  const hasAiKey = activeConnection?.openRouterApiKey === SENTINEL_API_KEY;
  const safeMode = settings?.safetyConfig?.safeMode ?? true;

  if (!settings) return null;

  if (!isConnected || !settings.connections.length) {
    return (
      <div className="flex h-full items-center justify-center px-8 py-20">
        <div className="max-w-md space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Database className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Connect your database</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Add a PostgreSQL connection to explore schemas, run queries, and generate AI-powered insights.
          </p>
          <Button asChild size="lg" className="w-full">
            <Link href="/settings">Configure Connection</Link>
          </Button>
        </div>
      </div>
    );
  }

  const topTables = schema
    ? [...schema.tables].sort((a, b) => b.estimatedRowCount - a.estimatedRowCount).slice(0, 3)
    : [];

  const totalRows =
    schema?.tables.reduce((sum, table) => sum + table.estimatedRowCount, 0) ?? 0;

  const recentQueries = savedQueries?.slice(0, 4) ?? [];

  const healthSignals: HealthSignal[] = [];
  if (!hasAiKey) {
    healthSignals.push({
      id: "no-ai",
      severity: "warning",
      title: "AI copilot not configured",
      desc: "Add an OpenRouter API key in Settings to enable SQL generation and schema insights.",
      action: "Configure",
      href: "/settings",
    });
  }
  if (schema && schema.tables.length > 0 && !schema.capturedAt) {
    healthSignals.push({
      id: "no-schema",
      severity: "info",
      title: "Schema metadata not loaded",
      desc: "Open Explore to refresh the schema snapshot and unlock table-level navigation.",
      action: "Explore",
      href: "/explore",
    });
  }
  if (schema?.capturedAt && ageInHours(schema.capturedAt) > 24) {
    healthSignals.push({
      id: "stale-schema",
      severity: "info",
      title: "Schema cache is stale",
      desc: `Last refresh was ${timeAgo(schema.capturedAt)}. Refresh the schema to keep insights current.`,
      action: "Refresh",
      href: "/explore",
    });
  }

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-7xl px-8 py-7">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {activeConnection?.name ?? "Workspace"}
              </Badge>
              <Badge variant="outline" className="rounded-full text-[11px] text-muted-foreground">
                <Shield className="mr-1 h-3 w-3" />
                Safe mode {safeMode ? "on" : "off"}
              </Badge>
              {schema?.capturedAt && (
                <Badge variant="outline" className="rounded-full text-[11px] text-muted-foreground">
                  <Clock className="mr-1 h-3 w-3" />
                  Refreshed {timeAgo(schema.capturedAt)}
                </Badge>
              )}
            </div>
            <div>
              <h1 className="text-[32px] font-bold tracking-tight">Workspace Overview</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                A compact overview of your schema, activity, and the most important things to check next.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/query">Open Query Editor</Link>
            </Button>
            <Button asChild>
              <Link href="/settings">
                <Plus className="mr-1.5 h-4 w-4" />
                Add Connection
              </Link>
            </Button>
          </div>
        </div>

        {schema && (
          <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Tables"
              value={schema.tables.length.toString()}
              sub={`${schema.schemas.length} schemas`}
            />
            <StatCard
              label="Relationships"
              value={schema.relationships.length.toString()}
              sub="Foreign keys detected"
            />
            <StatCard
              label="Estimated rows"
              value={formatRows(totalRows)}
              sub="Across visible tables"
            />
            <StatCard
              label="AI readiness"
              value={hasAiKey ? "Ready" : "Setup"}
              sub={hasAiKey ? "Copilot configured" : "API key missing"}
            />
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Top tables</h2>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/explore">View all</Link>
                </Button>
              </div>
              {schemaLoading ? (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Loading schema...
                </div>
              ) : topTables.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-3">
                  {topTables.map((table) => (
                    <TableCard key={table.fullName} table={table} />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-border/70 bg-card p-6 text-sm text-muted-foreground">
                  No tables found. Refresh the schema in Explore.
                </div>
              )}
            </section>

            {healthSignals.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-semibold">Health signals</h2>
                <div className="space-y-2">
                  {healthSignals.map((signal) => (
                    <HealthSignalRow key={signal.id} signal={signal} />
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Recent queries</h2>
                  <Badge variant="outline" className="rounded-full text-[11px]">
                    {recentQueries.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {recentQueries.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border/70 p-4 text-xs text-muted-foreground">
                      No recent queries yet.
                    </div>
                  ) : (
                    recentQueries.map((query) => (
                      <Link key={query.id} href="/query">
                        <div className="rounded-lg border border-border/70 p-3 transition-colors hover:bg-muted/40">
                          <p className="truncate text-xs font-medium text-foreground">
                            {query.name}
                          </p>
                          <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                            {query.sql.slice(0, 56)}…
                          </p>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold">Recommended next steps</h2>
                </div>
                <div className="space-y-2 text-sm">
                  <Link href="/explore" className="block rounded-lg border border-border/70 p-3 hover:bg-muted/40">
                    Review large tables and missing keys
                  </Link>
                  <Link href="/insights" className="block rounded-lg border border-border/70 p-3 hover:bg-muted/40">
                    Open AI insight stream
                  </Link>
                  <Link href="/query" className="block rounded-lg border border-border/70 p-3 hover:bg-muted/40">
                    Start a query or generate one with AI
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
