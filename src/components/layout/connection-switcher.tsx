"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  useActiveConnectionId,
  useActiveConnection,
} from "@/components/active-connection-provider";
import { ChevronDown, Database, Plus } from "lucide-react";
import type { ConnectionConfig, SafetyConfig } from "@/types";
import { cn, timeAgo } from "@/lib/utils";

export function ConnectionSwitcher() {
  const { data: settings, isLoading } = useQuery<{
    connections: ConnectionConfig[];
    activeConnectionId: string | null;
    safetyConfig: SafetyConfig;
  }>({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then((r) => r.json()),
    staleTime: 30_000,
  });

  const activeConnectionId = useActiveConnectionId();
  const activeConnection = useActiveConnection();
  const queryClient = useQueryClient();

  const connections = settings?.connections ?? [];
  const writesEnabled = settings?.safetyConfig?.writesEnabled ?? false;
  const safeMode = settings?.safetyConfig?.safeMode ?? true;
  const stateLabel = !writesEnabled
    ? "Read only"
    : safeMode
      ? "Safe mode"
      : "Writes enabled";
  const stateTone = !writesEnabled
    ? "text-emerald-700 bg-emerald-500/10 border-emerald-500/20"
    : safeMode
      ? "text-amber-700 bg-amber-500/10 border-amber-500/20"
      : "text-red-700 bg-red-500/10 border-red-500/20";

  const handleSwitch = async (id: string) => {
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activeConnectionId: id }),
    });
    queryClient.invalidateQueries({ queryKey: ["settings"] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted animate-pulse shrink-0">
        <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
        <div className="w-16 h-3 bg-muted-foreground/20 rounded" />
        <div className="w-3 h-3 bg-muted-foreground/20 rounded" />
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <Link
        href="/settings"
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-[11px] font-medium text-muted-foreground shrink-0 hover:bg-accent transition-colors"
      >
        <Database className="w-3 h-3" />
        <span>Not Connected</span>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground shrink-0 transition-colors hover:bg-accent">
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: activeConnection?.color || "#8a4b31" }}
          />
          <span className="max-w-[120px] truncate text-foreground/90">
            {activeConnection?.name ?? "Select"}
          </span>
          <span
            className={cn(
              "rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
              stateTone,
            )}
          >
            {stateLabel}
          </span>
          <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel className="space-y-1">
          <div>Connections</div>
          <div className="text-[11px] font-normal text-muted-foreground">
            Current workspace is {stateLabel.toLowerCase()}.
          </div>
        </DropdownMenuLabel>
        {connections.map((conn) => {
          const isActive = conn.id === activeConnectionId;
          return (
            <DropdownMenuItem
              key={conn.id}
              onClick={() => handleSwitch(conn.id)}
              title={`Switch to ${conn.name}`}
              className="flex items-start gap-2 py-2"
            >
              <span
                className="mt-1.5 h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: conn.color || "#8a4b31" }}
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{conn.name}</span>
                  {isActive && (
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      Active
                    </span>
                  )}
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  {conn.lastConnectedAt
                    ? `Tested ${timeAgo(conn.lastConnectedAt)}`
                    : "Not tested yet"}
                </span>
              </span>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/connections" className="flex items-center gap-2 cursor-pointer">
            <Database className="w-3.5 h-3.5" />
            <span>Manage Connections</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
            <Plus className="w-3.5 h-3.5" />
            <span>Add Connection</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
