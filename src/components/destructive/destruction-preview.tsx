"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ObjectViewer } from "@/components/ui/object-viewer";
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Eye, 
  Loader2,
  Database,
  Table2,
  ArrowRight,
  Shield,
  Undo2
} from "lucide-react";
import type { DestructiveQueryPlan, DestructiveExecutionResult, TableImpact } from "@/types";

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
    setAnalyzing(true);
    analyzeMutation.mutate(plan);
  };

  const handleExecute = () => {
    executeMutation.mutate(analyzedPlan || plan);
  };

  const verificationSteps = plan.steps.filter(s => s.type === "verification");
  const deletionSteps = plan.steps.filter(s => s.type === "deletion");
  const finalSteps = plan.steps.filter(s => s.type === "verification_final");

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-7xl w-[95vw] max-h-[95vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <DialogTitle className="text-xl">{plan.title}</DialogTitle>
              <DialogDescription className="mt-1">{plan.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
          {analyzeError && (
            <Card className="border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30">
              <CardContent className="pt-4">
                <p className="text-sm text-red-600 dark:text-red-400">{analyzeError}</p>
              </CardContent>
            </Card>
          )}

          {!analyzedPlan && !analyzing && !analyzeError && (
            <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                  <Shield className="w-5 h-5" />
                  Safety First
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Before executing, click &quot;Analyze Impact&quot; to run verification queries and see exactly what will be deleted.
                  This ensures you understand the full impact before any data is removed.
                </p>
              </CardContent>
            </Card>
          )}

          {analyzing && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-3 text-sm text-muted-foreground">Analyzing impact...</span>
            </div>
          )}

          {analyzedPlan && tableImpacts.length > 0 && (
            <>
              <Card className="border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-300">
                    <AlertTriangle className="w-5 h-5" />
                    Impact Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                        {analyzedPlan.totalTablesAffected}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Tables Affected</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                        {analyzedPlan.totalRowsAffected.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Rows to Delete</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary">
                        {plan.transactionWrapped ? "Yes" : "No"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Transaction Wrapped</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Table2 className="w-4 h-4" />
                      Affected Tables
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-48">
                      <div className="space-y-2">
                        {tableImpacts.map((impact) => (
                          <div key={impact.tableName} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                            <div className="flex items-center gap-2">
                              <Database className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm font-mono">{impact.tableName}</span>
                            </div>
                            <Badge variant="destructive" className="text-xs">
                              {impact.rowCountAffected} rows
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Sample Data
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-48">
                      <div className="space-y-2">
                        {tableImpacts.flatMap((impact) => 
                          (impact.sampleRows || []).slice(0, 3).map((row, idx) => (
                            <div key={`${impact.tableName}-${idx}`} className="p-2 bg-muted/50 rounded">
                              <div className="text-xs font-mono text-muted-foreground mb-1">
                                {impact.tableName}
                              </div>
                              <ObjectViewer value={row} />
                            </div>
                          ))
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
              <CardTitle className="text-sm">Execution Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {plan.steps.map((step, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          step.type === "verification" 
                            ? "bg-blue-100 dark:bg-blue-900/30" 
                            : step.type === "deletion"
                            ? "bg-red-100 dark:bg-red-900/30"
                            : "bg-green-100 dark:bg-green-900/30"
                        }`}>
                          {step.type === "verification" ? (
                            <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          ) : step.type === "deletion" ? (
                            <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                          )}
                        </div>
                        {idx < plan.steps.length - 1 && (
                          <div className="w-px h-6 bg-border mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            step.type === "verification" 
                              ? "default" 
                              : step.type === "deletion"
                              ? "destructive"
                              : "secondary"
                          } className="text-xs">
                            {step.type === "verification" ? "VERIFY" : step.type === "deletion" ? "DELETE" : "VERIFY FINAL"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">Step {step.order}</span>
                        </div>
                        <p className="text-sm mt-1">{step.description}</p>
                        <pre className="text-xs font-mono bg-muted p-2 rounded mt-2 overflow-x-auto">
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
            Cancel
          </Button>
          {!analyzedPlan && !analyzing && (
            <Button 
              variant="secondary" 
              onClick={handleAnalyze}
              disabled={analyzeMutation.isPending}
            >
              <Eye className="w-4 h-4 mr-2" />
              Analyze Impact
            </Button>
          )}
          {analyzedPlan && (
            <>
              <Button 
                variant="outline" 
                onClick={handleAnalyze}
                disabled={analyzeMutation.isPending}
              >
                <Undo2 className="w-4 h-4 mr-2" />
                Re-analyze
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleExecute}
                disabled={executeMutation.isPending}
              >
                {executeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Execute Deletion
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
