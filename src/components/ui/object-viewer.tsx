"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, ChevronRight, ChevronDown, Maximize2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ObjectViewerProps {
  value: unknown;
  maxDepth?: number;
}

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

function isArray(val: unknown): val is unknown[] {
  return Array.isArray(val);
}

function formatValue(val: unknown): string {
  if (val === null) return "null";
  if (val === undefined) return "undefined";
  if (typeof val === "string") return `"${val}"`;
  if (typeof val === "boolean") return val ? "true" : "false";
  return String(val);
}

function JsonTree({ data, depth = 0, maxDepth = 3 }: { data: unknown; depth?: number; maxDepth?: number }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (depth > maxDepth) {
    return <span className="text-muted-foreground italic">...</span>;
  }

  if (isObject(data)) {
    const entries = Object.entries(data);
    if (entries.length === 0) return <span className="text-muted-foreground">{"{}"}</span>;

    return (
      <div className="font-mono text-xs">
        <span className="text-muted-foreground">{"{"}</span>
        {entries.map(([key, val], idx) => {
          const nodeKey = `${depth}-${key}`;
          const isExpandable = isObject(val) || isArray(val);
          const isExp = expanded[nodeKey];

          return (
            <div key={key} className="ml-4">
              <div className="flex items-center gap-1 py-0.5">
                {isExpandable ? (
                  <button
                    onClick={() => toggle(nodeKey)}
                    className="flex items-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isExp ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>
                ) : (
                  <span className="w-4" />
                )}
                <span className="text-blue-600 dark:text-blue-400">{key}</span>
                <span className="text-muted-foreground">:</span>
                {!isExpandable && <span className="text-green-600 dark:text-green-400">{formatValue(val)}</span>}
              </div>
              {isExpandable && isExp && (
                <div className="ml-2 border-l border-muted pl-2">
                  <JsonTree data={val} depth={depth + 1} maxDepth={maxDepth} />
                </div>
              )}
            </div>
          );
        })}
        <span className="text-muted-foreground">{"}"}</span>
      </div>
    );
  }

  if (isArray(data)) {
    if (data.length === 0) return <span className="text-muted-foreground">[]</span>;

    return (
      <div className="font-mono text-xs">
        <span className="text-muted-foreground">[</span>
        {data.map((item, idx) => {
          const nodeKey = `${depth}-[${idx}]`;
          const isExpandable = isObject(item) || isArray(item);
          const isExp = expanded[nodeKey];

          return (
            <div key={idx} className="ml-4">
              <div className="flex items-center gap-1 py-0.5">
                {isExpandable ? (
                  <button
                    onClick={() => toggle(nodeKey)}
                    className="flex items-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isExp ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>
                ) : (
                  <span className="w-4" />
                )}
                <span className="text-muted-foreground">[{idx}]:</span>
                {!isExpandable && <span className="text-green-600 dark:text-green-400">{formatValue(item)}</span>}
              </div>
              {isExpandable && isExp && (
                <div className="ml-2 border-l border-muted pl-2">
                  <JsonTree data={item} depth={depth + 1} maxDepth={maxDepth} />
                </div>
              )}
            </div>
          );
        })}
        <span className="text-muted-foreground">]</span>
      </div>
    );
  }

  return <span className="text-green-600 dark:text-green-400">{formatValue(data)}</span>;
}

export function ObjectViewer({ value, maxDepth = 3 }: ObjectViewerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic">NULL</span>;
  }

  if (typeof value !== "object") {
    return <span>{String(value)}</span>;
  }

  const jsonString = JSON.stringify(value, null, 2);
  const preview = JSON.stringify(value).slice(0, 50);
  const isLong = jsonString.length > 50;

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <button className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted/50 hover:bg-muted text-xs font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
            <span>{isLong ? `${preview}...` : jsonString}</span>
            <Maximize2 className="w-3 h-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <span className="text-xs font-medium">Object Value</span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => navigator.clipboard.writeText(jsonString)}
              >
                <Copy className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setDialogOpen(true)}
              >
                <Maximize2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <ScrollArea className="max-h-[300px]">
            <div className="p-3">
              <JsonTree data={value} maxDepth={maxDepth} />
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Object Value</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2 -mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigator.clipboard.writeText(jsonString)}
            >
              <Copy className="w-3 h-3 mr-1" />
              Copy JSON
            </Button>
          </div>
          <ScrollArea className="max-h-[60vh] mt-2">
            <div className="p-4 bg-muted rounded-md">
              <JsonTree data={value} maxDepth={10} />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
