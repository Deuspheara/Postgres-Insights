"use client"

import * as React from "react"
import { Search, ArrowUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

function FilterBar({
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  filters,
  sortOptions,
  sortValue,
  onSortChange,
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  searchPlaceholder?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  filters?: Array<{
    label: string
    value: string
    active: boolean
    onClick: () => void
  }>
  sortOptions?: Array<{ label: string; value: string }>
  sortValue?: string
  onSortChange?: (value: string) => void
  children?: React.ReactNode
}) {
  return (
    <div
      data-slot="filter-bar"
      className={cn("flex items-center gap-2 flex-wrap", className)}
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

      {/* Filter chips */}
      {filters && filters.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {filters.map((filter) => (
            <Badge
              key={filter.value}
              variant={filter.active ? "default" : "outline"}
              className="cursor-pointer select-none"
              onClick={filter.onClick}
            >
              {filter.label}
            </Badge>
          ))}
        </div>
      )}

      {/* Sort dropdown */}
      {sortOptions && sortOptions.length > 0 && onSortChange && (
        <Select value={sortValue} onValueChange={onSortChange}>
          <SelectTrigger size="sm" className="w-auto min-w-28">
            <ArrowUpDown className="size-3 text-muted-foreground" />
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent align="end">
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Extra actions slot */}
      {children && (
        <div className="ml-auto flex items-center gap-2">{children}</div>
      )}
    </div>
  )
}

export { FilterBar }
