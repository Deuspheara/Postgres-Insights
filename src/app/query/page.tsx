"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { DestructionPreview } from "@/components/destructive/destruction-preview";
import { QueryResultsTable } from "@/components/query/query-results-table";
import {
  Play,
  Save,
  Sparkles,
  Clock,
  AlertTriangle,
  BookOpen,
  Trash2,
  Shield,
  CheckCircle2,
  XCircle,
  Search,
  Copy,
  FileText,
  Wand2,
  PencilLine,
} from "lucide-react";
import type {
  QueryResult,
  SavedQuery,
  DestructiveQueryPlan,
  DestructiveExecutionResult,
  QueryHistoryEntry,
} from "@/types";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useActiveConnectionId } from "@/components/active-connection-provider";
import { timeAgo } from "@/lib/utils";

function formatSQL(sql: string): string {
  const keywords = [
    "SELECT",
    "FROM",
    "WHERE",
    "AND",
    "OR",
    "ORDER BY",
    "GROUP BY",
    "HAVING",
    "LIMIT",
    "OFFSET",
    "JOIN",
    "LEFT JOIN",
    "RIGHT JOIN",
    "INNER JOIN",
    "ON",
    "INSERT INTO",
    "VALUES",
    "UPDATE",
    "SET",
    "DELETE FROM",
    "CREATE",
    "ALTER",
    "DROP",
    "UNION",
    "INTERSECT",
    "EXCEPT",
  ];
  let formatted = sql;
  for (const kw of keywords) {
    formatted = formatted.replace(new RegExp(`\\b${kw}\\b`, "gi"), `\n${kw}`);
  }
  return formatted.trim();
}

function QueryPageInner() {
  const searchParams = useSearchParams();
  const connectionId = useActiveConnectionId();
  const tableParam = searchParams.get("table");
  const sqlParam = searchParams.get("sql");
  const defaultSql =
    sqlParam ||
    (tableParam
      ? `SELECT *\nFROM ${tableParam}\nLIMIT 100;`
      : "SELECT * FROM ");

  const [sql, setSql] = useState(defaultSql);
  const [aiPrompt, setAiPrompt] = useState("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [aiMode, setAiMode] = useState<"select" | "update" | "delete">("select");
  const [destructivePlan, setDestructivePlan] =
    useState<DestructiveQueryPlan | null>(null);
  const [executionResult, setExecutionResult] =
    useState<DestructiveExecutionResult | null>(null);
  const [sidebarTab, setSidebarTab] = useState("saved");
  const [historyFilter, setHistoryFilter] = useState("");
  const [showAiSheet, setShowAiSheet] = useState(false);
  const [generatedSqlDraft, setGeneratedSqlDraft] = useState<{
    sql: string;
    explanation: string;
    mode: "select" | "update";
  } | null>(null);
  const [lastExecutedSql, setLastExecutedSql] = useState("");
  const [resultTab, setResultTab] = useState("results");
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
    onMutate: (submittedSql) => {
      setLastExecutedSql(submittedSql);
      setResultTab("results");
    },
    onSuccess: (data, variables) => {
      setResultTab(data.error ? "errors" : "results");
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
    onMutate: () => {
      setResultTab("explain");
    },
    onSuccess: () => {
      setResultTab("explain");
    },
  });

  const aiSqlMutation = useMutation({
    mutationFn: (prompt: string) =>
      fetch("/api/ai/sql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      }).then((r) => r.json()) as Promise<{
        sql: string;
        explanation: string;
        error?: string;
      }>,
    onSuccess: (data) => {
      if (data.sql) {
        setGeneratedSqlDraft({
          sql: data.sql,
          explanation: data.explanation,
          mode: "select",
        });
      }
    },
  });

  const aiUpdateMutation = useMutation({
    mutationFn: (prompt: string) =>
      fetch("/api/ai/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      }).then((r) => r.json()) as Promise<{
        sql: string;
        explanation: string;
        error?: string;
      }>,
    onSuccess: (data) => {
      if (data.sql) {
        setGeneratedSqlDraft({
          sql: data.sql,
          explanation: data.explanation,
          mode: "update",
        });
      }
    },
  });

  const aiDeleteMutation = useMutation({
    mutationFn: (prompt: string) =>
      fetch("/api/ai/destructive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      }).then((r) => r.json()) as Promise<{
        plan: DestructiveQueryPlan;
        explanation: string;
        error?: string;
      }>,
    onSuccess: (data) => {
      if (data.plan) {
        setDestructivePlan(data.plan);
        setShowAiSheet(false);
      }
    },
  });

  const aiExplanation =
    aiMode === "select"
      ? aiSqlMutation.data?.error || aiSqlMutation.data?.explanation
      : aiMode === "update"
        ? aiUpdateMutation.data?.error || aiUpdateMutation.data?.explanation
        : aiDeleteMutation.data?.error || aiDeleteMutation.data?.explanation;

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
    mutationFn: (entry: {
      sql: string;
      durationMs: number;
      rowCount: number;
      error?: string;
    }) =>
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
    mutationFn: () =>
      fetch("/api/query-history", { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["query-history", connectionId] });
    },
  });

  const result = runMutation.data;

  const handleGenerate = () => {
    if (!aiPrompt.trim()) return;
    if (aiMode === "select") {
      aiSqlMutation.mutate(aiPrompt);
      return;
    }
    if (aiMode === "update") {
      aiUpdateMutation.mutate(aiPrompt);
      return;
    }
    aiDeleteMutation.mutate(aiPrompt);
  };

  const handleExecuteComplete = (result: DestructiveExecutionResult) => {
    setExecutionResult(result);
    setDestructivePlan(null);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
  };

  const handleClear = () => {
    setSql("");
    setGeneratedSqlDraft(null);
    runMutation.reset();
    explainMutation.reset();
  };

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden">
      {/* Sidebar: saved queries + history */}
      <Tabs
        value={sidebarTab}
        onValueChange={setSidebarTab}
        className="w-64 border-r flex flex-col"
      >
        <div className="p-2 border-b">
          <TabsList className="w-full">
            <TabsTrigger value="saved" className="text-xs flex-1">
              <BookOpen className="w-3 h-3 mr-1" />
              Saved
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs flex-1">
              <Clock className="w-3 h-3 mr-1" />
              History
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="saved"
          className="flex-1 flex flex-col data-[state=inactive]:hidden"
        >
          <ScrollArea className="flex-1">
            {!savedQueries || savedQueries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <BookOpen className="w-8 h-8 text-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground">
                  No saved queries yet
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  Run a query and save it for later
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 text-xs h-7"
                  onClick={() => setSql("SELECT * FROM ")}
                >
                  <Play className="w-3 h-3 mr-1" />
                  Start querying
                </Button>
              </div>
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

        <TabsContent
          value="history"
          className="flex-1 flex flex-col data-[state=inactive]:hidden"
        >
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
            {!history || history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <Clock className="w-8 h-8 text-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground">No history yet</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  Query history will appear here
                </p>
              </div>
            ) : (
              <div className="py-1">
                {(historyFilter
                  ? history.filter((e) =>
                      e.sql.toLowerCase().includes(historyFilter.toLowerCase()),
                    )
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
                        <span className="truncate font-mono">
                          {entry.sql.slice(0, 60)}
                          {entry.sql.length > 60 ? "…" : ""}
                        </span>
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
                        <span className={durationBadge}>
                          {entry.durationMs}ms
                        </span>
                        <span>{entry.rowCount.toLocaleString()} rows</span>
                        {entry.error && (
                          <span className="text-red-500 truncate">
                            {entry.error}
                          </span>
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
      <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
        {/* AI mode bar */}
        <div className="border-b bg-muted/20 px-4 py-2">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={aiMode === "select" ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => {
                  setAiMode("select");
                  setShowAiSheet(true);
                }}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                AI select
              </Button>
              <Button
                variant={aiMode === "update" ? "secondary" : "outline"}
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => {
                  setAiMode("update");
                  setShowAiSheet(true);
                }}
              >
                <PencilLine className="w-3.5 h-3.5" />
                AI update
              </Button>
              <Button
                variant={aiMode === "delete" ? "destructive" : "outline"}
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => {
                  setAiMode("delete");
                  setShowAiSheet(true);
                }}
              >
                <Shield className="w-3.5 h-3.5" />
                Safe delete
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {aiMode === "delete"
                ? "Delete opens a large preview with affected rows before you run anything."
                : aiMode === "update"
                  ? "Update now generates a draft first. Review it, then explicitly apply it to the editor before running."
                  : "Describe the result you want and turn it into SQL fast."}
            </p>
          </div>
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
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-70">
              <span className="text-xs">⌘</span>↵
            </kbd>
            <span className="text-xs text-muted-foreground">to run</span>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b flex-wrap">
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
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            Explain
          </Button>

          <Separator orientation="vertical" className="h-5" />

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSql(formatSQL(sql))}
            title="Format SQL"
          >
            <Wand2 className="w-3.5 h-3.5 mr-1.5" />
            Format
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            title="Copy SQL"
          >
            <Copy className="w-3.5 h-3.5 mr-1.5" />
            Copy
          </Button>
          <Button size="sm" variant="ghost" onClick={handleClear} title="Clear">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>

          <Separator orientation="vertical" className="h-5" />

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
        </div>

        {/* Bottom tabbed panel for Results / Explain / Errors */}
        {result || explainMutation.data?.plan ? (
          <Tabs
            value={resultTab}
            onValueChange={setResultTab}
            className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-1 border-b shrink-0">
              <TabsList className="h-7">
                <TabsTrigger value="results" className="text-xs px-3">
                  Results{" "}
                  {result && !result.error ? `(${result.rowCount})` : ""}
                </TabsTrigger>
                <TabsTrigger value="explain" className="text-xs px-3">
                  Explain
                </TabsTrigger>
                <TabsTrigger value="errors" className="text-xs px-3">
                  Errors {result?.error ? "(1)" : ""}
                </TabsTrigger>
              </TabsList>

              {/* Result metadata */}
              {result && !result.error && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {result.durationMs}ms
                  </span>
                  <span>{result.rowCount.toLocaleString()} rows</span>
                  <span>{result.fields.length} columns</span>
                  {result.truncated && (
                    <Badge variant="secondary" className="text-xs">
                      truncated
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <TabsContent
              value="results"
              className="flex-1 min-w-0 min-h-0 data-[state=inactive]:hidden"
            >
              {result && !result.error && result.rows.length > 0 && (
                <QueryResultsTable result={result} />
              )}

              {result && !result.error && result.rows.length === 0 && (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  {/^(insert|update|delete)\b/i.test(lastExecutedSql.trim())
                    ? `Query completed successfully · ${result.rowCount.toLocaleString()} row(s) affected`
                    : "Query returned 0 rows"}
                </div>
              )}
            </TabsContent>

            <TabsContent
              value="explain"
              className="flex-1 overflow-auto data-[state=inactive]:hidden p-4"
            >
              {explainMutation.data?.plan ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Query Plan
                  </p>
                  <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-96">
                    {JSON.stringify(explainMutation.data.plan, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  {explainMutation.isPending
                    ? "Explaining..."
                    : "Run EXPLAIN to see the query plan"}
                </div>
              )}
            </TabsContent>

            <TabsContent
              value="errors"
              className="flex-1 overflow-auto data-[state=inactive]:hidden"
            >
              {result?.error ? (
                <div className="p-4 text-sm text-red-600 bg-red-50/50 border-b flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{result.error}</span>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No errors
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            <div className="text-center">
              <Play className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
              <p>Run a query to see results</p>
            </div>
          </div>
        )}
      </div>

      {/* AI Assistant Sheet */}
      <Sheet open={showAiSheet} onOpenChange={setShowAiSheet}>
        <SheetContent side="right" className="w-[28rem]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {aiMode === "select" ? (
                <>
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  AI select helper
                </>
              ) : aiMode === "update" ? (
                <>
                  <PencilLine className="w-4 h-4 text-blue-500" />
                  AI update helper
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 text-red-500" />
                  Safe delete helper
                </>
              )}
            </SheetTitle>
            <SheetDescription>
              {aiMode === "select"
                ? "Describe the read query you want to generate."
                : aiMode === "update"
                  ? "Describe what should be updated. The assistant will generate a draft UPDATE statement for review before anything is copied into the editor."
                  : "Describe what should be deleted. You will get a full-screen preview with affected rows before any delete runs."}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  aiMode === "select"
                    ? "default"
                    : aiMode === "update"
                      ? "secondary"
                      : "destructive"
                }
                className="text-xs"
              >
                {aiMode === "select"
                  ? "Read query"
                  : aiMode === "update"
                    ? "Update query"
                    : "Delete preview"}
              </Badge>
            </div>
            <Input
              className="text-sm"
              placeholder={
                aiMode === "select"
                  ? "e.g. Show top 10 customers by revenue this month"
                  : aiMode === "update"
                    ? "e.g. Set devices with null firmware_version to 'unknown'"
                    : "e.g. Delete users with email test@test.com"
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
              className="w-full"
              size="sm"
              variant={
                aiMode === "select"
                  ? "default"
                  : aiMode === "update"
                    ? "secondary"
                    : "destructive"
              }
              disabled={
                !aiPrompt.trim() ||
                aiSqlMutation.isPending ||
                aiUpdateMutation.isPending ||
                aiDeleteMutation.isPending
              }
              onClick={handleGenerate}
            >
              {aiMode === "select"
                ? "Generate select SQL"
                : aiMode === "update"
                  ? "Generate update SQL"
                  : "Open delete preview"}
            </Button>
            {aiExplanation && (
              <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                {aiExplanation}
              </div>
            )}
            {generatedSqlDraft && generatedSqlDraft.mode === aiMode && (
              <div className="space-y-3 rounded-lg border border-border/70 bg-background p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      Generated draft
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Review before applying to the editor.
                    </p>
                  </div>
                  <Badge variant={generatedSqlDraft.mode === "update" ? "secondary" : "outline"}>
                    {generatedSqlDraft.mode === "update" ? "UPDATE" : "SELECT"}
                  </Badge>
                </div>
                <pre className="max-h-56 overflow-auto rounded bg-muted p-3 text-[11px] font-mono leading-relaxed text-foreground">
                  {generatedSqlDraft.sql}
                </pre>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSql(generatedSqlDraft.sql);
                      setShowAiSheet(false);
                      setGeneratedSqlDraft(null);
                    }}
                  >
                    Apply to editor
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setGeneratedSqlDraft(null)}
                  >
                    Discard
                  </Button>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

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
                  <div className="text-2xl font-bold">
                    {executionResult.steps.length}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Steps Executed
                  </div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded">
                  <div className="text-2xl font-bold">
                    {executionResult.totalDurationMs}ms
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Total Duration
                  </div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded">
                  <div className="text-2xl font-bold">
                    {executionResult.committed
                      ? "Yes"
                      : executionResult.rolledBack
                        ? "Rolled Back"
                        : "No"}
                  </div>
                  <div className="text-xs text-muted-foreground">Committed</div>
                </div>
              </div>

              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {executionResult.steps.map((step, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded border ${step.success ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {step.success ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          <Badge
                            variant={
                              step.type === "deletion"
                                ? "destructive"
                                : "default"
                            }
                            className="text-xs"
                          >
                            {step.type.toUpperCase()}
                          </Badge>
                          <span className="text-xs font-mono">
                            Step {step.order}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {step.durationMs}ms
                        </span>
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
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen text-sm text-muted-foreground">
          Loading...
        </div>
      }
    >
      <QueryPageInner />
    </Suspense>
  );
}
