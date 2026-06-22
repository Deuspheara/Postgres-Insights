"use client"

import * as React from "react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardHeader, CardContent } from "@/components/ui/card"

function MetricCard({
  label,
  value,
  sub,
  trend,
  sparklineData,
  icon: Icon,
  className,
  ...props
}: React.ComponentProps<typeof Card> & {
  label: string
  value: string | number
  sub?: string
  trend?: { direction: "up" | "down" | "neutral"; value: string }
  sparklineData?: number[]
  icon?: React.ElementType
}) {
  const TrendIcon =
    trend?.direction === "up"
      ? TrendingUp
      : trend?.direction === "down"
        ? TrendingDown
        : Minus

  const trendColors = {
    up: "text-green-600 dark:text-green-400",
    down: "text-red-600 dark:text-red-400",
    neutral: "text-muted-foreground",
  }

  const trendBgColors = {
    up: "bg-green-50 dark:bg-green-950",
    down: "bg-red-50 dark:bg-red-950",
    neutral: "bg-muted",
  }

  return (
    <Card size="sm" className={cn(className)} {...props}>
      <CardHeader>
        {Icon && (
          <div className="mb-1 flex size-8 items-center justify-center rounded-xl bg-muted">
            <Icon className="size-4 text-muted-foreground" />
          </div>
        )}
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tracking-tight tabular-nums">
          {value}
        </p>
        {sub && (
          <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
        )}
        {trend && (
          <div className="mt-1.5 flex items-center gap-1">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium",
                trendBgColors[trend.direction],
                trendColors[trend.direction]
              )}
            >
              <TrendIcon className="size-3" />
              {trend.value}
            </span>
          </div>
        )}
        {sparklineData && sparklineData.length > 0 && (
          <div className="mt-3 flex h-8 items-end gap-0.5">
            {sparklineData.map((v, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-primary/20"
                style={{ height: `${Math.max(v, 2)}%` }}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export { MetricCard }
