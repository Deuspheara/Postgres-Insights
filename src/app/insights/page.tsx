"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Lightbulb,
  Sparkles,
  BarChart3,
  AlertTriangle,
  Code2,
  RefreshCw,
  ExternalLink,
  Zap,
  Database,
  Copy,
  Shield,
  Star,
  ChevronRight,
  Search,
  Bookmark,
  X,
  ChevronDown,
} from "lucide-react";
import type {
  AISuggestions,
  SuggestedDashboard,
  DataQualityFinding,
  RecommendedAlert,
} from "@/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useActiveConnectionId } from "@/components/active-connection-provider";

// ─── Category config ──────────────────────────────────────────────────────────
const CATEGORY_CONFIG = {
  data_quality: {
    label: "DATA QUALITY",
    color: "text-orange-700 bg-orange-50",
    iconBg: "bg-orange-100",
    icon: AlertTriangle,
    iconColor: "text-orange-600",
  },
  performance: {
    label: "PERFORMANCE",
    color: "text-amber-800 bg-amber-50",
    iconBg: "bg-amber-100",
    icon: Zap,
    iconColor: "text-amber-700",
  },
  schema_hygiene: {
    label: "SCHEMA HYGIENE",
    color: "text-slate-700 bg-slate-100",
    iconBg: "bg-slate-100",
    icon: Copy,
    iconColor: "text-slate-600",
  },
} as const;

const SEVERITY_CONFIG = {
  critical: { variant: "destructive" as const, label: "Critical" },
  warning: { variant: "default" as const, label: "Warning" },
  info: { variant: "secondary" as const, label: "Info" },
} as const;

function severityToCategory(
  f: DataQualityFinding,
): keyof typeof CATEGORY_CONFIG {
  if (f.category && f.category in CATEGORY_CONFIG)
    return f.category as keyof typeof CATEGORY_CONFIG;
  if (f.severity === "critical") return "data_quality";
  return "schema_hygiene";
}

// ─── SQL Code Block ───────────────────────────────────────────────────────────
function SqlBlock({
  sql,
  copyable = false,
}: {
  sql: string;
  copyable?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(sql).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="rounded-lg overflow-hidden flex-1">
      <div className="bg-zinc-900 px-3 py-1.5 flex items-center justify-between">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
          SQL BASIS
        </span>
        {copyable && (
          <button
            onClick={handleCopy}
            className="text-[10px] text-muted-foreground hover:text-primary/70 transition-colors"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
      <pre className="bg-zinc-900 px-4 py-3 text-[11px] font-mono text-primary/70 overflow-x-auto leading-relaxed whitespace-pre-wrap">
        {sql}
      </pre>
    </div>
  );
}

// ─── Data Quality / Schema / Performance Insight Card ────────────────────────
function FindingCard({
  finding,
  pinned,
  onPin,
  saved,
  onSave,
  dismissed,
  onDismiss,
  expandedSql,
  onToggleSql,
}: {
  finding: DataQualityFinding;
  pinned: boolean;
  onPin: () => void;
  saved: boolean;
  onSave: () => void;
  dismissed: boolean;
  onDismiss: () => void;
  expandedSql: boolean;
  onToggleSql: () => void;
}) {
  const cat = severityToCategory(finding);
  const cfg = CATEGORY_CONFIG[cat];
  const Icon = cfg.icon;
  const hasSql = !!finding.sql;
  const sevCfg = SEVERITY_CONFIG[finding.severity] ?? SEVERITY_CONFIG.info;

  return (
    <div
      className={cn(
        "bg-white rounded-2xl overflow-hidden shadow-[0_4px_24px_-4px_rgba(28,28,26,0.09)] border border-border flex flex-col transition-opacity",
        dismissed && "opacity-40 pointer-events-none",
      )}
    >
      {/* Card header */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                cfg.iconBg,
              )}
            >
              <Icon
                className={cn("w-4.5 h-4.5", cfg.iconColor)}
                style={{ width: 18, height: 18 }}
              />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground text-[15px] leading-snug">
                {finding.title}
              </h3>
              {finding.sampleSize && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Sample: {finding.sampleSize}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant={sevCfg.variant} className="text-[10px] px-1.5 py-0">
              {sevCfg.label}
            </Badge>
            <Badge
              variant="outline"
              className={cn("text-[10px] px-1.5 py-0", cfg.color)}
            >
              {cfg.label}
            </Badge>
            <button
              onClick={onPin}
              className={cn(
                "p-1.5 rounded-lg transition-colors shrink-0",
                pinned
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              <Star
                className="w-3.5 h-3.5"
                fill={pinned ? "currentColor" : "none"}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 pb-3 flex-1 flex flex-col gap-2">
        {/* What we found */}
        {finding.whatWeFound && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
              What we found
            </p>
            <p className="text-[13px] text-foreground/80 leading-relaxed">
              {finding.whatWeFound}
            </p>
          </div>
        )}

        {/* Evidence row */}
        {(finding.sampleSize || finding.table) && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            {finding.sampleSize && <span>Sample: {finding.sampleSize}</span>}
            {finding.table && (
              <span className="inline-flex items-center gap-1 font-mono">
                <Database className="w-3 h-3" />
                {finding.table}
              </span>
            )}
          </div>
        )}

        {/* Why it matters */}
        {finding.whyItMatters && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
              Why it matters
            </p>
            <p className="text-[13px] text-foreground/80 leading-relaxed">
              {finding.whyItMatters}
            </p>
          </div>
        )}

        {/* SQL toggle */}
        {hasSql && (
          <button
            onClick={onToggleSql}
            className="text-xs text-primary hover:underline flex items-center gap-1 mt-1 self-start"
          >
            {expandedSql ? (
              <>
                <ChevronDown className="w-3 h-3" /> Hide SQL
              </>
            ) : (
              <>
                <ChevronRight className="w-3 h-3" /> View SQL basis
              </>
            )}
          </button>
        )}
        {expandedSql && hasSql && (
          <div className="mt-1">
            <SqlBlock sql={finding.sql!} copyable />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 pb-4 pt-1 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {finding.estimatedGain && (
            <span className="text-[12px] font-semibold text-emerald-700">
              {finding.estimatedGain}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-muted-foreground"
            onClick={onSave}
          >
            <Bookmark
              className="w-3 h-3 mr-1"
              fill={saved ? "currentColor" : "none"}
            />
            {saved ? "Saved" : "Save"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-muted-foreground"
            onClick={onDismiss}
          >
            <X className="w-3 h-3 mr-1" />
            Dismiss
          </Button>
          {finding.sql && (
            <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
              <Link href={`/query?sql=${encodeURIComponent(finding.sql)}`}>
                <Code2 className="w-3 h-3 mr-1" />
                Preview
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Performance / Alert Card ─────────────────────────────────────────────────
function AlertCard({ alert }: { alert: RecommendedAlert }) {
  const gainNum = alert.estimatedGain
    ? parseFloat(alert.estimatedGain.replace(/[^-\d.]/g, ""))
    : null;
  const gainPct =
    gainNum !== null && alert.estimatedGain?.includes("ms")
      ? Math.min((Math.abs(gainNum) / 1000) * 100, 95)
      : 70;

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-[0_4px_24px_-4px_rgba(28,28,26,0.09)] border border-border flex flex-col">
      <div className="p-5 pb-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
            <Zap className="w-[18px] h-[18px] text-amber-700" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-[15px] leading-snug">
              {alert.title}
            </h3>
            <span className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-amber-800 bg-amber-50">
              PERFORMANCE
            </span>
          </div>
        </div>
      </div>

      <div className="px-5 pb-3 space-y-3 flex-1">
        <p className="text-[13px] text-foreground/80 leading-relaxed">
          {alert.description.split(/(`[^`]+`)/g).map((part, i) =>
            part.startsWith("`") && part.endsWith("`") ? (
              <code
                key={i}
                className="bg-muted text-primary px-1.5 py-0.5 rounded text-[11px] font-mono mx-0.5"
              >
                {part.slice(1, -1)}
              </code>
            ) : (
              <span key={i}>{part}</span>
            ),
          )}
        </p>

        {alert.aiInsight && (
          <blockquote className="bg-primary/5 border-l-2 border-primary/70 pl-3 py-2 text-[12px] italic text-muted-foreground rounded-r-lg">
            &ldquo;{alert.aiInsight}&rdquo;
          </blockquote>
        )}

        {alert.estimatedGain && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-muted-foreground font-medium">
                Estimated Gain
              </span>
              <span className="text-[13px] font-bold text-emerald-700">
                {alert.estimatedGain}
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#8a4b31] to-[#c4845e] rounded-full transition-all"
                style={{ width: `${gainPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="px-5 pb-4 pt-1">
        <Button size="sm" className="w-full h-8 text-xs" asChild>
          <Link href={`/query?sql=${encodeURIComponent(alert.sql)}`}>
            <Zap className="w-3.5 h-3.5 mr-1.5" />
            Review & Apply
          </Link>
        </Button>
      </div>
    </div>
  );
}

// ─── Business Metric / Dashboard Card ────────────────────────────────────────
function DashboardSuggestionCard({
  suggestion,
  onBuild,
  isNew,
}: {
  suggestion: SuggestedDashboard;
  onBuild: (s: SuggestedDashboard) => void;
  isNew?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-[0_4px_24px_-4px_rgba(28,28,26,0.09)] border border-border flex flex-col">
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center shrink-0 mt-0.5">
              <Lightbulb className="w-[18px] h-[18px] text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-[15px] leading-snug">
                {suggestion.title}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Discovered via schema analysis
              </p>
            </div>
          </div>
          {isNew && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 shrink-0">
              NEW CAPABILITY
            </span>
          )}
        </div>
      </div>

      <div className="px-5 pb-4 flex-1 space-y-3">
        {suggestion.chartSpecs.length > 0 && (
          <div>
            <p className="text-[13px] font-semibold text-foreground mb-1">
              {suggestion.chartSpecs[0].metric
                ? suggestion.chartSpecs[0].metric.replace(/_/g, " ")
                : suggestion.title}
            </p>
            <p className="text-[13px] text-foreground/80 leading-relaxed">
              {suggestion.why}
            </p>
          </div>
        )}

        {suggestion.tables.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {suggestion.tables.slice(0, 3).map((t) => (
              <span
                key={t}
                className="text-[11px] font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded-md"
              >
                {t.split(".").pop()}
              </span>
            ))}
          </div>
        )}

        {/* Preview bar */}
        <div className="h-px bg-border/10" />
        <div className="flex gap-1.5">
          {[85, 62, 40].map((w, i) => (
            <div
              key={i}
              className="h-1.5 bg-muted rounded-full"
              style={{ width: `${w}px` }}
            />
          ))}
        </div>
      </div>

      <div className="px-5 pb-4 pt-1 flex items-center gap-2">
        <Button
          size="sm"
          className="flex-1 h-8 text-xs"
          onClick={() => onBuild(suggestion)}
        >
          <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
          Create Dashboard
        </Button>
        {suggestion.chartSpecs[0]?.sql && (
          <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
            <Link
              href={`/query?sql=${encodeURIComponent(suggestion.chartSpecs[0].sql)}`}
            >
              <ExternalLink className="w-3 h-3" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Query Card ───────────────────────────────────────────────────────────────
function QueryCard({ q }: { q: AISuggestions["recommendedQueries"][number] }) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-[0_4px_24px_-4px_rgba(28,28,26,0.09)] border border-border flex flex-col">
      <div className="p-4 pb-2">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
            <Code2 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">{q.title}</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">{q.why}</p>
          </div>
        </div>
      </div>
      <div className="px-4 pb-3 flex-1">
        <pre className="text-[11px] font-mono text-primary/70 bg-zinc-900 rounded-lg p-3 overflow-x-auto leading-relaxed max-h-28">
          {q.sql}
        </pre>
      </div>
      <div className="px-4 pb-4">
        <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
          <Link href={`/query?sql=${encodeURIComponent(q.sql)}`}>
            <ExternalLink className="w-3 h-3 mr-1" />
            Open in Query
          </Link>
        </Button>
      </div>
    </div>
  );
}

// ─── Bento grid layout helper ─────────────────────────────────────────────────
type BentoItem =
  | { kind: "finding"; data: DataQualityFinding }
  | { kind: "alert"; data: RecommendedAlert }
  | { kind: "dashboard"; data: SuggestedDashboard; isNew: boolean };

function buildBentoItems(suggestions: AISuggestions): BentoItem[] {
  const items: BentoItem[] = [];
  const findings = suggestions.dataQualityFindings ?? [];
  const alerts = suggestions.recommendedAlerts ?? [];
  const dashboards = suggestions.recommendedDashboards ?? [];

  // Interleave: first finding, first alert, remaining findings, remaining dashboards
  if (findings[0]) items.push({ kind: "finding", data: findings[0] });
  if (alerts[0]) items.push({ kind: "alert", data: alerts[0] });
  for (let i = 1; i < findings.length; i++)
    items.push({ kind: "finding", data: findings[i] });
  dashboards.forEach((d, i) =>
    items.push({ kind: "dashboard", data: d, isNew: i === 0 }),
  );
  for (let i = 1; i < alerts.length; i++)
    items.push({ kind: "alert", data: alerts[i] });
  return items;
}

function getColSpan(item: BentoItem, index: number): string {
  // First item is "featured" if it has rich content
  if (
    index === 0 &&
    item.kind === "finding" &&
    (item.data.sql || item.data.whatWeFound)
  ) {
    return "md:col-span-2";
  }
  return "md:col-span-1";
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function InsightsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const connectionId = useActiveConnectionId();
  const [pinned, setPinned] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [expandedSql, setExpandedSql] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const {
    data: suggestions,
    isLoading,
    error,
  } = useQuery<AISuggestions>({
    queryKey: ["suggestions", connectionId],
    queryFn: () =>
      fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).then((r) => r.json()),
    enabled: !!connectionId,
  });

  const refreshMutation = useMutation({
    mutationFn: () =>
      fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: true }),
      }).then((r) => r.json()),
    onSuccess: (data) => qc.setQueryData(["suggestions", connectionId], data),
  });

  const buildDashboardMutation = useMutation({
    mutationFn: (suggestion: SuggestedDashboard) =>
      fetch("/api/dashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: suggestion.title,
          description: suggestion.why,
          tiles: suggestion.chartSpecs.map((cs, i) => ({
            id: crypto.randomUUID(),
            title:
              cs.title ??
              `${cs.metric}${cs.dimension ? ` by ${cs.dimension}` : ""}`,
            chartType: cs.chartType,
            sql: cs.sql ?? "",
            x: (i % 2) * 6,
            y: Math.floor(i / 2) * 4,
            w: 6,
            h: 4,
          })),
          fromSuggestionId: suggestion.id,
        }),
      }).then((r) => r.json()),
    onSuccess: (dashboard) => router.push(`/dashboards/${dashboard.id}`),
  });

  const err =
    (suggestions as { error?: string })?.error ?? (error as Error)?.message;
  const togglePin = (id: string) => {
    setPinned((p) => {
      const s = new Set(p);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  };

  const toggleSave = (id: string) => {
    setSavedIds((p) => {
      const s = new Set(p);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  };

  const toggleDismiss = (id: string) => {
    setDismissedIds((p) => {
      const s = new Set(p);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  };

  const toggleSql = (id: string) => {
    setExpandedSql((p) => {
      const s = new Set(p);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  };

  const bentoItems = suggestions && !err ? buildBentoItems(suggestions) : [];
  const queries = suggestions?.recommendedQueries ?? [];
  const findings = suggestions?.dataQualityFindings ?? [];
  const alerts = suggestions?.recommendedAlerts ?? [];
  const dashboards = suggestions?.recommendedDashboards ?? [];
  const totalFindings = findings.length;
  const performanceCount = alerts.length;
  const qualityCount = findings.filter(
    (f) => f.category === "data_quality" || f.severity === "critical",
  ).length;
  const suggestionCount = dashboards.length;

  // Filter items
  const filtered = bentoItems.filter((item) => {
    if (item.kind === "finding") {
      const finding = item.data;
      if (dismissedIds.has(finding.id)) return false;
      if (severityFilter !== "all" && finding.severity !== severityFilter)
        return false;
      if (
        categoryFilter !== "all" &&
        (finding.category ?? severityToCategory(finding)) !== categoryFilter
      )
        return false;
      if (
        searchQuery &&
        !finding.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !(finding.whatWeFound ?? "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) &&
        !(finding.whyItMatters ?? "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      )
        return false;
    }
    return true;
  });

  return (
    <div className="flex h-full flex-col overflow-auto">
      <div className="px-6 py-7 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="space-y-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    Workspace insights
                  </Badge>
                  <Badge variant="outline" className="rounded-full text-[11px] text-muted-foreground">
                    <Shield className="mr-1.5 h-3 w-3" />
                    In-environment analysis
                  </Badge>
                </div>
                <h1 className="mt-3 text-[30px] font-bold tracking-tight text-foreground">
                  Workspace Insights
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  A calmer view of AI findings across performance, data quality, and schema hygiene.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => refreshMutation.mutate()}
                  disabled={refreshMutation.isPending}
                >
                  <RefreshCw
                    className={cn("mr-2 h-4 w-4", refreshMutation.isPending && "animate-spin")}
                  />
                  Refresh
                </Button>
                <Button asChild>
                  <Link href="/settings">Configure scans</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-border/70 bg-card px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Total findings</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{totalFindings}</p>
                <p className="mt-1 text-xs text-muted-foreground">Visible in the latest scan</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-card px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Performance</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{performanceCount}</p>
                <p className="mt-1 text-xs text-muted-foreground">Alerts and tuning opportunities</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-card px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Data quality</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{qualityCount}</p>
                <p className="mt-1 text-xs text-muted-foreground">Critical or hygiene-related items</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-card px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Suggestions</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{suggestionCount}</p>
                <p className="mt-1 text-xs text-muted-foreground">Dashboard and workflow ideas</p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border/70 bg-card p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <div className="relative flex-1 xl:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-10 pl-9 text-sm"
                  placeholder="Search findings, rationale, or impact..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={severityFilter === "all" ? "default" : "outline"} className="cursor-pointer" onClick={() => setSeverityFilter("all")}>All</Badge>
                <Badge variant={severityFilter === "critical" ? "destructive" : "outline"} className="cursor-pointer" onClick={() => setSeverityFilter("critical")}>Critical</Badge>
                <Badge variant={severityFilter === "warning" ? "default" : "outline"} className="cursor-pointer" onClick={() => setSeverityFilter("warning")}>Warning</Badge>
                <Badge variant={severityFilter === "info" ? "secondary" : "outline"} className="cursor-pointer" onClick={() => setSeverityFilter("info")}>Info</Badge>
              </div>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-10 w-full text-sm xl:w-52">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  <SelectItem value="data_quality">Data Quality</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="schema_hygiene">Schema Hygiene</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>

          <div className="space-y-6">
          {/* Loading */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary animate-pulse" />
              </div>
              <div className="text-center">
                <p className="font-medium text-foreground">
                  Analyzing your database…
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Profile some tables first for richer insights
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {err && !isLoading && (
            <div className="bg-white rounded-2xl border border-amber-200 p-5 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="font-medium text-sm">
                  Could not generate insights
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{err}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Make sure you have an OpenRouter API key configured in{" "}
                  <Link href="/settings" className="text-primary underline">
                    Settings
                  </Link>{" "}
                  and the schema has been loaded.
                </p>
              </div>
            </div>
          )}

          {suggestions && !err && (
            <>
              {/* Scan Summary Banner */}
              <div className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_18px_48px_-34px_rgba(28,28,26,0.26)] dark:border-white/6 dark:bg-card/90">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-base font-semibold tracking-tight text-foreground">
                      Workspace scan summary
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {totalFindings} findings detected across performance, data quality, and usage patterns
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700 border-amber-200"
                    >
                      {performanceCount} performance
                    </Badge>
                    <Badge
                      variant="outline"
                      className="rounded-full bg-cyan-50 px-3 py-1 text-xs text-cyan-700 border-cyan-200"
                    >
                      {qualityCount} data quality
                    </Badge>
                    <Badge
                      variant="outline"
                      className="rounded-full bg-indigo-50 px-3 py-1 text-xs text-indigo-700 border-indigo-200"
                    >
                      {suggestionCount} suggestions
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Bento insight cards */}
              {filtered.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-auto">
                  {filtered.map((item, i) => {
                    const colSpan = getColSpan(item, i);
                    if (item.kind === "finding") {
                      const f = item.data;
                      return (
                        <div key={f.id} className={colSpan}>
                          <FindingCard
                            finding={f}
                            pinned={pinned.has(f.id)}
                            onPin={() => togglePin(f.id)}
                            saved={savedIds.has(f.id)}
                            onSave={() => toggleSave(f.id)}
                            dismissed={dismissedIds.has(f.id)}
                            onDismiss={() => toggleDismiss(f.id)}
                            expandedSql={expandedSql.has(f.id)}
                            onToggleSql={() => toggleSql(f.id)}
                          />
                        </div>
                      );
                    }
                    if (item.kind === "alert") {
                      return (
                        <div key={item.data.id} className={colSpan}>
                          <AlertCard alert={item.data} />
                        </div>
                      );
                    }
                    return (
                      <div key={item.data.id} className={colSpan}>
                        <DashboardSuggestionCard
                          suggestion={item.data}
                          onBuild={(s) => buildDashboardMutation.mutate(s)}
                          isNew={item.isNew}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-foreground">
                    No matching insights
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {dismissedIds.size > 0
                      ? "Try adjusting your filters or dismissed items"
                      : "Profile your tables to get AI-powered recommendations"}
                  </p>
                  {dismissedIds.size === 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-1"
                      asChild
                    >
                      <Link href="/explore">Explore Tables</Link>
                    </Button>
                  )}
                </div>
              )}

              {/* Recommended queries section */}
              {queries.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="text-sm font-semibold text-foreground">
                      Suggested Queries
                    </h2>
                    <span className="text-[11px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                      {queries.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {queries.map((q) => (
                      <QueryCard key={q.id} q={q} />
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              {suggestions.generatedAt && (
                <p className="text-[11px] text-muted-foreground pb-2">
                  Generated {new Date(suggestions.generatedAt).toLocaleString()}{" "}
                  · {suggestions.modelUsed}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  </div>
  );
}
