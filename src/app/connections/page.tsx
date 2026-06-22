"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Check,
  Database,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Search,
  Server,
  Shield,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn, timeAgo } from "@/lib/utils";
import type { ConnectionConfig } from "@/types";

function parseHost(connectionString: string): string {
  const match = connectionString.match(/@([^:/]+)/);
  return match ? match[1] : "—";
}

function inferEnvironment(connection: ConnectionConfig): "dev" | "staging" | "prod" {
  const name = connection.name.toLowerCase();
  if (name.includes("prod") || name.includes("production")) return "prod";
  if (name.includes("stage") || name.includes("staging")) return "staging";
  return "dev";
}

const ENV_STYLES = {
  dev: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-900/20 dark:text-violet-300",
  staging: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300",
  prod: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-900/20 dark:text-sky-300",
} as const;

export default function ConnectionsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then((r) => r.json()),
  });

  const connections = useMemo<ConnectionConfig[]>(() => settings?.connections ?? [], [settings?.connections]);
  const activeConnectionId: string | null = settings?.activeConnectionId ?? null;

  const [searchQuery, setSearchQuery] = useState("");
  const [editingConnection, setEditingConnection] = useState<ConnectionConfig | null>(null);
  const [editName, setEditName] = useState("");
  const [editConnectionString, setEditConnectionString] = useState("");
  const [editColor, setEditColor] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ConnectionConfig | null>(null);

  const filtered = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return connections.filter((connection) => {
      if (!query) return true;
      return (
        connection.name.toLowerCase().includes(query) ||
        parseHost(connection.connectionString).toLowerCase().includes(query)
      );
    });
  }, [connections, searchQuery]);

  const setActiveMutation = useMutation({
    mutationFn: (id: string) =>
      fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeConnectionId: id }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["schema"] });
      toast.success("Active connection updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const testMutation = useMutation({
    mutationFn: (connectionString: string) =>
      fetch("/api/connect/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionString }),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data.ok) {
        toast.success(data.version ?? "Connection successful");
      } else {
        toast.error(data.error ?? "Connection failed");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const editMutation = useMutation({
    mutationFn: ({
      id,
      name,
      connectionString,
      color,
    }: {
      id: string;
      name: string;
      connectionString: string;
      color?: string;
    }) =>
      fetch(`/api/connections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, connectionString, color }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Connection updated");
      setEditingConnection(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/connections/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["schema"] });
      toast.success("Connection deleted");
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openEdit = (connection: ConnectionConfig) => {
    setEditingConnection(connection);
    setEditName(connection.name);
    setEditConnectionString(connection.connectionString);
    setEditColor(connection.color ?? "");
  };

  const testedCount = connections.filter((connection) => !!connection.lastConnectedAt).length;
  const productionCount = connections.filter((connection) => inferEnvironment(connection) === "prod").length;

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-6xl space-y-6 px-8 py-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Connection control
              </Badge>
              <Badge variant="outline" className="rounded-full text-[11px] text-muted-foreground">
                <Shield className="mr-1 h-3 w-3" />
                PostgreSQL workspaces
              </Badge>
            </div>
            <h1 className="mt-3 text-[30px] font-bold tracking-tight">Connections</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Keep the page practical: clear active state, quick testing, and lightweight editing without oversized dashboard chrome.
            </p>
          </div>
          <Button onClick={() => router.push("/settings")}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Connection
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <SummaryCard label="Connections" value={connections.length.toString()} sub="Saved environments" />
          <SummaryCard label="Tested" value={testedCount.toString()} sub="With connection history" />
          <SummaryCard label="Production" value={productionCount.toString()} sub="Named like prod" />
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name or host..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>

        {connections.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
              <Database className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No connections yet</p>
              <Button onClick={() => router.push("/settings")}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add your first connection
              </Button>
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No connections match your search.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map((connection) => {
              const isActive = connection.id === activeConnectionId;
              const isTested = !!connection.lastConnectedAt;
              const environment = inferEnvironment(connection);
              return (
                <Card key={connection.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="inline-flex h-3 w-3 rounded-full"
                            style={{ backgroundColor: connection.color || "#8a4b31" }}
                          />
                          <h2 className="truncate text-base font-semibold tracking-tight">
                            {connection.name}
                          </h2>
                          <Badge variant="outline" className={cn("rounded-full", ENV_STYLES[environment])}>
                            {environment}
                          </Badge>
                          {isActive && <Badge className="rounded-full">Active</Badge>}
                          {!isActive && isTested && (
                            <Badge variant="outline" className="rounded-full border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-900/20 dark:text-green-300">
                              Tested
                            </Badge>
                          )}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <Server className="h-4 w-4" />
                            {parseHost(connection.connectionString)}
                          </span>
                          <span>
                            {connection.lastConnectedAt
                              ? `Last tested ${timeAgo(connection.lastConnectedAt)}`
                              : "Never tested"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {!isActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={setActiveMutation.isPending}
                            onClick={() => setActiveMutation.mutate(connection.id)}
                          >
                            <Check className="mr-1.5 h-4 w-4" />
                            Set active
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={testMutation.isPending}
                          onClick={() => testMutation.mutate(connection.connectionString)}
                        >
                          <Play className="mr-1.5 h-4 w-4" />
                          Test
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(connection)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(connection)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={editingConnection !== null} onOpenChange={(open) => !open && setEditingConnection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Connection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Name</Label>
              <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-cs">Connection String</Label>
              <Input
                id="edit-cs"
                type="password"
                value={editConnectionString}
                onChange={(e) => setEditConnectionString(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-color">Color</Label>
              <div className="flex items-center gap-2">
                <div
                  className="h-4 w-4 rounded border"
                  style={{ backgroundColor: editColor || "#8a4b31" }}
                />
                <Input id="edit-color" value={editColor} onChange={(e) => setEditColor(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingConnection(null)}>
              Cancel
            </Button>
            <Button
              disabled={!editName || !editConnectionString || editMutation.isPending}
              onClick={() =>
                editingConnection &&
                editMutation.mutate({
                  id: editingConnection.id,
                  name: editName,
                  connectionString: editConnectionString,
                  color: editColor || undefined,
                })
              }
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete connection?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the saved connection and any cached schema for it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card px-4 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
