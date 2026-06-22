"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function PageHeader({
  title,
  description,
  actions,
  status,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  title: string
  description?: string
  actions?: React.ReactNode
  status?: React.ReactNode
}) {
  return (
    <div
      data-slot="page-header"
      className={cn(
        "flex items-end justify-between gap-4 flex-wrap",
        className
      )}
      {...props}
    >
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        {status && (
          <div className="flex items-center gap-2 mt-1">{status}</div>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  )
}

export { PageHeader }
