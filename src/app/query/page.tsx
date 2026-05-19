"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ObjectViewer } from "@/components/ui/object-viewer";
import { DestructionPreview } from "@/components/destructive/destruction-preview";
import { Play, Save, Sparkles, Clock, AlertTriangle, BookOpen, Trash2, Shield, CheckCircle2, XCircle, Search } from "lucide-react";
import type { QueryResult, SavedQuery, DestructiveQueryPlan, DestructiveExecutionResult, QueryHistoryEntry } from "@/types";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useActiveConnectionId } from "@/components/active-connection-provider";
import { timeAgo } from "@/lib/utils";

function QueryPageInner() {
  const searchParams = useSearchParams();
  const connectionId = useActiveConnectionId();
  const tableParam = searchParams.get("table");
  const sqlParam = searchParams.get("sql");
  const defaultSql = sqlParam || (tableParam ? `SELECT *\nFROM ${tableParam}\nLIMIT 100;` : "SELECT * FROM ");

  const [sql, setSql] = useState(defaultSql);
  const [aiPrompt, setAiPrompt] = useState("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [aiMode, setAiMode] = useState<"select" | "destructive">("select");
  const [destructivePlan, setDestructivePlan] = useState<DestructiveQueryPlan | null>(null);
  const [executionResult, setExecutionResult] = useState<DestructiveExecutionResult | null>(null);
  const [sidebarTab, setSidebarTab] = useState("saved");
  const [historyFilter, setHistoryFilter] = useState("");
  const qc = useQueryClient();

  const { data: savedQueries } = useQuery<SavedQuery[]>({
    queryKey: ["saved-queries", connectionId],
    queryFn: () => fetch("/api/saved-queries").then((r) => r.json()),
    enabled: !!connectionId,
  });

  const runMutation = useMutation<QueryResult, Error, string>({
    mutationFn: (s: string) =>
      fetch("/api/query/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: s }),
      }).then((r) => r.json()),
    onSuccess: (data, variables) => {
      if (connectionId) {
        historyMutation.mutate({
          sql: variables,
          durationMs: data.durationMs,
          rowCount: data.rowCount,
          error: data.error,
        });
      }
    },
  });

  const explainMutation = useMutation({
    mutationFn: (s: string) =>
      fetch("/api/query/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: s }),
      }).then((r) => r.json()),
  });

  const aiSqlMutation = useMutation({
    mutationFn: (prompt: string) =>
      fetch("/api/ai/sql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      }).then((r) => r.json()) as Promise<{ sql: string; explanation: string; error?: string }>,
    onSuccess: (data) => {
      if (data.sql) setSql(data.sql);
    },
  });

  const aiDestructiveMutation = useMutation({
    mutationFn: (prompt: string) =>
      fetch("/api/ai/destructive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      }).then((r) => r.json()) as Promise<{ plan: DestructiveQueryPlan; explanation: string; error?: string }>,
    onSuccess: (data) => {
      if (data.plan) setDestructivePlan(data.plan);
    },
  });

  const saveMutation = useMutation({
    mutationFn: (name: string) =>
      fetch("/api/saved-queries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, sql }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved-queries", connectionId] });
      setSaveDialogOpen(false);
      setSaveName("");
    },
  });

  const { data: history } = useQuery<QueryHistoryEntry[]>({
    queryKey: ["query-history", connectionId],
    queryFn: () => fetch("/api/query-history").then((r) => r.json()),
    enabled: !!connectionId,
  });

  const historyMutation = useMutation({
    mutationFn: (entry: { sql: string; durationMs: number; rowCount: number; error?: string }) =>
      fetch("/api/query-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["query-history", connectionId] });
    },
  });

  const clearHistoryMutation = useMutation({
    mutationFn: () => fetch("/api/query-history", { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["query-history", connectionId] });
    },
  });

  const result = runMutation.data;

  const handleGenerate = () => {
    if (!aiPrompt.trim()) return;
    if (aiMode === "select") {
      aiSqlMutation.mutate(aiPrompt);
    } else {
      aiDestructiveMutation.mutate(aiPrompt);
    }
  };

  const handleExecuteComplete = (result: DestructiveExecutionResult) => {
    setExecutionResult(result);
    setDestructivePlan(null);
  };

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden">
      {/* Sidebar: saved queries + history */}
      <Tabs value={sidebarTab} onValueChange={setSidebarTab} className="w-64 border-r flex flex-col">
        <div className="p-2 border-b">
          <TabsList className="w-full">
            <TabsTrigger value="saved" className="text-xs flex-1"><BookOpen className="w-3 h-3 mr-1" />Saved</TabsTrigger>
            <TabsTrigger value="history" className="text-xs flex-1"><Clock className="w-3 h-3 mr-1" />History</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="saved" className="flex-1 flex flex-col data-[state=inactive]:hidden">
          <ScrollArea className="flex-1">
            {(!savedQueries || savedQueries.length === 0) ? (
              <p className="p-3 text-xs text-muted-foreground">No saved queries yet.</p>
            ) : (
              <div className="py-1">
                {savedQueries.map((q) => (
                  <button
                    key={q.id}
                    className="w-full text-left px-3 py-2 hover:bg-accent text-xs truncate"
                    onClick={() => setSql(q.sql)}
                  >
                    <BookOpen className="inline w-3 h-3 mr-1.5 text-muted-foreground" />
                    {q.name}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="history" className="flex-1 flex flex-col data-[state=inactive]:hidden">
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input
                className="h-7 text-xs pl-7"
                placeholder="Filter history..."
                value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value)}
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            {(!history || history.length === 0) ? (
              <p className="p-3 text-xs text-muted-foreground">No history yet.</p>
            ) : (
              <div className="py-1">
                {(historyFilter
                  ? history.filter((e) => e.sql.toLowerCase().includes(historyFilter.toLowerCase()))
                  : history
                ).map((entry) => {
                  const durationBadge =
                    entry.durationMs < 100
                      ? "text-green-600"
                      : entry.durationMs < 1000
                      ? "text-yellow-600"
                      : "text-red-600";
                  return (
                    <button
                      key={entry.id}
                      className="w-full text-left px-3 py-2 hover:bg-accent text-xs group"
                      onClick={() => setSql(entry.sql)}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="truncate font-mono">{entry.sql.slice(0, 60)}{entry.sql.length > 60 ? "…" : ""}</span>
                        <button
                          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Re-run"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSql(entry.sql);
                            setTimeout(() => runMutation.mutate(entry.sql), 0);
                          }}
                        >
                          <Play className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                        <span>{timeAgo(entry.executedAt)}</span>
                        <span className={durationBadge}>{entry.durationMs}ms</span>
                        <span>{entry.rowCount.toLocaleString()} rows</span>
                        {entry.error && (
                          <span className="text-red-500 truncate">{entry.error}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
          {history && history.length > 0 && (
            <div className="p-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-destructive"
                onClick={() => clearHistoryMutation.mutate()}
                disabled={clearHistoryMutation.isPending}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Clear history
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Main area */}
      <div className="flex-1 flex flex-col">
        {/* AI prompt bar */}
        <div className="border-b px-4 py-2 flex items-center gap-2 bg-muted/30">
          <Tabs value={aiMode} onValueChange={(v) => setAiMode(v as "select" | "destructive")} className="flex items-center gap-2">
            <TabsList className="h-7">
              <TabsTrigger value="select" className="text-xs px-2 py-1">
                <Sparkles className="w-3 h-3 mr-1" />
                SELECT
              </TabsTrigger>
              <TabsTrigger value="destructive" className="text-xs px-2 py-1">
                <Trash2 className="w-3 h-3 mr-1" />
                DELETE
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          {aiMode === "select" ? (
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
          ) : (
            <Shield className="w-4 h-4 text-red-500 shrink-0" />
          )}
          
          <Input
            className="h-8 text-xs flex-1"
            placeholder={aiMode === "select" 
              ? "Ask AI: 'Show me top 10 customers by revenue this month'"
              : "Ask AI: 'Delete users with emails test@test.com and admin@test.com'"
            }
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && aiPrompt.trim()) {
                handleGenerate();
              }
            }}
          />
          <Button
            size="sm"
            variant={aiMode === "destructive" ? "destructive" : "secondary"}
            className="h-8 text-xs"
            disabled={Boolean(!aiPrompt.trim() || aiSqlMutation.isPending || aiDestructiveMutation.isPending)}
            onClick={handleGenerate}
          >
            {aiMode === "destructive" ? "Generate Plan" : "Generate"}
          </Button>
          {aiSqlMutation.data?.explanation && aiMode === "select" && (
            <span className="text-xs text-muted-foreground truncate max-w-48">
              {aiSqlMutation.data.explanation}
            </span>
          )}
          {aiDestructiveMutation.data?.explanation && aiMode === "destructive" && (
            <span className="text-xs text-red-600 truncate max-w-48">
              {aiDestructiveMutation.data.explanation}
            </span>
          )}
        </div>

        {/* SQL editor */}
        <div className="border-b relative">
          <textarea
            className="w-full h-40 p-4 font-mono text-sm bg-background resize-none outline-none"
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            spellCheck={false}
            placeholder="-- Write your SQL here\nSELECT * FROM ..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                runMutation.mutate(sql);
              }
            }}
          />
          <div className="absolute bottom-2 right-3 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">⌘↵ to run</span>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b">
          <Button
            size="sm"
            onClick={() => runMutation.mutate(sql)}
            disabled={runMutation.isPending || !sql.trim()}
          >
            <Play className="w-3.5 h-3.5 mr-1.5" />
            {runMutation.isPending ? "Running..." : "Run"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => explainMutation.mutate(sql)}
            disabled={explainMutation.isPending || !sql.trim()}
          >
            Explain
          </Button>

          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Save className="w-3.5 h-3.5 mr-1.5" />
                Save
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Query</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label>Query name</Label>
                  <Input
                    placeholder="e.g. Top customers by revenue"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => saveMutation.mutate(saveName)}
                  disabled={!saveName.trim() || saveMutation.isPending}
                >
                  Save Query
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {result && (
            <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {result.durationMs}ms
              </span>
              <span>{result.rowCount.toLocaleString()} rows</span>
              {result.truncated && (
                <Badge variant="secondary" className="text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  truncated
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-auto">
          {result?.error && (
            <div className="p-4 text-sm text-red-600 bg-red-50 border-b">
              <AlertTriangle className="inline w-4 h-4 mr-1.5" />
              {result.error}
            </div>
          )}

          {explainMutation.data?.plan && (
            <div className="p-4 border-b">
              <p className="text-xs font-medium text-muted-foreground mb-2">Query Plan</p>
              <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-48">
                {JSON.stringify(explainMutation.data.plan, null, 2)}
              </pre>
            </div>
          )}

          {result && !result.error && result.rows.length > 0 && (
            <div className="overflow-auto">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 bg-muted/90 backdrop-blur">
                  <tr>
                    {result.fields.map((f) => (
                      <th key={f.name} className="text-left px-3 py-2 font-mono font-medium border-b whitespace-nowrap">
                        {f.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, i) => (
                    <tr key={i} className="border-b hover:bg-muted/30">
                       {result.fields.map((f) => {
                        const cellValue = row[f.name];
                        return (
                          <td key={f.name} className="px-3 py-1.5 font-mono whitespace-nowrap max-w-xs">
                            {cellValue === null ? (
                              <span className="text-muted-foreground italic">NULL</span>
                            ) : typeof cellValue === "object" ? (
                              <ObjectViewer value={cellValue} />
                            ) : (
                              <span className="truncate block">{String(cellValue)}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result && !result.error && result.rows.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Query returned 0 rows
            </div>
          )}
        </div>
      </div>

      {/* Destructive plan preview dialog */}
      {destructivePlan && (
        <DestructionPreview
          plan={destructivePlan}
          onClose={() => setDestructivePlan(null)}
          onExecuteComplete={handleExecuteComplete}
        />
      )}

      {/* Execution result dialog */}
      {executionResult && (
        <Dialog open onOpenChange={() => setExecutionResult(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {executionResult.success ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    Execution Successful
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-600" />
                    Execution Failed
                  </>
                )}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded">
                  <div className="text-2xl font-bold">{executionResult.steps.length}</div>
                  <div className="text-xs text-muted-foreground">Steps Executed</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded">
                  <div className="text-2xl font-bold">{executionResult.totalDurationMs}ms</div>
                  <div className="text-xs text-muted-foreground">Total Duration</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded">
                  <div className="text-2xl font-bold">
                    {executionResult.committed ? "Yes" : executionResult.rolledBack ? "Rolled Back" : "No"}
                  </div>
                  <div className="text-xs text-muted-foreground">Committed</div>
                </div>
              </div>
              
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {executionResult.steps.map((step, idx) => (
                    <div key={idx} className={`p-3 rounded border ${step.success ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {step.success ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          <Badge variant={step.type === "deletion" ? "destructive" : "default"} className="text-xs">
                            {step.type.toUpperCase()}
                          </Badge>
                          <span className="text-xs font-mono">Step {step.order}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{step.durationMs}ms</span>
                      </div>
                      <pre className="text-xs font-mono mt-2 bg-muted p-2 rounded overflow-x-auto">
                        {step.sql}
                      </pre>
                      {step.rowsAffected !== undefined && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {step.rowsAffected} row(s) affected
                        </div>
                      )}
                      {step.error && (
                        <div className="text-xs text-red-600 mt-1">
                          Error: {step.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default function QueryPage() {
  return (
    <Suspense>
      <QueryPageInner />
    </Suspense>
  );
}
