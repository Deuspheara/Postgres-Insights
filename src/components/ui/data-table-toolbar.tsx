"use client"

import * as React from "react"
import { Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

function DataTableToolbar({
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  rowCount,
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  searchPlaceholder?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  rowCount?: number
  children?: React.ReactNode
}) {
  return (
    <div
      data-slot="data-table-toolbar"
      className={cn("flex items-center gap-2", className)}
      {...props}
    >
      {/* Search */}
      {onSearchChange && (
        <div className="relative min-w-48">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>
      )}

      {/* Row count */}
      {rowCount !== undefined && (
        <>
          <Separator orientation="vertical" className="h-5" />
          <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
            {rowCount} {rowCount === 1 ? "result" : "results"}
          </span>
        </>
      )}

      {/* Action buttons slot */}
      {children && (
        <div className="ml-auto flex items-center gap-2">{children}</div>
      )}
    </div>
  )
}

export { DataTableToolbar }
