"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  BarChart3,
  Hash,
  TrendingUp,
  PieChart,
  Table2,
  Loader2,
  Edit2,
  Check,
  X,
} from "lucide-react";
import type { AIDashboardResponse, ChartType } from "@/types";
import { cn } from "@/lib/utils";
import { DASHBOARD_TEMPLATES } from "@/lib/dashboard-templates";

const CHART_TYPE_ICONS: Record<ChartType, React.ElementType> = {
  kpi: Hash,
  line: TrendingUp,
  bar: BarChart3,
  area: TrendingUp,
  "stacked-bar": BarChart3,
  "stacked-area": TrendingUp,
  donut: PieChart,
  pie: PieChart,
  table: Table2,
  histogram: BarChart3,
  scatter: BarChart3,
};

interface AIGenerateDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (dashboard: AIDashboardResponse) => void;
}

export function AIGenerateDialog({ open, onOpenChange, onCreate }: AIGenerateDialogProps) {
  const [prompt, setPrompt] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<AIDashboardResponse | null>(null);
  const [editingTile, setEditingTile] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSql, setEditSql] = useState("");

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = DASHBOARD_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setPrompt(template.description);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    setError(null);
    setPreview(null);

    try {
      const res = await fetch("/api/ai/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate dashboard");
      }

      const data = await res.json() as AIDashboardResponse;
      setPreview(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    if (preview) {
      onCreate(preview);
      setPreview(null);
      setPrompt("");
      onOpenChange(false);
    }
  };

  const handleEditTile = (index: number) => {
    if (!preview) return;
    setEditingTile(index);
    setEditTitle(preview.tiles[index].title);
    setEditSql(preview.tiles[index].sql);
  };

  const handleSaveTile = () => {
    if (!preview || editingTile === null) return;
    const updated = { ...preview };
    updated.tiles = updated.tiles.map((tile, i) =>
      i === editingTile ? { ...tile, title: editTitle, sql: editSql } : tile
    );
    setPreview(updated);
    setEditingTile(null);
  };

  const handleCancelEdit = () => {
    setEditingTile(null);
  };

  const handleClose = () => {
    setPreview(null);
    setPrompt("");
    setError(null);
    setEditingTile(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#8a4b31]" />
            Generate AI Dashboard
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto pt-2">
          {!preview && !loading && (
            <div className="space-y-4">
              {/* Template selector */}
              <div className="space-y-2">
                <Label className="text-sm">Quick Templates</Label>
                <div className="grid grid-cols-2 gap-2">
                  {DASHBOARD_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template.id)}
                      className={cn(
                        "p-3 rounded-lg border text-left transition-all",
                        selectedTemplate === template.id
                          ? "border-[#8a4b31] bg-[#fdf8f4]"
                          : "border-[rgba(28,28,26,0.08)] hover:border-[#8a4b31]/30"
                      )}
                    >
                      <p className="text-sm font-semibold text-[#1c1c1a]">{template.name}</p>
                      <p className="text-[10px] text-[#8b7d76] mt-0.5">{template.category}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Describe your dashboard</Label>
                <Textarea
                  placeholder="e.g., Sales overview with revenue trends, top products, and monthly comparisons"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[120px] text-sm"
                />
              </div>

              <div className="bg-[#fdf8f4] rounded-lg p-4 text-sm text-[#6b5f58]">
                <p className="font-semibold mb-1">Tips for better results:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Be specific about the metrics you want to track</li>
                  <li>Mention time periods (daily, weekly, monthly)</li>
                  <li>Include comparison dimensions (by category, region, etc.)</li>
                </ul>
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
                    Generate Dashboard
                  </>
                )}
              </Button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#f5ede8] flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-[#8a4b31] animate-pulse" />
              </div>
              <div className="text-center">
                <p className="font-medium text-[#1c1c1a]">Analyzing your database...</p>
                <p className="text-sm text-[#8b7d76] mt-1">Generating optimal charts for your request</p>
              </div>
            </div>
          )}

          {preview && (
            <div className="space-y-4">
              {/* Dashboard preview header */}
              <div className="bg-white rounded-lg border border-[rgba(28,28,26,0.06)] p-4">
                <h3 className="font-semibold text-[#1c1c1a] text-lg">{preview.title}</h3>
                {preview.description && (
                  <p className="text-sm text-[#8b7d76] mt-1">{preview.description}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {preview.tiles.length} tiles
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {Math.round(preview.confidence * 100)}% confidence
                  </Badge>
                </div>
              </div>

              {/* Tile preview grid */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[#8b7d76] uppercase tracking-wider">Preview Tiles</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {preview.tiles.map((tile, index) => {
                    const Icon = CHART_TYPE_ICONS[tile.chartType] || BarChart3;
                    const isEditing = editingTile === index;

                    return (
                      <div
                        key={index}
                        className="bg-white rounded-lg border border-[rgba(28,28,26,0.06)] p-4 relative group"
                      >
                        {isEditing ? (
                          <div className="space-y-3">
                            <div>
                              <Label className="text-xs">Title</Label>
                              <Input
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="h-8 text-sm mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">SQL</Label>
                              <Textarea
                                value={editSql}
                                onChange={(e) => setEditSql(e.target.value)}
                                className="min-h-[80px] text-xs font-mono mt-1"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={handleSaveTile} className="h-7">
                                <Check className="w-3 h-3 mr-1" />
                                Save
                              </Button>
                              <Button size="sm" variant="outline" onClick={handleCancelEdit} className="h-7">
                                <X className="w-3 h-3 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-[#f0ece8] flex items-center justify-center shrink-0">
                                  <Icon className="w-4 h-4 text-[#8a4b31]" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-[#1c1c1a]">{tile.title}</p>
                                  <p className="text-[10px] text-[#8b7d76] uppercase tracking-wider mt-0.5">
                                    {tile.chartType}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleEditTile(index)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-[#f0ece8] text-[#8b7d76]"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="mt-3 bg-[#1c1c1a] rounded-lg p-2.5 overflow-x-auto">
                              <pre className="text-[10px] font-mono text-[#c4845e] whitespace-pre-wrap leading-relaxed">
                                {tile.sql.slice(0, 120)}{tile.sql.length > 120 ? "..." : ""}
                              </pre>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={handleClose}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleCreate}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Create Dashboard
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
