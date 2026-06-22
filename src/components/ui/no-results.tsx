"use client"

import * as React from "react"
import { SearchX } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function NoResults({
  query,
  onClear,
  title = "No results found",
  description = "Try adjusting your search or filters",
  className,
  ...props
}: React.ComponentProps<"div"> & {
  query?: string
  onClear?: () => void
  title?: string
  description?: string
}) {
  return (
    <div
      data-slot="no-results"
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        className
      )}
      {...props}
    >
      <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-muted">
        <SearchX className="size-6 text-muted-foreground" />
      </div>
      <h4 className="text-sm font-semibold">{title}</h4>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">
        {query ? `No results for "${query}". ` : ""}
        {description}
      </p>
      {onClear && (
        <Button variant="link" size="xs" onClick={onClear} className="mt-2">
          Clear filters
        </Button>
      )}
    </div>
  )
}

export { NoResults }
