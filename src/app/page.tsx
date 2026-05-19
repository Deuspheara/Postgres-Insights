"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Database,
  AlertTriangle,
  RefreshCw,
  Plus,
  Sparkles,
  ArrowRight,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { SchemaInfo, TableInfo, SavedQuery, AppSettings } from "@/types";
import { SENTINEL_API_KEY } from "@/types";
import { cn, timeAgo, formatRows, ageInHours } from "@/lib/utils";
import { useActiveConnectionId } from "@/components/active-connection-provider";

function TableCard({ table }: { table: TableInfo }) {
  return (
    <Link href={`/explore/${encodeURIComponent(table.fullName)}`}>
      <div className="bg-card rounded-xl p-4 shadow-[0_4px_20px_-2px_rgba(28,28,26,0.06)] hover:shadow-[0_6px_24px_-2px_rgba(138,75,49,0.1)] transition-shadow cursor-pointer h-full">
        <div className="flex items-start justify-between mb-3">
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
            <Database className="w-4 h-4 text-muted-foreground" />
          </div>
          <span className="text-[9px] font-semibold uppercase tracking-widest bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
            {table.schema}
          </span>
        </div>
        <p className="text-[15px] font-bold text-foreground tracking-tight leading-snug">{table.name}</p>
        <p className="text-[11px] text-muted-foreground mt-1">
          {formatRows(table.estimatedRowCount)} rows · {table.columns.length} columns
        </p>
      </div>
    </Link>
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
    <div className="flex items-start gap-3 bg-card rounded-xl px-4 py-3 shadow-[0_4px_20px_-2px_rgba(28,28,26,0.05)]">
      <div
        className={cn(
          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
          signal.severity === "warning" ? "bg-amber-100 text-amber-600" : "bg-blue-50 text-blue-500"
        )}
      >
        <AlertTriangle className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-snug">{signal.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{signal.desc}</p>
      </div>
      <Link 
        href={signal.href} 
        className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-full bg-muted hover:bg-accent text-muted-foreground transition-colors"
      >
        {signal.action}
      </Link>
    </div>
  );
}

function KpiTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl px-5 py-4 shadow-[0_4px_20px_-2px_rgba(28,28,26,0.05)]",
        "bg-card"
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-3xl font-bold tracking-tight text-foreground mt-1.5">{value}</p>
      {sub && <p className="text-[11px] text-primary mt-1 font-medium">{sub}</p>}
      {/* Thin terracotta accent bar */}
      <div className="h-0.5 bg-primary/20 rounded-full mt-3">
        <div className="h-full bg-primary rounded-full" style={{ width: "38%" }} />
      </div>
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

  // — No connection state —
  if (!settings) return null;

  if (!isConnected || !settings?.connections?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 px-8">
        <div className="max-w-md text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Database className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Connect your database</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            PG Insights is your AI-powered database copilot. Connect a PostgreSQL database to
            explore your schema, profile your data, and get AI-generated insights.
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

  const totalRows = schema?.tables.reduce((s, t) => s + t.estimatedRowCount, 0) ?? 0;

  // Derive health signals
  const healthSignals: HealthSignal[] = [];
  if (!hasAiKey) {
    healthSignals.push({
      id: "no-ai",
      severity: "warning",
      title: "AI Copilot not configured",
      desc: "Add an OpenRouter API key in Settings to enable SQL generation and schema insights.",
      action: "Configure",
      href: "/settings",
    });
  }
  if (schema && schema.tables.length > 0 && !schema.capturedAt) {
    healthSignals.push({
      id: "no-schema",
      severity: "info",
      title: "Schema not loaded",
      desc: "Navigate to Explore to load your schema metadata.",
      action: "Explore",
      href: "/explore",
    });
  }
  if (schema?.capturedAt && ageInHours(schema.capturedAt) > 24) {
    healthSignals.push({
      id: "stale-schema",
      severity: "info",
      title: "Schema cache is stale",
      desc: `Schema was last refreshed ${timeAgo(schema.capturedAt)}. Go to Explore to refresh.`,
      action: "Refresh",
      href: "/explore",
      });
  }

  const recentQueries = savedQueries?.slice(0, 4) ?? [];

  return (
    <div className="h-full overflow-auto">
      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="px-8 pt-7 pb-5">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-1.5">
          Database Cluster
        </p>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <h1 className="text-[32px] font-bold tracking-tight leading-none">Workspace Overview</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1 rounded-full bg-card shadow-[0_2px_8px_rgba(28,28,26,0.06)]">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Active
            </span>
            {schema?.capturedAt && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1 rounded-full bg-card shadow-[0_2px_8px_rgba(28,28,26,0.06)] text-muted-foreground">
                <Clock className="w-3 h-3" />
                Refreshed {timeAgo(schema.capturedAt)}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1 rounded-full bg-card shadow-[0_2px_8px_rgba(28,28,26,0.06)] text-muted-foreground">
              Safe Mode: {safeMode ? "ON" : "OFF"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Main two-column grid ──────────────────────────────────────── */}
      <div className="px-8 pb-6 grid grid-cols-[1fr_300px] gap-6">
        {/* Left column */}
        <div className="space-y-6 min-w-0">

          {/* Recently Viewed Tables */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Database className="w-4 h-4 text-muted-foreground" />
                Recently Viewed Tables
              </h2>
              <Link href="/explore" className="text-xs text-primary hover:underline font-medium">
                View All
              </Link>
            </div>
            {schemaLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Loading schema...
              </div>
            ) : topTables.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {topTables.map((t) => (
                  <TableCard key={t.fullName} table={t} />
                ))}
              </div>
            ) : (
              <div className="bg-card rounded-xl p-6 text-center text-sm text-muted-foreground shadow-[0_4px_20px_-2px_rgba(28,28,26,0.05)]">
                No tables found. Refresh the schema in Explore.
              </div>
            )}
          </section>

          {/* Health Signals */}
          {healthSignals.length > 0 && (
            <section>
              <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Health Signals
              </h2>
              <div className="space-y-2">
                {healthSignals.map((s) => (
                  <HealthSignalRow key={s.id} signal={s} />
                ))}
              </div>
            </section>
          )}

          {/* KPI row */}
          {schema && (
            <div className="grid grid-cols-4 gap-3">
              <KpiTile
                label="Total Tables"
                value={schema.tables.length.toString()}
                sub={`${schema.schemas.length} schemas`}
              />
              <KpiTile
                label="Relationships"
                value={schema.relationships.length.toString()}
                sub="Foreign keys"
              />
              <KpiTile
                label="Est. Total Rows"
                value={formatRows(totalRows)}
                sub="Across all tables"
              />
              <div className="bg-card rounded-xl px-5 py-4 shadow-[0_4px_20px_-2px_rgba(28,28,26,0.05)] flex flex-col items-center justify-center gap-2 hover:shadow-[0_6px_24px_-2px_rgba(138,75,49,0.1)] transition-shadow cursor-pointer">
                <Link href="/settings" className="flex flex-col items-center gap-1.5">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                    <Plus className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    New Connection
                  </span>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Recent Queries */}
          <div className="bg-card rounded-xl shadow-[0_4px_20px_-2px_rgba(28,28,26,0.06)] overflow-hidden">
            <div className="px-4 pt-4 pb-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Recent Queries
              </h2>
            </div>
            <div className="divide-y divide-border/30">
              {recentQueries.length === 0 ? (
                <div className="px-4 pb-4 text-xs text-muted-foreground">
                  No saved queries yet.{" "}
                  <Link href="/query" className="text-primary hover:underline">Run one</Link>
                </div>
              ) : (
                recentQueries.map((q) => (
                  <Link key={q.id} href={`/query`}>
                    <div className="px-4 py-2.5 hover:bg-muted/60 transition-colors">
                      <p className="text-xs font-medium text-foreground truncate">{q.name}</p>
                      <p className="text-[10px] font-mono text-muted-foreground mt-0.5 truncate">
                        {q.sql.slice(0, 48)}…
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
            <div className="px-4 py-2.5">
              <Link href="/query" className="text-[11px] text-primary hover:underline font-medium">
                Open Query Editor →
              </Link>
            </div>
          </div>

          {/* Smart Insights */}
          <div
            className="rounded-xl p-4 overflow-hidden"
            style={{ background: "linear-gradient(145deg, #8a4b31, #6b3522)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <h2 className="text-[10px] font-semibold uppercase tracking-widest text-amber-100">
                Smart Insights
              </h2>
            </div>
            <div className="space-y-0.5">
              {[
                { label: "Profile null rates in top tables", href: "/insights" },
                { label: "Detect missing indexes", href: "/insights" },
                { label: "Generate join suggestions", href: "/insights" },
              ].map((item) => (
                <Link key={item.label} href={item.href}>
                  <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/10 transition-colors group">
                    <span className="text-[13px] text-amber-50 font-medium leading-snug">{item.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-amber-300 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
