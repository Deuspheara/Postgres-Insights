"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  Code2,
  BarChart3,
  Lightbulb,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/explore", label: "Explore", icon: Search },
  { href: "/query", label: "Query", icon: Code2 },
  { href: "/insights", label: "Insights", icon: Lightbulb },
  { href: "/dashboards", label: "Dashboards", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-[60px] bg-sidebar shrink-0 h-full">
      <nav className="flex-1 flex flex-col items-center pt-3 pb-2 gap-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 w-full py-2 px-1"
            >
              <div
                className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                  active ? "bg-primary" : "hover:bg-accent"
                )}
              >
                <Icon
                  className={cn(
                    "w-[18px] h-[18px] transition-colors",
                    active ? "text-primary-foreground" : "text-muted-foreground"
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium leading-none transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Settings pinned at bottom */}
      <div className="flex flex-col items-center pb-3">
        <Link href="/settings" className="flex flex-col items-center gap-1 w-full py-2 px-1">
          <div
            className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
              pathname === "/settings" ? "bg-primary" : "hover:bg-accent"
            )}
          >
            <Settings
              className={cn(
                "w-[18px] h-[18px] transition-colors",
                pathname === "/settings" ? "text-primary-foreground" : "text-muted-foreground"
              )}
            />
          </div>
          <span
            className={cn(
              "text-[10px] font-medium leading-none transition-colors",
              pathname === "/settings" ? "text-primary" : "text-muted-foreground"
            )}
          >
            Settings
          </span>
        </Link>
      </div>
    </aside>
  );
}
