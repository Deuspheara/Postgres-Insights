"use client";

import { Search, Zap, Clock, HelpCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectionSwitcher } from "@/components/layout/connection-switcher";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const PAGE_TITLES: Record<string, string> = {
  "/": "Workspace",
  "/explore": "Schema Explorer",
  "/query": "Query Editor",
  "/insights": "Insights",
  "/dashboards": "Dashboards",
  "/connections": "Connections",
  "/settings": "Settings",
};

function CurrentPageTitle() {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] ?? "Workspace";
  return (
    <span className="text-xs text-muted-foreground/70 font-medium leading-none">
      {title}
    </span>
  );
}

export function Topbar() {
  return (
    <TooltipProvider>
      <header className="h-[52px] flex items-center px-4 gap-3 bg-background shrink-0">
        {/* App title + page breadcrumb */}
        <div className="flex items-center gap-2 shrink-0">
          <h1 className="text-[15px] font-bold tracking-tight text-foreground leading-none">
            PG Insights
          </h1>
          <span className="text-muted-foreground/30 text-[10px] select-none">
            /
          </span>
          <CurrentPageTitle />
        </div>

        {/* Connection switcher */}
        <ConnectionSwitcher />

        {/* Search bar */}
        <div className="flex-1 max-w-sm mx-auto">
          <Link href="/explore">
            <div className="flex items-center gap-2 bg-muted rounded-full px-3 py-1.5 text-muted-foreground hover:bg-accent transition-colors cursor-text">
              <Search className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs flex-1 truncate">
                Search tables, schemas, dashboards, queries…
              </span>
              <kbd className="text-[10px] bg-background/80 px-1.5 py-0.5 rounded font-mono">
                ⌘K
              </kbd>
            </div>
          </Link>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 ml-auto">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/insights">
                <button className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors">
                  <Zap className="w-4 h-4" />
                </button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom">AI Insights</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/query">
                <button className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors">
                  <Clock className="w-4 h-4" />
                </button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom">Recent Queries</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors">
                <HelpCircle className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Help & Documentation</TooltipContent>
          </Tooltip>

          {/* User avatar */}
          <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[11px] font-semibold text-secondary-foreground ml-1.5 shrink-0">
            U
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
}
