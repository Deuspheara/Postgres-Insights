"use client";

import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import type { ConnectionConfig } from "@/types";

interface SettingsData {
  activeConnectionId: string | null;
  connections: ConnectionConfig[];
}

const ActiveConnectionContext = createContext<string | null>(null);

export function ActiveConnectionProvider({ children }: { children: React.ReactNode }) {
  const { data: settings } = useQuery<SettingsData>({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then((r) => r.json()),
    staleTime: 30_000,
  });

  const activeConnectionId = settings?.activeConnectionId ?? null;

  return (
    <ActiveConnectionContext.Provider value={activeConnectionId}>
      {children}
    </ActiveConnectionContext.Provider>
  );
}

export function useActiveConnectionId() {
  return useContext(ActiveConnectionContext);
}

export function useActiveConnection() {
  const activeId = useContext(ActiveConnectionContext);
  const { data: settings } = useQuery<SettingsData>({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then((r) => r.json()),
    staleTime: 30_000,
  });

  if (!activeId || !settings?.connections) return null;
  return settings.connections.find((c) => c.id === activeId) ?? null;
}

export function ConnectionTransition({ children }: { children: React.ReactNode }) {
  const activeId = useActiveConnectionId();
  const [displayId, setDisplayId] = useState<string | null>(activeId);
  const [isFading, setIsFading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (activeId === displayId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- animation state triggered by context change
    setIsFading(true);
    timerRef.current = setTimeout(() => {
      setDisplayId(activeId);
      setIsFading(false);
    }, 200);
    return () => clearTimeout(timerRef.current);
  }, [activeId, displayId]);

  return (
    <main
      className={cn(
        "flex-1 overflow-auto transition-opacity duration-200",
        isFading ? "opacity-0" : "opacity-100"
      )}
    >
      {children}
    </main>
  );
}
