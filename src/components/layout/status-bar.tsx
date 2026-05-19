"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function StatusBar() {
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then((r) => r.json()),
    staleTime: 30_000,
  });

  const queryClient = useQueryClient();
  const schema = queryClient.getQueryData<{ capturedAt?: string }>(["schema"]);

  const connected = !!settings?.connection;
  const safeMode = settings?.safetyConfig?.safeMode ?? true;
  const refreshed = schema?.capturedAt ? timeAgo(schema.capturedAt) : null;

  return (
    <footer className="h-7 flex items-center px-4 gap-3 bg-muted/60 shrink-0">
      <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest uppercase text-muted-foreground">
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full shrink-0",
            connected ? "bg-green-500" : "bg-muted-foreground/40"
          )}
        />
        <span>
          {connected ? "Connected" : "Not connected"}
          {refreshed && ` · Refreshed: ${refreshed}`}
          {" · "}AI Safe Mode: {safeMode ? "On" : "Off"}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-4 text-[10px] font-mono tracking-widest uppercase text-muted-foreground/60">
        <span className="hover:text-muted-foreground cursor-pointer transition-colors">Health</span>
        <span className="hover:text-muted-foreground cursor-pointer transition-colors">Latency</span>
        <span className="hover:text-muted-foreground cursor-pointer transition-colors">Privacy</span>
      </div>
    </footer>
  );
}
