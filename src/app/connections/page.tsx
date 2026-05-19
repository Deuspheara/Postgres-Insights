"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Database, Plus, Check, Trash2, Pencil, Play } from "lucide-react";
import { toast } from "sonner";
import { timeAgo } from "@/lib/utils";
import type { ConnectionConfig } from "@/types";

function parseHost(connectionString: string): string {
  const match = connectionString.match(/@([^:/]+)/);
  return match ? match[1] : "—";
}

export default function ConnectionsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then((r) => r.json()),
  });

  const connections: ConnectionConfig[] = settings?.connections ?? [];
  const activeConnectionId: string | null = settings?.activeConnectionId ?? null;

  const [editingConnection, setEditingConnection] = useState<ConnectionConfig | null>(null);
  const [editName, setEditName] = useState("");
  const [editConnectionString, setEditConnectionString] = useState("");
  const [editColor, setEditColor] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ConnectionConfig | null>(null);

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
      toast.success("Active connection set");
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

  const openEdit = (conn: ConnectionConfig) => {
    setEditingConnection(conn);
    setEditName(conn.name);
    setEditConnectionString(conn.connectionString);
    setEditColor(conn.color ?? "");
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Connections</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your database connections</p>
        </div>
        <Button onClick={() => router.push("/settings")}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add Connection
        </Button>
      </div>

      {connections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <Database className="w-10 h-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No connections yet</p>
            <Button onClick={() => router.push("/settings")}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add your first connection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {connections.map((conn) => (
            <Card key={conn.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: conn.color || "#8a4b31" }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{conn.name}</span>
                      {conn.id === activeConnectionId && (
                        <Badge variant="outline" className="text-xs">Active</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {parseHost(conn.connectionString)}
                      {conn.lastConnectedAt && (
                        <> <span className="text-muted-foreground/60">·</span> {timeAgo(conn.lastConnectedAt)}</>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {conn.lastConnectedAt ? (
                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-xs">
                      <Check className="w-3 h-3 mr-0.5" />
                      Tested
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Untested</Badge>
                  )}
                  <div className="opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center gap-1">
                    {conn.id !== activeConnectionId && (
                      <Button
                        variant="outline"
                        size="xs"
                        disabled={setActiveMutation.isPending}
                        onClick={() => setActiveMutation.mutate(conn.id)}
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Set Active
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="xs"
                      disabled={testMutation.isPending}
                      onClick={() => testMutation.mutate(conn.connectionString)}
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Test
                    </Button>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => openEdit(conn)}
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => setDeleteTarget(conn)}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editingConnection !== null} onOpenChange={(open) => !open && setEditingConnection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Connection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
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
                  className="w-4 h-4 rounded shrink-0 border"
                  style={{ backgroundColor: editColor || "#8a4b31" }}
                />
                <Input
                  id="edit-color"
                  placeholder="#8a4b31"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingConnection(null)}>
              Cancel
            </Button>
            <Button
              disabled={editMutation.isPending || !editName || !editConnectionString}
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
              {editMutation.isPending && <span className="animate-spin mr-1.5"><Play className="w-3 h-3" /></span>}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete connection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.name}&rdquo;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending && <Play className="w-3 h-3 mr-1 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
