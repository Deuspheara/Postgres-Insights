"use client";

import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line,
  BarChart, Bar,
  AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { RefreshCw, AlertTriangle, Code2, TrendingUp, TrendingDown, Minus, Download, Edit2 } from "lucide-react";
import type { DashboardTile, QueryResult } from "@/types";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

// ─── Warm palette — hardcoded hex (CSS vars don't resolve inside SVG) ─────────
const PALETTE = [
  "#8a4b31", // terracotta primary
  "#c4845e", // copper light
  "#a06c2e", // amber
  "#8b7d76", // slate
  "#6b3522", // dark terracotta
  "#c4952e", // gold
  "#d4967a", // salmon
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtNum(v: unknown): string {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  if (isNaN(n)) return String(v);
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function coerce(result: QueryResult) {
  return result.rows.map((r) => {
    const out: Record<string, unknown> = {};
    for (const f of result.fields) {
      const v = r[f.name];
      out[f.name] =
        typeof v === "string" && v !== "" && !isNaN(Number(v)) ? Number(v) : v;
    }
    return out;
  });
}

function calculateTrend(data: Record<string, unknown>[], valueKey: string): { trend: number | null; isUp: boolean; isDown: boolean } {
  if (data.length < 2) return { trend: null, isUp: false, isDown: false };
  
  const values = data.map((d) => Number(d[valueKey])).filter((v) => !isNaN(v));
  if (values.length < 2) return { trend: null, isUp: false, isDown: false };
  
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  
  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  
  if (avgFirst === 0) return { trend: null, isUp: false, isDown: false };
  
  const trend = ((avgSecond - avgFirst) / avgFirst) * 100;
  return {
    trend,
    isUp: trend > 0,
    isDown: trend < 0,
  };
}

function exportChartAsText(element: HTMLElement, filename: string) {
  const text = element.innerText;
  const blob = new Blob([text], { type: "text/plain" });
  const link = document.createElement("a");
  link.download = `${filename}.txt`;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────
type TooltipEntry = { name: string; value: unknown; color: string };

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white shadow-[0_8px_24px_-4px_rgba(28,28,26,0.18)] rounded-lg p-3 text-xs pointer-events-none min-w-32">
      {label != null && (
        <p className="font-semibold text-[#6b5f58] mb-2 truncate max-w-52">{String(label)}</p>
      )}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 py-0.5">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: p.color }}
          />
          <span className="text-[#6b5f58] truncate max-w-28">{p.name}</span>
          <span className="font-bold text-[#1c1c1a] ml-auto pl-4 tabular-nums">
            {typeof p.value === "number" ? fmtNum(p.value) : String(p.value ?? "—")}
          </span>
        </div>
      ))}
    </div>
  );
}

const AXIS_STYLE = {
  tick: {
    fontSize: 10,
    fill: "#8b7d76",
    fontFamily: "var(--font-inter), system-ui, sans-serif",
  },
  tickLine: false,
  axisLine: false,
};

const SUBTLE_GRID = {
  stroke: "rgba(28,28,26,0.04)",
  strokeDasharray: "0",
};

const LEGEND_FMT = (v: string) => (
  <span style={{ fontSize: 10, color: "#8b7d76" }}>{v}</span>
);

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KPICard({ result }: { result: QueryResult }) {
  const { fields, rows } = result;
  const firstRow = rows[0] ?? {};
  const mainField = fields[0];

  const trendField =
    fields.find(
      (f) =>
        f.name.toLowerCase().includes("trend") ||
        f.name.toLowerCase().includes("delta") ||
        f.name.toLowerCase().includes("change") ||
        f.name.toLowerCase().includes("pct") ||
        f.name.toLowerCase().includes("percent")
    ) ??
    (fields.length > 1 ? fields[1] : undefined);

  const rawVal = firstRow[mainField?.name ?? ""] ?? null;
  const trendRaw =
    trendField && trendField !== mainField ? firstRow[trendField.name] : null;

  const numVal =
    typeof rawVal === "number"
      ? rawVal
      : typeof rawVal === "string" && !isNaN(Number(rawVal))
      ? Number(rawVal)
      : null;

  const trendNum =
    trendRaw !== null && trendRaw !== undefined
      ? typeof trendRaw === "number"
        ? trendRaw
        : typeof trendRaw === "string" && !isNaN(Number(trendRaw))
        ? Number(trendRaw)
        : null
      : null;

  const sparkData = rows.length > 2 ? coerce(result) : null;
  const sparkKey = sparkData ? fields[fields.length - 1].name : null;

  const isUp = trendNum !== null && trendNum > 0;
  const isDown = trendNum !== null && trendNum < 0;

  return (
    <div className="flex flex-col justify-between h-full">
      <div>
        <p className="text-4xl font-bold tracking-tight text-[#1c1c1a] leading-none tabular-nums">
          {numVal !== null ? fmtNum(numVal) : String(rawVal ?? "—")}
        </p>
        <p className="text-xs text-[#8b7d76] mt-2 font-medium capitalize">
          {mainField?.name?.replace(/_/g, " ") ?? "value"}
        </p>
        {trendNum !== null && (
          <span
            className={cn(
              "inline-flex items-center gap-1 mt-2.5 text-[11px] font-semibold px-2.5 py-1 rounded-full",
              isUp
                ? "text-green-700 bg-green-50"
                : isDown
                ? "text-red-600 bg-red-50"
                : "text-[#8b7d76] bg-[#f0ece8]"
            )}
          >
            {isUp ? (
              <TrendingUp className="w-3 h-3" />
            ) : isDown ? (
              <TrendingDown className="w-3 h-3" />
            ) : (
              <Minus className="w-3 h-3" />
            )}
            {trendNum > 0 ? "+" : ""}
            {trendNum.toFixed(1)}%
          </span>
        )}
      </div>

      {sparkData && sparkKey && (
        <div className="h-14 -mx-1 mt-3">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={sparkData} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
              <defs>
                <linearGradient id="kpiGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8a4b31" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#8a4b31" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey={sparkKey}
                stroke="#8a4b31"
                strokeWidth={1.5}
                fill="url(#kpiGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── Pie / Donut ─────────────────────────────────────────────────────────────
function PieDonutChart({ result, isDonut }: { result: QueryResult; isDonut: boolean }) {
  const { fields } = result;
  const labelKey = fields[0]?.name ?? "";
  const valueKey = fields[1]?.name ?? fields[0]?.name ?? "";
  const data = coerce(result).map((r) => ({
    name: String(r[labelKey] ?? ""),
    value: Number(r[valueKey] ?? 0),
  }));
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={isDonut ? "48%" : 0}
          outerRadius="72%"
          paddingAngle={isDonut ? 3 : 0}
          dataKey="value"
          strokeWidth={0}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v: unknown) =>
            typeof v === "number"
              ? [`${fmtNum(v)} (${((v / total) * 100).toFixed(1)}%)`, ""]
              : [String(v), ""]
          }
        />
        <Legend iconSize={8} iconType="circle" formatter={LEGEND_FMT} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ─── Generic Chart (line / bar / area / stacked / table) ─────────────────────
function GenericChart({ tile, result }: { tile: DashboardTile; result: QueryResult }) {
  if (result.rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-[#8b7d76]">
        <div className="w-9 h-9 rounded-lg bg-[#f0ece8] flex items-center justify-center">
          <Minus className="w-4 h-4" />
        </div>
        <span className="text-xs">No data returned</span>
      </div>
    );
  }

  if (tile.chartType === "pie" || tile.chartType === "donut") {
    return <PieDonutChart result={result} isDonut={tile.chartType === "donut"} />;
  }

  if (tile.chartType === "table") {
    const { fields, rows } = result;
    return (
      <div className="overflow-auto h-full text-xs">
        <table className="w-full border-collapse">
          <thead className="sticky top-0">
            <tr className="bg-[#f0ece8]">
              {fields.map((f) => (
                <th
                  key={f.name}
                  className="px-3 py-2 text-left font-semibold text-[#6b5f58] uppercase tracking-wider text-[10px] whitespace-nowrap"
                >
                  {f.name.replace(/_/g, " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 200).map((row, i) => (
              <tr
                key={i}
                className={cn(
                  "transition-colors hover:bg-[#f0ece8]/60",
                  i % 2 === 0 ? "bg-white" : "bg-[#fcf9f6]"
                )}
              >
                {fields.map((f) => (
                  <td
                    key={f.name}
                    className="px-3 py-1.5 font-mono whitespace-nowrap truncate max-w-[180px] text-[#1c1c1a]"
                  >
                    {row[f.name] === null ? (
                      <span className="text-[#8b7d76] italic">NULL</span>
                    ) : (
                      String(row[f.name])
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const { fields } = result;
  const xKey = fields[0]?.name ?? "";
  const yKeys = fields.slice(1).map((f) => f.name);
  const effectiveYKeys = yKeys.length > 0 ? yKeys : [xKey];
  const data = coerce(result);
  const common = { data, margin: { top: 8, right: 12, left: -4, bottom: 4 } };

  if (tile.chartType === "bar" || tile.chartType === "stacked-bar") {
    const stacked = tile.chartType === "stacked-bar";
    return (
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart {...common} barCategoryGap="38%">
          <CartesianGrid horizontal vertical={false} {...SUBTLE_GRID} />
          <XAxis dataKey={xKey} {...AXIS_STYLE} />
          <YAxis {...AXIS_STYLE} tickFormatter={fmtNum} width={42} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(28,28,26,0.03)" }} />
          {effectiveYKeys.length > 1 && (
            <Legend iconSize={8} iconType="circle" formatter={LEGEND_FMT} />
          )}
          {effectiveYKeys.map((k, i) => (
            <Bar
              key={k}
              dataKey={k}
              fill={PALETTE[i % PALETTE.length]}
              radius={stacked ? [0, 0, 0, 0] : [3, 3, 0, 0]}
              stackId={stacked ? "s" : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (tile.chartType === "area" || tile.chartType === "stacked-area") {
    const stacked = tile.chartType === "stacked-area";
    return (
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart {...common}>
          <defs>
            {effectiveYKeys.map((_, i) => (
              <linearGradient key={i} id={`ag${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0.22} />
                <stop offset="95%" stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid horizontal vertical={false} {...SUBTLE_GRID} />
          <XAxis dataKey={xKey} {...AXIS_STYLE} />
          <YAxis {...AXIS_STYLE} tickFormatter={fmtNum} width={42} />
          <Tooltip content={<ChartTooltip />} />
          {effectiveYKeys.length > 1 && (
            <Legend iconSize={8} iconType="circle" formatter={LEGEND_FMT} />
          )}
          {effectiveYKeys.map((k, i) => (
            <Area
              key={k}
              type="monotone"
              dataKey={k}
              stroke={PALETTE[i % PALETTE.length]}
              strokeWidth={2}
              fill={`url(#ag${i})`}
              stackId={stacked ? "s" : undefined}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  // Default → smooth line
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <LineChart {...common}>
        <CartesianGrid horizontal vertical={false} {...SUBTLE_GRID} />
        <XAxis dataKey={xKey} {...AXIS_STYLE} />
        <YAxis {...AXIS_STYLE} tickFormatter={fmtNum} width={42} />
        <Tooltip content={<ChartTooltip />} />
        {effectiveYKeys.length > 1 && (
          <Legend iconSize={8} iconType="circle" formatter={LEGEND_FMT} />
        )}
        {effectiveYKeys.map((k, i) => (
          <Line
            key={k}
            type="monotone"
            dataKey={k}
            stroke={PALETTE[i % PALETTE.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0, fill: PALETTE[i % PALETTE.length] }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Public Tile Shell ────────────────────────────────────────────────────────
export function ChartTile({
  tile,
  onRemove,
  onEdit,
  delay = 0,
}: {
  tile: DashboardTile;
  onRemove?: () => void;
  onEdit?: () => void;
  delay?: number;
}) {
  const [showSql, setShowSql] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(delay === 0);

  useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => setEnabled(true), delay);
      return () => clearTimeout(timer);
    }
  }, [delay]);

  const { data: result, isLoading, error, refetch } = useQuery<QueryResult>({
    queryKey: ["tile", tile.id, tile.sql],
    queryFn: () =>
      fetch("/api/query/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: tile.sql, class: "analytics" }),
      }).then((r) => r.json()),
    enabled: !!tile.sql && enabled,
    staleTime: 1000 * 60 * 5,
  });

  const isKpi = tile.chartType === "kpi";
  const isTable = tile.chartType === "table";

  const handleExport = () => {
    if (chartRef.current) {
      exportChartAsText(chartRef.current, tile.title.replace(/\s+/g, "_"));
    }
  };

  const data = result ? coerce(result) : [];
  const valueKey = result?.fields[1]?.name;
  const trend = valueKey ? calculateTrend(data, valueKey) : null;

  return (
    <div ref={chartRef} className="flex flex-col h-full bg-white rounded-xl overflow-hidden shadow-[0_4px_20px_-2px_rgba(28,28,26,0.07)] group/tile">
      {/* Header */}
      <div className="flex items-start gap-2 px-4 pt-3.5 pb-2 shrink-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-semibold text-[#1c1c1a] truncate leading-snug">
              {tile.title}
            </p>
            {trend && trend.trend !== null && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                  trend.isUp
                    ? "text-green-700 bg-green-50"
                    : trend.isDown
                    ? "text-red-600 bg-red-50"
                    : "text-[#8b7d76] bg-[#f0ece8]"
                )}
              >
                {trend.isUp ? (
                  <TrendingUp className="w-2.5 h-2.5" />
                ) : trend.isDown ? (
                  <TrendingDown className="w-2.5 h-2.5" />
                ) : (
                  <Minus className="w-2.5 h-2.5" />
                )}
                {trend.trend > 0 ? "+" : ""}
                {trend.trend.toFixed(0)}%
              </span>
            )}
          </div>
          {tile.subtitle && (
            <p className="text-[10px] text-[#8b7d76] truncate mt-0.5">{tile.subtitle}</p>
          )}
        </div>
        {/* Controls – appear on hover */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover/tile:opacity-100 transition-opacity shrink-0 pt-0.5">
          {result?.durationMs != null && (
            <span className="text-[10px] text-[#8b7d76] font-mono mr-1">
              {result.durationMs}ms
            </span>
          )}
          <button
            onClick={() => refetch()}
            title="Refresh"
            className="p-1 rounded hover:bg-[#f0ece8] text-[#8b7d76] transition-colors"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
          </button>
          <button
            onClick={handleExport}
            title="Export"
            className="p-1 rounded hover:bg-[#f0ece8] text-[#8b7d76] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          {onEdit && (
            <button
              onClick={onEdit}
              title="Edit SQL"
              className="p-1 rounded hover:bg-[#f0ece8] text-[#8b7d76] transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setShowSql((s) => !s)}
            title="View SQL"
            className={cn(
              "p-1 rounded hover:bg-[#f0ece8] transition-colors",
              showSql ? "text-[#8a4b31]" : "text-[#8b7d76]"
            )}
          >
            <Code2 className="w-3.5 h-3.5" />
          </button>
          {onRemove && (
            <button
              onClick={onRemove}
              title="Remove tile"
              className="p-1 rounded hover:bg-red-50 text-[#8b7d76] hover:text-red-500 transition-colors text-base leading-none"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* SQL drawer */}
      {showSql && (
        <div className="bg-[#1c1c1a] mx-3 mb-2 rounded-lg px-3 py-2.5 shrink-0">
          <pre className="text-[11px] font-mono text-[#c4845e] overflow-x-auto max-h-24 whitespace-pre leading-relaxed">
            {tile.sql}
          </pre>
        </div>
      )}

      <div className="h-px bg-[rgba(28,28,26,0.04)] shrink-0 mx-3" />

      {/* Chart body */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <div
          className={cn(
            "absolute inset-0",
            isKpi ? "p-4 pt-3" : isTable ? "overflow-auto" : "pt-3 px-2 pb-2"
          )}
        >
          {isLoading && (
            <div className="flex items-center justify-center h-full gap-2 text-[#8b7d76]">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-xs">Loading...</span>
            </div>
          )}

          {!isLoading && (error || result?.error) && (
            <div className="flex flex-col items-center justify-center h-full gap-2 px-4 text-center">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-xs text-red-600 leading-relaxed max-w-48">
                {result?.error ?? (error as Error)?.message ?? "An error occurred"}
              </p>
            </div>
          )}

          {!isLoading && !error && result && !result.error && (
            isKpi ? (
              <KPICard result={result} />
            ) : (
              <GenericChart tile={tile} result={result} />
            )
          )}

          {!tile.sql && !isLoading && (
            <div className="flex items-center justify-center h-full">
              <span className="text-xs text-[#8b7d76]">No SQL configured</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
