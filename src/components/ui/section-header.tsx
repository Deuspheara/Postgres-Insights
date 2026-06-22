"use client"

import * as React from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"

function SectionHeader({
  title,
  icon: Icon,
  action,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  title: string
  icon?: React.ElementType
  action?: { label: string; href?: string; onClick?: () => void }
}) {
  return (
    <div
      data-slot="section-header"
      className={cn("mb-3 flex items-center justify-between", className)}
      {...props}
    >
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        {Icon && <Icon className="size-4 text-muted-foreground" />}
        {title}
      </h2>
      {action && (
        <>
          {action.href ? (
            <Link
              href={action.href}
              className="text-xs font-medium text-primary hover:underline"
            >
              {action.label}
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              className="text-xs font-medium text-primary hover:underline"
            >
              {action.label}
            </button>
          )}
        </>
      )}
    </div>
  )
}

export { SectionHeader }
