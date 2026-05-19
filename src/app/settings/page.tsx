"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, Loader2, Database, Key } from "lucide-react";
import { toast } from "sonner";

const AI_MODELS = [
  { value: "openai/gpt-4o-mini", label: "GPT-4o Mini (fast, cheap)" },
  { value: "openai/gpt-4o", label: "GPT-4o (powerful)" },
  { value: "anthropic/claude-3-5-haiku", label: "Claude 3.5 Haiku (fast)" },
  { value: "anthropic/claude-3-7-sonnet", label: "Claude 3.7 Sonnet (powerful)" },
  { value: "google/gemini-flash-1.5", label: "Gemini Flash 1.5 (fast)" },
  { value: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B (open)" },
];

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then((r) => r.json()),
  });

  const [connectionString, setConnectionString] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("openai/gpt-4o-mini");
  const [allowSampleRows, setAllowSampleRows] = useState(false);
  const [safeMode, setSafeMode] = useState(true);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");

  const isConfigured = settings?.connection !== null && settings?.connection !== undefined;
  const hasApiKey = settings?.connection?.openRouterApiKey === "***configured***";

  // ── DB connection ──────────────────────────────────────────────────────────
  const testAndSaveMutation = useMutation({
    mutationFn: async (save: boolean) => {
      setTestStatus("testing");
      const res = await fetch("/api/connect/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionString, safeMode, save }),
      });
      return res.json() as Promise<{ ok: boolean; error?: string; version?: string }>;
    },
    onSuccess: (data, save) => {
      if (data.ok) {
        setTestStatus("ok");
        setTestMessage(data.version ?? "Connected");
        if (save) {
          qc.invalidateQueries({ queryKey: ["settings"] });
          qc.invalidateQueries({ queryKey: ["schema"] });
          toast.success("Connection saved");
        }
      } else {
        setTestStatus("error");
        setTestMessage(data.error ?? "Connection failed");
      }
    },
    onError: (e: Error) => {
      setTestStatus("error");
      setTestMessage(e.message);
    },
  });

  // ── AI settings (independent save) ────────────────────────────────────────
  const saveAiMutation = useMutation({
    mutationFn: () =>
      fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connection: {
            openRouterApiKey: apiKey || undefined,
            aiModel: model,
            allowSampleRows,
          },
        }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      setApiKey("");
      toast.success("AI settings saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Configure your database and AI connections</p>
      </div>

      {isConfigured && (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <CheckCircle className="w-4 h-4" />
          Database connection is configured
          {hasApiKey && <span className="ml-2 text-muted-foreground">· OpenRouter key configured</span>}
        </div>
      )}

      {/* Database */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="w-4 h-4" />
            PostgreSQL Connection
          </CardTitle>
          <CardDescription>
            Credentials are stored server-side only and never sent to the browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cs">Connection String</Label>
            <Input
              id="cs"
              type="password"
              placeholder={isConfigured ? "••• already configured — paste new to update" : "postgresql://user:pass@host:5432/db"}
              value={connectionString}
              onChange={(e) => { setConnectionString(e.target.value); setTestStatus("idle"); }}
            />
            <p className="text-xs text-muted-foreground">
              SSL is enabled automatically for remote hosts.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              disabled={!connectionString || testAndSaveMutation.isPending}
              onClick={() => testAndSaveMutation.mutate(false)}
            >
              {testAndSaveMutation.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Test
            </Button>
            <Button
              size="sm"
              disabled={!connectionString || testAndSaveMutation.isPending}
              onClick={() => testAndSaveMutation.mutate(true)}
            >
              Save & Connect
            </Button>

            {testStatus === "ok" && (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                {testMessage}
              </span>
            )}
            {testStatus === "error" && (
              <span className="flex items-center gap-1 text-sm text-red-600">
                <XCircle className="w-4 h-4" />
                {testMessage}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <Label htmlFor="safeMode" className="text-sm">Safe Mode</Label>
              <p className="text-xs text-muted-foreground">Limits concurrency, timeouts, and row counts</p>
            </div>
            <Switch id="safeMode" checked={safeMode} onCheckedChange={setSafeMode} />
          </div>
        </CardContent>
      </Card>

      {/* AI — independent save */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="w-4 h-4" />
            AI / OpenRouter
          </CardTitle>
          <CardDescription>
            Used for schema interpretation and SQL generation.{" "}
            <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="underline">
              Get a key at openrouter.ai
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="apikey">OpenRouter API Key</Label>
            <Input
              id="apikey"
              type="password"
              placeholder={hasApiKey ? "••• already configured — paste new to update" : "sk-or-..."}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>AI Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="sampleRows" className="text-sm">Allow sample rows</Label>
              <p className="text-xs text-muted-foreground">Send top values to AI for richer inference (privacy risk)</p>
            </div>
            <Switch id="sampleRows" checked={allowSampleRows} onCheckedChange={setAllowSampleRows} />
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded p-2.5">
            <Badge variant="outline" className="text-xs">Privacy</Badge>
            Only schema metadata and column stats are sent to the AI — never raw row data.
          </div>

          <Button
            size="sm"
            disabled={saveAiMutation.isPending || (!isConfigured)}
            onClick={() => saveAiMutation.mutate()}
          >
            {saveAiMutation.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            Save AI Settings
          </Button>
          {!isConfigured && (
            <p className="text-xs text-muted-foreground">Save a DB connection first.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
