"use client";

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  BarChart3,
  Plus,
  Clock,
  Layers,
  Sparkles,
  MoreHorizontal,
  LineChart,
  PieChart,
  GanttChartSquare,
  Table2,
  Activity,
  Hash,
  ArrowUpDown,
} from "lucide-react";
import type { Dashboard, AIDashboardResponse, ChartType } from "@/types";
import Link from "next/link";
import { useState, useMemo } from "react";
import { AIGenerateDialog } from "@/components/dashboards/ai-generate-dialog";
import { timeAgo } from "@/lib/utils";
import { useActiveConnectionId } from "@/components/active-connection-provider";

// ─── Chart colour palette for mini preview blocks ────────────────────────────

const chartColours: Record<ChartType, string> = {
  line: "bg-blue-400",
  bar: "bg-amber-400",
  area: "bg-emerald-400",
  "stacked-bar": "bg-orange-400",
  "stacked-area": "bg-teal-400",
  kpi: "bg-violet-400",
  table: "bg-slate-400",
  histogram: "bg-indigo-400",
  scatter: "bg-cyan-400",
  pie: "bg-pink-400",
  donut: "bg-rose-400",
};

const chartIcons: Record<string, typeof BarChart3> = {
  line: LineChart,
  bar: GanttChartSquare,
  area: Activity,
  kpi: Hash,
  table: Table2,
  pie: PieChart,
  donut: PieChart,
};

// ─── Mini preview ─────────────────────────────────────────────────────────────

function MiniTilePreview({ tiles }: { tiles: Dashboard["tiles"] }) {
  if (tiles.length === 0) {
    return (
      <div className="h-28 flex items-center justify-center bg-muted/30">
        <BarChart3 className="w-8 h-8 text-muted-foreground/40" />
      </div>
    );
  }

  // Show up to 6 tiles as coloured blocks simulating a chart grid
  const shown = tiles.slice(0, 6);
  const cols = 3;
  const rows = Math.ceil(shown.length / cols);

  return (
    <div
      className="h-28 bg-muted/20 p-3 grid gap-1.5"
      style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
      }}
    >
      {shown.map((tile, i) => {
        const colour = chartColours[tile.chartType] ?? "bg-muted-foreground/20";
        // Simulate different "heights" for a bar-chart feel based on index
        const heights = ["h-1/2", "h-3/4", "h-2/3", "h-full", "h-1/3", "h-5/6"];
        const h = heights[i % heights.length];
        return (
          <div
            key={tile.id}
            className={`${colour} rounded self-end ${h} opacity-70`}
          />
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardsPage() {
  const qc = useQueryClient();
  const connectionId = useActiveConnectionId();
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("updated");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: dashboards = [], isLoading } = useQuery<Dashboard[]>({
    queryKey: ["dashboards", connectionId],
    queryFn: () => fetch("/api/dashboards").then((r) => r.json()),
    enabled: !!connectionId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/dashboards/${id}`, { method: "DELETE" }).then((r) =>
        r.json(),
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["dashboards", connectionId] }),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      fetch("/api/dashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "New Dashboard",
          tiles: [],
          connectionId,
        }),
      }).then((r) => r.json() as Promise<Dashboard>),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["dashboards", connectionId] });
      window.location.href = `/dashboards/${d.id}`;
    },
  });

  const createAIDashboardMutation = useMutation({
    mutationFn: (aiDashboard: AIDashboardResponse) =>
      fetch("/api/dashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: aiDashboard.title,
          description: aiDashboard.description,
          connectionId,
          tiles: aiDashboard.tiles.map((tile, i) => ({
            id: crypto.randomUUID(),
            title: tile.title,
            chartType: tile.chartType,
            sql: tile.sql,
            x: (i % 2) * 6,
            y: Math.floor(i / 2) * 5,
            w: tile.w,
            h: tile.h,
          })),
        }),
      }).then((r) => r.json() as Promise<Dashboard>),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["dashboards", connectionId] });
      window.location.href = `/dashboards/${d.id}`;
    },
  });

  // ── Sorting & filtering ──────────────────────────────────────────────────

  const sortedAndFiltered = useMemo(
    () =>
      [...dashboards]
        .filter((d) => {
          if (statusFilter !== "all" && d.state !== statusFilter) return false;
          if (
            searchQuery &&
            !d.title.toLowerCase().includes(searchQuery.toLowerCase())
          )
            return false;
          return true;
        })
        .sort((a, b) => {
          if (sortBy === "name") return a.title.localeCompare(b.title);
          if (sortBy === "created")
            return (
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        }),
    [dashboards, searchQuery, sortBy, statusFilter],
  );

  // ── Duplicate helper ─────────────────────────────────────────────────────

  const duplicateMutation = useMutation({
    mutationFn: (d: Dashboard) =>
      fetch("/api/dashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${d.title} (copy)`,
          description: d.description,
          connectionId,
          tiles: d.tiles.map((tile) => ({
            ...tile,
            id: crypto.randomUUID(),
          })),
        }),
      }).then((r) => r.json() as Promise<Dashboard>),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["dashboards", connectionId] });
      window.location.href = `/dashboards/${d.id}`;
    },
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="h-full overflow-auto">
      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="px-8 pt-7 pb-5">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-1.5">
          Visual Summaries
        </p>
        <div className="flex items-end justify-between gap-4">
          <h1 className="text-[32px] font-bold tracking-tight leading-none">
            Dashboards
          </h1>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAiDialogOpen(true)}
              className="shrink-0"
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              Generate with AI
            </Button>
            <Button
              size="sm"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="shrink-0"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* ── Controls bar (search + sort + filter) ───────────────────────── */}
      <div className="px-8 pb-5 flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8 h-9 text-sm"
            placeholder="Search dashboards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-36 h-9 text-sm">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated">Last updated</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="created">Date created</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Badge
            variant={statusFilter === "all" ? "default" : "outline"}
            className="cursor-pointer text-xs select-none"
            onClick={() => setStatusFilter("all")}
          >
            All
          </Badge>
          <Badge
            variant={statusFilter === "draft" ? "secondary" : "outline"}
            className="cursor-pointer text-xs select-none"
            onClick={() => setStatusFilter("draft")}
          >
            Draft
          </Badge>
          <Badge
            variant={statusFilter === "published" ? "default" : "outline"}
            className="cursor-pointer text-xs select-none"
            onClick={() => setStatusFilter("published")}
          >
            Published
          </Badge>
        </div>
      </div>

      {/* ── Grid area ────────────────────────────────────────────────────── */}
      <div className="px-8 pb-8">
        {/* Loading */}
        {isLoading && (
          <div className="text-muted-foreground text-sm py-12 text-center">
            Loading…
          </div>
        )}

        {/* Empty state */}
        {!isLoading && dashboards.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <BarChart3 className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="font-semibold text-base">No dashboards yet</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Get started by creating a dashboard manually or by describing what
              you need to the AI generator.
            </p>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => setAiDialogOpen(true)}>
                <Sparkles className="w-4 h-4 mr-1.5" />
                Generate with AI
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Create Dashboard
              </Button>
            </div>
          </div>
        )}

        {/* Dashboard grid */}
        {dashboards.length > 0 && (
          <>
            {sortedAndFiltered.length === 0 && (
              <div className="text-center py-16">
                <p className="text-sm text-muted-foreground">
                  No dashboards match your current filters.
                </p>
                <Button
                  variant="link"
                  size="sm"
                  className="mt-1"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              </div>
            )}

            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {sortedAndFiltered.map((d) => (
                <div
                  key={d.id}
                  className="group bg-card rounded-xl shadow-[0_4px_20px_-2px_rgba(28,28,26,0.06)] hover:shadow-[0_6px_24px_-2px_rgba(138,75,49,0.1)] transition-shadow overflow-hidden flex flex-col"
                >
                  {/* ── Mini preview ─────────────────────────────────────── */}
                  <Link href={`/dashboards/${d.id}`} className="block">
                    <MiniTilePreview tiles={d.tiles} />
                  </Link>

                  {/* ── Body ─────────────────────────────────────────────── */}
                  <div className="px-4 pt-3 pb-2 flex flex-col flex-1">
                    {/* Title + badge */}
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/dashboards/${d.id}`} className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate hover:text-primary transition-colors">
                          {d.title}
                        </p>
                      </Link>
                      <Badge
                        variant={
                          d.state === "published" ? "default" : "secondary"
                        }
                        className="text-[10px] capitalize shrink-0"
                      >
                        {d.state}
                      </Badge>
                    </div>

                    {/* Description */}
                    {d.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {d.description}
                      </p>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-auto pt-2.5">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        {d.tiles.length}{" "}
                        {d.tiles.length === 1 ? "tile" : "tiles"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeAgo(d.updatedAt)}
                      </span>
                    </div>
                  </div>

                  {/* ── Actions footer ──────────────────────────────────── */}
                  <div className="px-4 pb-3 flex items-center gap-1.5 border-t border-border/50 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs flex-1"
                      asChild
                    >
                      <Link href={`/dashboards/${d.id}`}>Open</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs flex-1"
                      asChild
                    >
                      <Link href={`/dashboards/${d.id}?edit=true`}>Edit</Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            window.location.href = `/dashboards/${d.id}`;
                          }}
                        >
                          Open
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            window.location.href = `/dashboards/${d.id}?edit=true`;
                          }}
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => duplicateMutation.mutate(d)}
                        >
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600 focus:bg-red-50"
                          onClick={() => deleteMutation.mutate(d.id)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}

              {/* ── "New Dashboard" ghost card ──────────────────────────── */}
              <button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="bg-card rounded-xl border-2 border-dashed border-border hover:border-primary/30 hover:bg-muted/40 transition-all flex flex-col items-center justify-center gap-2 min-h-[200px] text-muted-foreground hover:text-foreground group"
              >
                <div className="w-10 h-10 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium">New Dashboard</span>
                <span className="text-[10px] text-muted-foreground">
                  Or generate with AI
                </span>
              </button>
            </div>
          </>
        )}
      </div>

      <AIGenerateDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        onCreate={(aiDashboard) =>
          createAIDashboardMutation.mutate(aiDashboard)
        }
      />
    </div>
  );
}
