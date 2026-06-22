"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  Plug,
  Code2,
  BarChart3,
  Lightbulb,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/explore", label: "Explore", icon: Search },
  { href: "/connections", label: "Connect", icon: Plug },
  { href: "/query", label: "Query", icon: Code2 },
  { href: "/insights", label: "Insights", icon: Lightbulb },
  { href: "/dashboards", label: "Boards", icon: BarChart3 },
];

function SidebarItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex w-full flex-col items-center gap-1.5 rounded-xl px-1 py-2 transition-colors",
        active ? "bg-white shadow-sm ring-1 ring-border/70" : "hover:bg-white/70",
      )}
      aria-current={active ? "page" : undefined}
    >
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
          active ? "bg-primary text-primary-foreground" : "text-muted-foreground group-hover:text-foreground",
        )}
      >
        <Icon className="h-[17px] w-[17px]" />
      </div>
      <span
        className={cn(
          "text-[10px] font-medium leading-none",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-[72px] shrink-0 flex-col border-r border-border/60 bg-sidebar/70 px-2 py-3 backdrop-blur">
      <div className="mb-3 flex justify-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-[11px] font-semibold tracking-tight text-primary">
          PG
        </div>
      </div>

      <nav className="flex flex-1 flex-col items-center gap-1.5 overflow-y-auto">
        {NAV.map(({ href, label, icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <SidebarItem
              key={href}
              href={href}
              label={label}
              icon={icon}
              active={active}
            />
          );
        })}
      </nav>

      <div className="mt-3 border-t border-border/60 pt-3">
        <SidebarItem
          href="/settings"
          label="Settings"
          icon={Settings}
          active={pathname === "/settings"}
        />
      </div>
    </aside>
  );
}
