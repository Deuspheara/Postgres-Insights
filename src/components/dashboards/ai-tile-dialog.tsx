"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  BarChart3,
  Hash,
  TrendingUp,
  PieChart,
  Table2,
  Loader2,
} from "lucide-react";
import type { AITileResponse, ChartType } from "@/types";

const CHART_TYPES: { value: ChartType; label: string; icon: React.ElementType; desc: string }[] = [
  { value: "kpi", label: "KPI", icon: Hash, desc: "Single metric" },
  { value: "line", label: "Line", icon: TrendingUp, desc: "Trend over time" },
  { value: "bar", label: "Bar", icon: BarChart3, desc: "Category comparison" },
  { value: "area", label: "Area", icon: TrendingUp, desc: "Volume over time" },
  { value: "stacked-bar", label: "Stacked", icon: BarChart3, desc: "Multi-series bars" },
  { value: "donut", label: "Donut", icon: PieChart, desc: "Part-to-whole" },
  { value: "table", label: "Table", icon: Table2, desc: "Raw data grid" },
];

interface AITileDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdd: (tile: { title: string; chartType: ChartType; sql: string; w: number; h: number }) => void;
}

export function AITileDialog({ open, onOpenChange, onAdd }: AITileDialogProps) {
  const [prompt, setPrompt] = useState("");
  const [chartType, setChartType] = useState<ChartType | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AITileResponse | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSql, setEditSql] = useState("");

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/ai/tile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: prompt.trim(),
          suggestedChartType: chartType 
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate tile");
      }

      const data = await res.json() as AITileResponse;
      setResult(data);
      setEditTitle(data.title);
      setEditSql(data.sql);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (!result) return;
    
    onAdd({
      title: editTitle || result.title,
      chartType: result.chartType,
      sql: editSql || result.sql,
      w: result.chartType === "kpi" ? 3 : result.chartType === "table" ? 12 : 6,
      h: result.chartType === "kpi" ? 3 : result.chartType === "table" ? 8 : 5,
    });
    
    setResult(null);
    setPrompt("");
    setChartType(undefined);
    onOpenChange(false);
  };

  const handleClose = () => {
    setResult(null);
    setPrompt("");
    setChartType(undefined);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#8a4b31]" />
            Add AI Tile
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {!result && !loading && (
            <>
              <div className="space-y-2">
                <Label className="text-sm">Describe the chart you want</Label>
                <Textarea
                  placeholder="e.g., Monthly revenue trend for the last 12 months"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[80px] text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Chart Type (optional)</Label>
                <Select
                  value={chartType}
                  onValueChange={(v) => setChartType(v as ChartType)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Auto-detect" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-detect</SelectItem>
                    {CHART_TYPES.map((ct) => {
                      const Icon = ct.icon;
                      return (
                        <SelectItem key={ct.value} value={ct.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="w-3.5 h-3.5" />
                            {ct.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleGenerate}
                disabled={!prompt.trim() || loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate SQL
                  </>
                )}
              </Button>
            </>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#f5ede8] flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-[#8a4b31] animate-pulse" />
              </div>
              <div className="text-center">
                <p className="font-medium text-[#1c1c1a]">Generating SQL...</p>
                <p className="text-sm text-[#8b7d76] mt-1">Analyzing schema for optimal query</p>
              </div>
            </div>
          )}

          {result && (
            <>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Title</Label>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">SQL Query</Label>
                  <div className="rounded-lg overflow-hidden">
                    <div className="bg-[#1c1c1a] px-3 py-1.5 flex items-center gap-2">
                      <span className="text-[10px] font-mono text-[#6b5f58] uppercase tracking-wider">SQL</span>
                      <span className="text-[10px] text-[#8b7d76] ml-auto">{result.chartType}</span>
                    </div>
                    <Textarea
                      value={editSql}
                      onChange={(e) => setEditSql(e.target.value)}
                      className="h-32 font-mono text-[12px] text-[#c4845e] bg-[#1c1c1a] resize-none outline-none placeholder:text-[#4a4744] leading-relaxed rounded-none border-0"
                    />
                  </div>
                </div>

                {result.explanation && (
                  <div className="bg-[#fdf8f4] rounded-lg p-3 text-sm text-[#6b5f58]">
                    <p className="font-semibold mb-1">Explanation:</p>
                    <p>{result.explanation}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={handleClose}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleAdd}>
                  Add Tile
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
