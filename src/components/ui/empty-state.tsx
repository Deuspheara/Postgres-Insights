"use client"

import * as React from "react"
import { Inbox } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  icon?: React.ElementType
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: "default" | "outline"
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
}) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center py-16 text-center",
        className
      )}
      {...props}
    >
      <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted">
        <Icon className="size-8 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      <div className="mt-4 flex items-center gap-2">
        {action && (
          <Button
            variant={action.variant || "default"}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )}
        {secondaryAction && (
          <Button variant="outline" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  )
}

export { EmptyState }
