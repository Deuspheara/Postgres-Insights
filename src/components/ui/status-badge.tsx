"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const variantStyles: Record<string, Record<string, string>> = {
  status: {
    active:
      "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300",
    inactive: "bg-muted text-muted-foreground border-border",
    error:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
    pending:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  severity: {
    critical:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
    warning:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
    info: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
  },
  environment: {
    dev: "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300",
    staging:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
    prod: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
  },
  category: {
    data_quality:
      "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950 dark:text-cyan-300",
    performance:
      "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300",
    schema_hygiene:
      "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
  },
  trend: {
    up: "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300",
    down: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
    neutral: "bg-muted text-muted-foreground border-border",
  },
};

export type StatusBadgeProps = {
  variant?: "status" | "severity" | "environment" | "category" | "trend";
  value: string;
  status?: "active" | "inactive" | "error" | "pending";
  severity?: "critical" | "warning" | "info";
  environment?: "dev" | "staging" | "prod";
  category?: "data_quality" | "performance" | "schema_hygiene";
  trend?: "up" | "down" | "neutral";
  className?: string;
};

function StatusBadge({
  className,
  variant = "status",
  status,
  severity,
  environment,
  category,
  trend,
  value,
}: StatusBadgeProps) {
  const subKey = status ?? severity ?? environment ?? category ?? trend;

  const colorClass =
    subKey && variantStyles[variant]?.[subKey]
      ? variantStyles[variant][subKey]
      : "";

  return (
    <Badge variant="outline" className={cn(colorClass, className)}>
      {value}
    </Badge>
  );
}

export { StatusBadge };
