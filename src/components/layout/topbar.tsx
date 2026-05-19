"use client";

import { useQuery } from "@tanstack/react-query";
import { Search, Zap, Clock, HelpCircle, Database } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Topbar() {
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then((r) => r.json()),
    staleTime: 30_000,
  });

  const connected = !!settings?.connection;

  return (
    <header className="h-[52px] flex items-center px-4 gap-3 bg-background shrink-0">
      {/* App title */}
      <h1 className="text-[15px] font-bold tracking-tight text-foreground shrink-0 leading-none">
        PG Insights
      </h1>

      {/* Connection pill */}
      {connected && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-[11px] font-medium text-muted-foreground shrink-0">
          <Database className="w-3 h-3" />
          <span>Connected</span>
        </div>
      )}

      {/* Search bar */}
      <div className="flex-1 max-w-sm mx-auto">
        <Link href="/explore">
          <div className="flex items-center gap-2 bg-muted rounded-full px-3 py-1.5 text-muted-foreground hover:bg-accent transition-colors cursor-text">
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span className="text-xs flex-1">Search tables, schemas...</span>
            <kbd className="text-[10px] bg-background/80 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
          </div>
        </Link>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 ml-auto">
        <Link href="/insights">
          <button className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors">
            <Zap className="w-4 h-4" />
          </button>
        </Link>
        <button className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors">
          <Clock className="w-4 h-4" />
        </button>
        <button className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors">
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* User avatar */}
        <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[11px] font-semibold text-secondary-foreground ml-1.5 shrink-0">
          U
        </div>
      </div>
    </header>
  );
}
