"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Plus,
  RefreshCw,
  ArrowLeft,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { ChartTile } from "@/components/charts/chart-tile";
import { AITileDialog } from "@/components/dashboards/ai-tile-dialog";
import { EditTileDialog } from "@/components/dashboards/edit-tile-dialog";
import type { Dashboard, DashboardTile, ChartType } from "@/types";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { CHART_TYPES, tileMinHeight } from "@/lib/chart-constants";

// ─── Add-tile dialog ──────────────────────────────────────────────────────────
function AddTileDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdd: (tile: Omit<DashboardTile, "id" | "x" | "y">) => void;
}) {
  const defaultType = CHART_TYPES[1]; // line
  const [title, setTitle] = useState("");
  const [chartType, setChartType] = useState<ChartType>(defaultType.value);
  const [sql, setSql] = useState(defaultType.sqlHint ?? "");

  const selected = CHART_TYPES.find((c) => c.value === chartType)!;

  const handleTypeChange = (v: ChartType) => {
    setChartType(v);
    setSql(CHART_TYPES.find((c) => c.value === v)!.sqlHint ?? "");
  };

  const handleAdd = () => {
    if (!title.trim() || !sql?.trim()) return;
    onAdd({
      title: title.trim(),
      chartType,
      sql: sql?.trim() ?? "",
      w: selected.defaultW ?? 6,
      h: chartType === "kpi" ? 3 : chartType === "table" ? 8 : 5,
    });
    setTitle("");
    setChartType(defaultType.value);
    setSql(defaultType.sqlHint ?? "");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Add Chart Tile</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Type picker */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Chart Type</p>
            <div className="grid grid-cols-7 gap-1.5">
              {CHART_TYPES.map((ct) => {
                const Icon = ct.icon;
                const active = chartType === ct.value;
                return (
                  <button
                    key={ct.value}
                    onClick={() => handleTypeChange(ct.value)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-2.5 rounded-lg text-center transition-all border-0",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted hover:bg-accent text-muted-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[10px] font-medium leading-none">{ct.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">{selected.desc}</p>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs">Title</Label>
            <Input
              placeholder={`e.g. ${chartType === "kpi" ? "Total Users" : chartType === "bar" ? "Orders by Status" : "Daily Revenue"}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          {/* SQL — dark code block */}
          <div className="space-y-1.5">
            <Label className="text-xs">SQL Query</Label>
            <div className="rounded-lg overflow-hidden">
              <div className="bg-[#1c1c1a] px-3 py-1.5 flex items-center gap-2">
                <span className="text-[10px] font-mono text-[#6b5f58] uppercase tracking-wider">SQL</span>
              </div>
              <textarea
                className="w-full h-36 px-4 py-3 font-mono text-[12px] text-[#c4845e] bg-[#1c1c1a] resize-none outline-none placeholder:text-[#4a4744] leading-relaxed"
                value={sql}
                onChange={(e) => setSql(e.target.value)}
                spellCheck={false}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Column 1 → x-axis / label · Columns 2+ → numeric series
            </p>
          </div>

          <Button
            className="w-full"
            onClick={handleAdd}
            disabled={!title.trim() || !sql.trim()}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Tile
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [aiTileOpen, setAiTileOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingTile, setEditingTile] = useState<DashboardTile | null>(null);

  const { data: dashboard, isLoading } = useQuery<Dashboard>({
    queryKey: ["dashboard", id],
    queryFn: () => fetch(`/api/dashboards/${id}`).then((r) => r.json()),
  });

  const saveMutation = useMutation({
    mutationFn: (d: Partial<Dashboard>) =>
      fetch(`/api/dashboards/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(d),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      qc.setQueryData(["dashboard", id], data);
      qc.invalidateQueries({ queryKey: ["dashboards"] });
    },
  });

  const addTile = (partial: Omit<DashboardTile, "id" | "x" | "y">) => {
    if (!dashboard) return;
    const tile: DashboardTile = {
      id: crypto.randomUUID(),
      x: 0,
      y: dashboard.tiles.length * 5,
      ...partial,
    };
    saveMutation.mutate({ tiles: [...dashboard.tiles, tile] });
  };

  const removeTile = (tileId: string) => {
    if (!dashboard) return;
    saveMutation.mutate({
      tiles: dashboard.tiles.filter((t) => t.id !== tileId),
    });
  };

  const addAITile = (tile: { title: string; chartType: ChartType; sql: string; w: number; h: number }) => {
    if (!dashboard) return;
    const newTile: DashboardTile = {
      id: crypto.randomUUID(),
      x: 0,
      y: dashboard.tiles.length * 5,
      ...tile,
    };
    saveMutation.mutate({ tiles: [...dashboard.tiles, newTile] });
  };

  const startEditTile = (tile: DashboardTile) => {
    setEditingTile(tile);
    setEditOpen(true);
  };

  const saveEditedTile = (updatedTile: DashboardTile) => {
    if (!dashboard) return;
    saveMutation.mutate({
      tiles: dashboard.tiles.map((t) => (t.id === updatedTile.id ? updatedTile : t)),
    });
  };

  const refreshAll = () => {
    dashboard?.tiles.forEach((t) => {
      qc.invalidateQueries({ queryKey: ["tile", t.id] });
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading dashboard…</span>
      </div>
    );
  }

  if (!dashboard || (dashboard as unknown as { error?: string }).error) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground text-sm">Dashboard not found.</p>
        <Link
          href="/dashboards"
          className="text-primary text-sm mt-2 inline-block hover:underline"
        >
          ← Back to Dashboards
        </Link>
      </div>
    );
  }

  const kpiTiles = dashboard.tiles.filter((t) => t.chartType === "kpi");
  const otherTiles = dashboard.tiles.filter((t) => t.chartType !== "kpi");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-3.5 bg-background shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
          <Link href="/dashboards">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-tight truncate">
              {dashboard.title}
            </h1>
            <Badge
              variant={dashboard.state === "published" ? "default" : "secondary"}
              className="text-[10px] capitalize shrink-0"
            >
              {dashboard.state}
            </Badge>
          </div>
          {dashboard.description && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {dashboard.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={refreshAll} className="h-8">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => setAiTileOpen(true)}>
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Add AI Tile
          </Button>
          <Button size="sm" className="h-8" onClick={() => setAddOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Tile
          </Button>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-[rgba(28,28,26,0.04)] shrink-0" />

      {/* Tile grid */}
      <div className="flex-1 overflow-auto px-6 pb-8">
        {dashboard.tiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-24">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <BarChart3 className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">No tiles yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add your first chart to start building this dashboard.
              </p>
            </div>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add Tile
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-5">
            {/* KPI row — auto-fit up to 4 columns */}
            {kpiTiles.length > 0 && (
              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(kpiTiles.length, 4)}, 1fr)`,
                }}
              >
                {kpiTiles.map((tile, index) => (
                  <div
                    key={tile.id}
                    style={{ height: tileMinHeight("kpi") }}
                  >
                    <ChartTile tile={tile} onRemove={() => removeTile(tile.id)} onEdit={() => startEditTile(tile)} delay={index * 300} />
                  </div>
                ))}
              </div>
            )}

            {/* Charts / table — 12-column grid */}
            {otherTiles.length > 0 && (
              <div className="grid grid-cols-12 gap-4">
                {otherTiles.map((tile, index) => (
                  <div
                    key={tile.id}
                    style={{
                      gridColumn: `span ${Math.min(tile.w ?? 6, 12)}`,
                      height: tileMinHeight(tile.chartType),
                    }}
                  >
                    <ChartTile tile={tile} onRemove={() => removeTile(tile.id)} onEdit={() => startEditTile(tile)} delay={(kpiTiles.length + index) * 300} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <AddTileDialog open={addOpen} onOpenChange={setAddOpen} onAdd={addTile} />
      <AITileDialog open={aiTileOpen} onOpenChange={setAiTileOpen} onAdd={addAITile} />
      <EditTileDialog key={editingTile?.id ?? "none"} tile={editingTile} open={editOpen} onOpenChange={setEditOpen} onSave={saveEditedTile} />
    </div>
  );
}
