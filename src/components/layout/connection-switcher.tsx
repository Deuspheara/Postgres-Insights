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
import { useActiveConnectionId, useActiveConnection } from "@/components/active-connection-provider";
import { ChevronDown, Database, Plus } from "lucide-react";
import type { ConnectionConfig } from "@/types";

export function ConnectionSwitcher() {
  const { data: settings, isLoading } = useQuery<{
    connections: ConnectionConfig[];
    activeConnectionId: string | null;
  }>({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then((r) => r.json()),
    staleTime: 30_000,
  });

  const activeConnectionId = useActiveConnectionId();
  const activeConnection = useActiveConnection();
  const queryClient = useQueryClient();

  const connections = settings?.connections ?? [];

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
        <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-[11px] font-medium text-muted-foreground shrink-0 hover:bg-accent transition-colors">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: activeConnection?.color || "#8a4b31" }}
          />
          <span className="truncate max-w-[120px]">{activeConnection?.name ?? "Select"}</span>
          <ChevronDown className="w-3 h-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuLabel>Connections</DropdownMenuLabel>
        {connections.map((conn) => {
          const isActive = conn.id === activeConnectionId;
          return (
            <DropdownMenuItem
              key={conn.id}
              onClick={() => handleSwitch(conn.id)}
              title={`Switch to ${conn.name}`}
              className="flex items-center gap-2"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: conn.color || "#8a4b31" }}
              />
              <span className="flex-1 truncate">{conn.name}</span>
              {isActive && (
                <span className="ml-auto text-primary">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              )}
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
