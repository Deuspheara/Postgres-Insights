"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Plus, Trash2, Clock, Layers, Sparkles } from "lucide-react";
import type { Dashboard, AIDashboardResponse } from "@/types";
import Link from "next/link";
import { useState } from "react";
import { AIGenerateDialog } from "@/components/dashboards/ai-generate-dialog";
import { timeAgo } from "@/lib/utils";
import { useActiveConnectionId } from "@/components/active-connection-provider";

export default function DashboardsPage() {
  const qc = useQueryClient();
  const connectionId = useActiveConnectionId();
  const [aiDialogOpen, setAiDialogOpen] = useState(false);

  const { data: dashboards = [], isLoading } = useQuery<Dashboard[]>({
    queryKey: ["dashboards", connectionId],
    queryFn: () => fetch("/api/dashboards").then((r) => r.json()),
    enabled: !!connectionId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/dashboards/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboards", connectionId] }),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      fetch("/api/dashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Dashboard", tiles: [], connectionId }),
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

  return (
    <div className="h-full overflow-auto">
      {/* Page header */}
      <div className="px-8 pt-7 pb-5">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-1.5">
          Visual Summaries
        </p>
        <div className="flex items-end justify-between gap-4">
          <h1 className="text-[32px] font-bold tracking-tight leading-none">Dashboards</h1>
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

      <div className="px-8 pb-8">
        {isLoading && (
          <div className="text-muted-foreground text-sm py-12 text-center">Loading…</div>
        )}

        {!isLoading && dashboards.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <BarChart3 className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="font-semibold text-base">No dashboards yet</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Generate one from{" "}
              <Link href="/insights" className="text-primary hover:underline">
                AI Insights
              </Link>{" "}
              or use the AI generator.
            </p>
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setAiDialogOpen(true)}
              >
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

        {dashboards.length > 0 && (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {dashboards.map((d) => (
              <div
                key={d.id}
                className="group bg-card rounded-xl shadow-[0_4px_20px_-2px_rgba(28,28,26,0.06)] hover:shadow-[0_6px_24px_-2px_rgba(138,75,49,0.1)] transition-shadow overflow-hidden"
              >
                {/* Thumbnail strip — warm gradient placeholder */}
                <Link href={`/dashboards/${d.id}`}>
                  <div className="h-28 bg-gradient-to-br from-[#f6f3f0] to-[#ede0d9] flex items-center justify-center relative overflow-hidden">
                    {/* Mini tile grid preview */}
                    <div className="grid grid-cols-3 gap-1.5 p-3 w-full h-full">
                      {Array.from({ length: Math.min(d.tiles.length || 3, 6) }).map(
                        (_, i) => (
                          <div
                            key={i}
                            className="rounded bg-white/60 shadow-[0_1px_3px_rgba(28,28,26,0.08)]"
                            style={{ opacity: 0.5 + i * 0.08 }}
                          />
                        )
                      )}
                    </div>
                    {d.tiles.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <BarChart3 className="w-8 h-8 text-[#c4845e]/40" />
                      </div>
                    )}
                  </div>
                </Link>

                {/* Info */}
                <div className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/dashboards/${d.id}`}>
                        <p className="text-sm font-semibold text-foreground truncate hover:text-primary transition-colors">
                          {d.title}
                        </p>
                      </Link>
                      {d.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {d.description}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant={d.state === "published" ? "default" : "secondary"}
                      className="text-[10px] capitalize shrink-0"
                    >
                      {d.state}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        {d.tiles.length} {d.tiles.length === 1 ? "tile" : "tiles"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeAgo(d.updatedAt)}
                      </span>
                    </div>

                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500"
                      onClick={() => deleteMutation.mutate(d.id)}
                      disabled={deleteMutation.isPending}
                      title="Delete dashboard"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* "New Dashboard" ghost card */}
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="bg-card rounded-xl border-2 border-dashed border-[rgba(28,28,26,0.1)] hover:border-primary/30 hover:bg-muted/40 transition-all flex flex-col items-center justify-center gap-2 min-h-[180px] text-muted-foreground hover:text-foreground group"
            >
              <div className="w-10 h-10 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium">New Dashboard</span>
            </button>
          </div>
        )}
      </div>

      <AIGenerateDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        onCreate={(aiDashboard) => createAIDashboardMutation.mutate(aiDashboard)}
      />
    </div>
  );
}
