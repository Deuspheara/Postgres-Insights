"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { DashboardTile, ChartType } from "@/types";
import { cn } from "@/lib/utils";
import { CHART_TYPES } from "@/lib/chart-constants";

interface EditTileDialogProps {
  tile: DashboardTile | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (tile: DashboardTile) => void;
}

export function EditTileDialog({ tile, open, onOpenChange, onSave }: EditTileDialogProps) {
  const [title, setTitle] = useState(tile?.title ?? "");
  const [chartType, setChartType] = useState<ChartType>(tile?.chartType ?? "bar");
  const [sql, setSql] = useState(tile?.sql ?? "");

  const handleOpenChange = (v: boolean) => {
    if (v && tile) {
      setTitle(tile.title);
      setChartType(tile.chartType);
      setSql(tile.sql);
    }
    onOpenChange(v);
  };

  const handleSave = () => {
    if (!tile || !title.trim() || !sql.trim()) return;
    onSave({
      ...tile,
      title: title.trim(),
      chartType,
      sql: sql.trim(),
    });
    onOpenChange(false);
  };

  if (!tile) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Edit Tile</DialogTitle>
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
                    onClick={() => setChartType(ct.value)}
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
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          {/* SQL */}
          <div className="space-y-1.5">
            <Label className="text-xs">SQL Query</Label>
            <div className="rounded-lg overflow-hidden">
              <div className="bg-zinc-900 px-3 py-1.5 flex items-center gap-2">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">SQL</span>
              </div>
              <textarea
                className="w-full h-48 px-4 py-3 font-mono text-[12px] text-primary/70 bg-zinc-900 resize-none outline-none placeholder:text-muted-foreground/50 leading-relaxed"
                value={sql}
                onChange={(e) => setSql(e.target.value)}
                spellCheck={false}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Column 1 → x-axis / label · Columns 2+ → numeric series
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={!title.trim() || !sql.trim()}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
