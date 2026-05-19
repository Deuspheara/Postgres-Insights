import type { ChartType } from "@/types";

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tiles: Array<{
    title: string;
    chartType: ChartType;
    sqlPattern: string;
    w: number;
    h: number;
    hint: string;
  }>;
}

export const DASHBOARD_TEMPLATES: DashboardTemplate[] = [
  {
    id: "sales-overview",
    name: "Sales Overview",
    description: "Track revenue, orders, and sales performance metrics",
    category: "Sales",
    tiles: [
      {
        title: "Total Revenue",
        chartType: "kpi",
        sqlPattern: "SELECT SUM(amount) AS total_revenue FROM orders WHERE created_at >= NOW() - INTERVAL '30 days'",
        w: 3,
        h: 3,
        hint: "Find a table with order amounts",
      },
      {
        title: "Total Orders",
        chartType: "kpi",
        sqlPattern: "SELECT COUNT(*) AS total_orders FROM orders WHERE created_at >= NOW() - INTERVAL '30 days'",
        w: 3,
        h: 3,
        hint: "Find an orders table",
      },
      {
        title: "Daily Revenue Trend",
        chartType: "line",
        sqlPattern: "SELECT date_trunc('day', created_at) AS day, SUM(amount) AS revenue FROM orders WHERE created_at >= NOW() - INTERVAL '90 days' GROUP BY 1 ORDER BY 1",
        w: 6,
        h: 5,
        hint: "Use date_trunc for time series",
      },
      {
        title: "Revenue by Product",
        chartType: "bar",
        sqlPattern: "SELECT product_name, SUM(amount) AS revenue FROM orders GROUP BY 1 ORDER BY 2 DESC LIMIT 10",
        w: 6,
        h: 5,
        hint: "Group by product/category",
      },
      {
        title: "Order Status Distribution",
        chartType: "donut",
        sqlPattern: "SELECT status, COUNT(*) AS count FROM orders GROUP BY 1 ORDER BY 2 DESC",
        w: 4,
        h: 5,
        hint: "Find a status column",
      },
      {
        title: "Recent Orders",
        chartType: "table",
        sqlPattern: "SELECT * FROM orders ORDER BY created_at DESC LIMIT 50",
        w: 12,
        h: 8,
        hint: "Show raw order data",
      },
    ],
  },
  {
    id: "user-analytics",
    name: "User Analytics",
    description: "Monitor user growth, activity, and engagement",
    category: "Analytics",
    tiles: [
      {
        title: "Total Users",
        chartType: "kpi",
        sqlPattern: "SELECT COUNT(*) AS total_users FROM users",
        w: 3,
        h: 3,
        hint: "Find a users table",
      },
      {
        title: "Active Users (30d)",
        chartType: "kpi",
        sqlPattern: "SELECT COUNT(DISTINCT user_id) AS active_users FROM user_activity WHERE created_at >= NOW() - INTERVAL '30 days'",
        w: 3,
        h: 3,
        hint: "Find activity/login table",
      },
      {
        title: "User Signups Over Time",
        chartType: "area",
        sqlPattern: "SELECT date_trunc('week', created_at) AS week, COUNT(*) AS new_users FROM users GROUP BY 1 ORDER BY 1",
        w: 6,
        h: 5,
        hint: "Use created_at for signups",
      },
      {
        title: "Users by Country",
        chartType: "bar",
        sqlPattern: "SELECT country, COUNT(*) AS users FROM users GROUP BY 1 ORDER BY 2 DESC LIMIT 10",
        w: 6,
        h: 5,
        hint: "Find location/country column",
      },
      {
        title: "User Role Distribution",
        chartType: "pie",
        sqlPattern: "SELECT role, COUNT(*) AS count FROM users GROUP BY 1 ORDER BY 2 DESC",
        w: 4,
        h: 5,
        hint: "Find role/type column",
      },
    ],
  },
  {
    id: "performance-metrics",
    name: "Performance Metrics",
    description: "Track system performance, response times, and errors",
    category: "Monitoring",
    tiles: [
      {
        title: "Avg Response Time",
        chartType: "kpi",
        sqlPattern: "SELECT AVG(response_time_ms) AS avg_response_time FROM requests WHERE created_at >= NOW() - INTERVAL '1 hour'",
        w: 3,
        h: 3,
        hint: "Find requests/logs table with timing",
      },
      {
        title: "Error Rate",
        chartType: "kpi",
        sqlPattern: "SELECT COUNT(*) FILTER (WHERE status >= 500) * 100.0 / COUNT(*) AS error_rate FROM requests WHERE created_at >= NOW() - INTERVAL '1 hour'",
        w: 3,
        h: 3,
        hint: "Find status code column",
      },
      {
        title: "Response Time Trend",
        chartType: "line",
        sqlPattern: "SELECT date_trunc('hour', created_at) AS hour, AVG(response_time_ms) AS avg_time FROM requests WHERE created_at >= NOW() - INTERVAL '7 days' GROUP BY 1 ORDER BY 1",
        w: 6,
        h: 5,
        hint: "Track response time over time",
      },
      {
        title: "Requests by Endpoint",
        chartType: "bar",
        sqlPattern: "SELECT endpoint, COUNT(*) AS requests FROM requests GROUP BY 1 ORDER BY 2 DESC LIMIT 10",
        w: 6,
        h: 5,
        hint: "Find endpoint/path column",
      },
      {
        title: "Error Distribution",
        chartType: "stacked-bar",
        sqlPattern: "SELECT date_trunc('hour', created_at) AS hour, status, COUNT(*) AS count FROM requests WHERE status >= 400 GROUP BY 1, 2 ORDER BY 1",
        w: 8,
        h: 5,
        hint: "Stack errors by type",
      },
    ],
  },
  {
    id: "financial-summary",
    name: "Financial Summary",
    description: "Revenue, expenses, and profit margins overview",
    category: "Finance",
    tiles: [
      {
        title: "Total Revenue",
        chartType: "kpi",
        sqlPattern: "SELECT SUM(amount) AS revenue FROM transactions WHERE type = 'revenue' AND created_at >= NOW() - INTERVAL '30 days'",
        w: 3,
        h: 3,
        hint: "Find transactions/invoices table",
      },
      {
        title: "Total Expenses",
        chartType: "kpi",
        sqlPattern: "SELECT SUM(amount) AS expenses FROM transactions WHERE type = 'expense' AND created_at >= NOW() - INTERVAL '30 days'",
        w: 3,
        h: 3,
        hint: "Find expense records",
      },
      {
        title: "Profit Margin",
        chartType: "kpi",
        sqlPattern: "SELECT (SUM(CASE WHEN type = 'revenue' THEN amount ELSE 0 END) - SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END)) * 100.0 / NULLIF(SUM(CASE WHEN type = 'revenue' THEN amount ELSE 0 END), 0) AS margin FROM transactions WHERE created_at >= NOW() - INTERVAL '30 days'",
        w: 3,
        h: 3,
        hint: "Calculate profit percentage",
      },
      {
        title: "Monthly Revenue vs Expenses",
        chartType: "stacked-bar",
        sqlPattern: "SELECT date_trunc('month', created_at) AS month, type, SUM(amount) AS amount FROM transactions WHERE created_at >= NOW() - INTERVAL '12 months' GROUP BY 1, 2 ORDER BY 1",
        w: 8,
        h: 5,
        hint: "Compare revenue and expenses",
      },
      {
        title: "Revenue by Category",
        chartType: "donut",
        sqlPattern: "SELECT category, SUM(amount) AS revenue FROM transactions WHERE type = 'revenue' GROUP BY 1 ORDER BY 2 DESC",
        w: 4,
        h: 5,
        hint: "Break down by category",
      },
    ],
  },
];

export function matchTemplateToSchema(template: DashboardTemplate, tables: string[]): DashboardTemplate {
  const matched = { ...template, tiles: template.tiles.map((tile) => ({ ...tile })) };
  
  for (const tile of matched.tiles) {
    let sql = tile.sqlPattern;
    
    for (const table of tables) {
      const tableName = table.split(".").pop()?.toLowerCase() || "";
      
      if (tableName.includes("order") || tableName.includes("sale")) {
        sql = sql.replace(/FROM orders/g, `FROM ${table}`);
        sql = sql.replace(/FROM user_activity/g, `FROM ${table}`);
      }
      if (tableName.includes("user") || tableName.includes("customer")) {
        sql = sql.replace(/FROM users/g, `FROM ${table}`);
      }
      if (tableName.includes("request") || tableName.includes("log")) {
        sql = sql.replace(/FROM requests/g, `FROM ${table}`);
      }
      if (tableName.includes("transaction") || tableName.includes("payment") || tableName.includes("invoice")) {
        sql = sql.replace(/FROM transactions/g, `FROM ${table}`);
      }
    }
    
    tile.sqlPattern = sql;
  }
  
  return matched;
}
