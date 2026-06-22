"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ObjectViewer } from "@/components/ui/object-viewer";
import {
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Eye,
  Loader2,
  Database,
  Table2,
  Shield,
  Undo2,
} from "lucide-react";
import type {
  DestructiveQueryPlan,
  DestructiveExecutionResult,
  TableImpact,
} from "@/types";

interface DestructionPreviewProps {
  plan: DestructiveQueryPlan;
  onClose: () => void;
  onExecuteComplete: (result: DestructiveExecutionResult) => void;
}

export function DestructionPreview({ plan, onClose, onExecuteComplete }: DestructionPreviewProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzedPlan, setAnalyzedPlan] = useState<DestructiveQueryPlan | null>(null);
  const [tableImpacts, setTableImpacts] = useState<TableImpact[]>([]);

  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const analyzeMutation = useMutation({
    mutationFn: (p: DestructiveQueryPlan) =>
      fetch("/api/ai/destructive/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: p }),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      setAnalyzeError(null);
      if (data.error) {
        setAnalyzeError(data.error);
        setAnalyzing(false);
        return;
      }
      if (data.plan) {
        setAnalyzedPlan(data.plan);
        setTableImpacts(data.tableImpacts || []);
      }
      setAnalyzing(false);
    },
    onError: (e) => {
      setAnalyzeError(e.message);
      setAnalyzing(false);
    },
  });

  const executeMutation = useMutation<DestructiveExecutionResult, Error, DestructiveQueryPlan>({
    mutationFn: (p: DestructiveQueryPlan) =>
      fetch("/api/ai/destructive/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: p }),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      onExecuteComplete(data);
    },
  });

  const handleAnalyze = () => {
    setAnalyzeError(null);
    setAnalyzedPlan(null);
    setTableImpacts([]);
    setAnalyzing(true);
    analyzeMutation.mutate(plan);
  };

  const handleExecute = () => {
    executeMutation.mutate(analyzedPlan || plan);
  };

  useEffect(() => {
    handleAnalyze();
    // plan id changes when the assistant creates a fresh write preview
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.id]);

  const currentPlan = analyzedPlan || plan;
  const deletionSteps = currentPlan.steps.filter((step) => step.type === "deletion");
  const verificationSteps = currentPlan.steps.filter(
    (step) => step.type === "verification" || step.type === "verification_final",
  );

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="flex h-[96vh] w-[98vw] max-w-[98vw] flex-col overflow-hidden p-0 sm:max-w-[98vw]">
        <DialogHeader className="border-b bg-gradient-to-r from-red-50 via-background to-amber-50 px-8 pt-8 pb-6 dark:from-red-950/30 dark:via-background dark:to-amber-950/20">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-red-100 p-3 dark:bg-red-900/30">
              <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="space-y-3">
              <div>
                <DialogTitle className="text-2xl font-semibold tracking-tight">
                  Review delete preview
                </DialogTitle>
                <DialogDescription className="mt-2 max-w-3xl text-sm leading-6">
                  {plan.description}
                </DialogDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="destructive" className="text-xs">
                  Delete flow
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Preview first, run second
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {currentPlan.transactionWrapped ? "Transaction protected" : "No transaction"}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-5">
          <div className="grid gap-4 xl:grid-cols-[1.25fr_0.95fr]">
            <Card className="border-red-200 bg-red-50/70 dark:border-red-900 dark:bg-red-950/30">
              <CardContent className="flex flex-col gap-3 p-6">
                <div>
                  <p className="text-base font-semibold text-red-900 dark:text-red-100">
                    Large delete preview
                  </p>
                  <p className="mt-1 text-sm leading-6 text-red-800/80 dark:text-red-200/80">
                    This screen is intentionally large so you can inspect matched rows, affected tables, and every SQL step before running the delete.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="rounded-2xl bg-background/80 px-4 py-3">
                    <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                      {analyzedPlan?.totalTablesAffected ?? 0}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">tables touched</div>
                  </div>
                  <div className="rounded-2xl bg-background/80 px-4 py-3">
                    <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                      {(analyzedPlan?.totalRowsAffected ?? 0).toLocaleString()}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">rows matched</div>
                  </div>
                  <div className="rounded-2xl bg-background/80 px-4 py-3">
                    <div className="text-3xl font-bold text-foreground">
                      {deletionSteps.length}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">delete statements</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30">
              <CardContent className="p-6">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  How to use this
                </p>
                <ol className="mt-3 space-y-2 text-sm leading-6 text-amber-900/80 dark:text-amber-200/80">
                  <li>1. Check the matched row counts and sample rows.</li>
                  <li>2. Review the SQL steps below.</li>
                  <li>3. Refresh preview if you changed the request.</li>
                  <li>4. Run delete only when the preview looks correct.</li>
                </ol>
              </CardContent>
            </Card>
          </div>

          {analyzeError && (
            <Card className="border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30">
              <CardContent className="pt-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-red-600 dark:text-red-400">{analyzeError}</p>
                  <Button variant="outline" onClick={handleAnalyze} disabled={analyzeMutation.isPending}>
                    <Undo2 className="mr-2 h-4 w-4" />
                    Retry preview
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {analyzing && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-3 text-sm text-muted-foreground">Checking affected rows...</span>
            </div>
          )}

          {analyzedPlan && (
            <>
              <Card className="border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-300">
                    <AlertTriangle className="w-5 h-5" />
                    What will change
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl bg-background/70 p-4 text-center">
                      <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                        {analyzedPlan.totalTablesAffected}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">tables touched</div>
                    </div>
                    <div className="rounded-xl bg-background/70 p-4 text-center">
                      <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                        {analyzedPlan.totalRowsAffected.toLocaleString()}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">rows matched</div>
                    </div>
                    <div className="rounded-xl bg-background/70 p-4 text-center">
                      <div className="text-3xl font-bold text-primary">
                        {deletionSteps.length}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">write statements</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Table2 className="w-4 h-4" />
                      Affected tables
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-56">
                      <div className="space-y-2">
                        {tableImpacts.length > 0 ? (
                          tableImpacts.map((impact) => (
                            <div
                              key={impact.tableName}
                              className="flex items-center justify-between rounded-lg border bg-muted/30 p-3"
                            >
                              <div className="flex items-center gap-2">
                                <Database className="w-4 h-4 text-muted-foreground" />
                                <div>
                                  <div className="text-sm font-mono">{impact.tableName}</div>
                                  <div className="text-[11px] text-muted-foreground">
                                    preview matched rows in this table
                                  </div>
                                </div>
                              </div>
                              <Badge variant="destructive" className="text-xs">
                                {impact.rowCountAffected.toLocaleString()} rows
                              </Badge>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                            No rows matched the preview queries.
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Matching rows preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-56">
                      <div className="space-y-2">
                        {tableImpacts.flatMap((impact) =>
                          (impact.sampleRows || []).slice(0, 3).map((row, idx) => (
                            <div key={`${impact.tableName}-${idx}`} className="rounded-lg border bg-muted/30 p-3">
                              <div className="mb-2 text-xs font-mono text-muted-foreground">
                                {impact.tableName}
                              </div>
                              <ObjectViewer value={row} />
                            </div>
                          )),
                        )}
                        {tableImpacts.every((impact) => !impact.sampleRows?.length) && (
                          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                            No sample rows available for this preview.
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Review SQL steps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-xs font-normal">
                  {verificationSteps.length} preview checks
                </Badge>
                <Badge variant="destructive" className="text-xs font-normal">
                  {deletionSteps.length} writes
                </Badge>
              </div>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {currentPlan.steps.map((step, idx) => (
                    <div key={idx} className="flex gap-3 rounded-xl border bg-muted/20 p-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full ${
                            step.type === "verification"
                              ? "bg-blue-100 dark:bg-blue-900/30"
                              : step.type === "deletion"
                                ? "bg-red-100 dark:bg-red-900/30"
                                : "bg-green-100 dark:bg-green-900/30"
                          }`}
                        >
                          {step.type === "verification" ? (
                            <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          ) : step.type === "deletion" ? (
                            <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                          )}
                        </div>
                        {idx < currentPlan.steps.length - 1 && (
                          <div className="mt-1 h-6 w-px bg-border" />
                        )}
                      </div>
                      <div className="flex-1 pb-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              step.type === "verification"
                                ? "default"
                                : step.type === "deletion"
                                  ? "destructive"
                                  : "secondary"
                            }
                            className="text-xs"
                          >
                            {step.type === "verification"
                              ? "Preview"
                              : step.type === "deletion"
                                ? "Write"
                                : "Final check"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">Step {step.order}</span>
                        </div>
                        <p className="mt-1 text-sm">{step.description}</p>
                        <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-2 text-xs font-mono">
                          {step.sql}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="gap-2 px-6 py-4 border-t bg-muted/30">
          <Button variant="outline" onClick={onClose} disabled={executeMutation.isPending}>
            Close
          </Button>
          <Button
            variant="outline"
            onClick={handleAnalyze}
            disabled={analyzeMutation.isPending || executeMutation.isPending}
          >
            <Undo2 className="w-4 h-4 mr-2" />
            Refresh preview
          </Button>
          <Button
            variant="destructive"
            onClick={handleExecute}
            disabled={!analyzedPlan || executeMutation.isPending || analyzing}
          >
            {executeMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running write...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Run write now
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
