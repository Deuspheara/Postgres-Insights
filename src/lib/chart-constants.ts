import type { ChartType } from "@/types";
import { BarChart3, Hash, Table2, TrendingUp, PieChart } from "lucide-react";

export interface ChartTypeEntry {
  value: ChartType;
  label: string;
  icon: React.ElementType;
  desc: string;
  sqlHint?: string;
  defaultW?: number;
}

export const CHART_TYPES: ChartTypeEntry[] = [
  { value: "kpi", label: "KPI", icon: Hash, desc: "Single big metric, optional sparkline", sqlHint: "SELECT COUNT(*) AS total_records\nFROM your_table", defaultW: 3 },
  { value: "line", label: "Line", icon: TrendingUp, desc: "Trend over time", sqlHint: "SELECT date_trunc('day', created_at) AS day,\n       COUNT(*) AS events\nFROM your_table\nGROUP BY 1\nORDER BY 1 DESC\nLIMIT 60", defaultW: 6 },
  { value: "bar", label: "Bar", icon: BarChart3, desc: "Compare categories", sqlHint: "SELECT category,\n       COUNT(*) AS count\nFROM your_table\nGROUP BY 1\nORDER BY 2 DESC\nLIMIT 15", defaultW: 6 },
  { value: "area", label: "Area", icon: TrendingUp, desc: "Volume / cumulative over time", sqlHint: "SELECT date_trunc('week', created_at) AS week,\n       SUM(amount) AS revenue\nFROM your_table\nGROUP BY 1\nORDER BY 1", defaultW: 8 },
  { value: "stacked-bar", label: "Stacked", icon: BarChart3, desc: "Multi-series stacked bars", sqlHint: "SELECT month, category,\n       COUNT(*) AS count\nFROM your_table\nGROUP BY 1, 2\nORDER BY 1", defaultW: 6 },
  { value: "donut", label: "Donut", icon: PieChart, desc: "Part-to-whole breakdown", sqlHint: "SELECT status,\n       COUNT(*) AS count\nFROM your_table\nGROUP BY 1\nORDER BY 2 DESC", defaultW: 4 },
  { value: "table", label: "Table", icon: Table2, desc: "Raw data grid", sqlHint: "SELECT *\nFROM your_table\nORDER BY created_at DESC\nLIMIT 50", defaultW: 12 },
];

export function tileMinHeight(chartType: ChartType): number {
  if (chartType === "kpi") return 176;
  if (chartType === "table") return 340;
  return 280;
}
