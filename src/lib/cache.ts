import path from "path";
import fs from "fs";
import type { SchemaInfo, TableProfile, AISuggestions, Dashboard, SavedQuery } from "@/types";
import { ensureDir } from "./fs-utils";

const DATA_DIR = path.join(process.cwd(), "data");

function filePath(connectionId: string, name: string) {
  return path.join(DATA_DIR, connectionId, name);
}

function readJson<T>(connectionId: string, name: string): T | null {
  ensureDir(path.join(DATA_DIR, connectionId));
  const fp = filePath(connectionId, name);
  if (!fs.existsSync(fp)) return null;
  try {
    return JSON.parse(fs.readFileSync(fp, "utf-8")) as T;
  } catch {
    return null;
  }
}

function writeJson<T>(connectionId: string, name: string, data: T): void {
  ensureDir(path.join(DATA_DIR, connectionId));
  fs.writeFileSync(filePath(connectionId, name), JSON.stringify(data, null, 2));
}

// ─── Schema cache ─────────────────────────────────────────────────────────────

export function getCachedSchema(connectionId: string): SchemaInfo | null {
  return readJson<SchemaInfo>(connectionId, "schema.json");
}

export function setCachedSchema(connectionId: string, schema: SchemaInfo): void {
  writeJson(connectionId, "schema.json", schema);
}

// ─── Profile cache ────────────────────────────────────────────────────────────

export function getCachedProfile(connectionId: string, tableName: string): TableProfile | null {
  return readJson<TableProfile>(connectionId, `profile_${tableName.replace(/\./g, "_")}.json`);
}

export function setCachedProfile(connectionId: string, profile: TableProfile): void {
  writeJson(connectionId, `profile_${profile.tableName.replace(/\./g, "_")}.json`, profile);
}

// ─── AI suggestions cache ─────────────────────────────────────────────────────

export function getCachedSuggestions(connectionId: string): AISuggestions | null {
  return readJson<AISuggestions>(connectionId, "suggestions.json");
}

export function setCachedSuggestions(connectionId: string, suggestions: AISuggestions): void {
  writeJson(connectionId, "suggestions.json", suggestions);
}

// ─── Dashboards ───────────────────────────────────────────────────────────────

export function getAllDashboards(connectionId: string): Dashboard[] {
  return readJson<Dashboard[]>(connectionId, "dashboards.json") ?? [];
}

export function getDashboard(connectionId: string, id: string): Dashboard | null {
  return getAllDashboards(connectionId).find((d) => d.id === id) ?? null;
}

export function saveDashboard(connectionId: string, dashboard: Dashboard): void {
  const all = getAllDashboards(connectionId);
  const idx = all.findIndex((d) => d.id === dashboard.id);
  if (idx >= 0) all[idx] = dashboard;
  else all.push(dashboard);
  writeJson(connectionId, "dashboards.json", all);
}

export function deleteDashboard(connectionId: string, id: string): void {
  const all = getAllDashboards(connectionId).filter((d) => d.id !== id);
  writeJson(connectionId, "dashboards.json", all);
}

// ─── Saved queries ────────────────────────────────────────────────────────────

export function getAllSavedQueries(connectionId: string): SavedQuery[] {
  return readJson<SavedQuery[]>(connectionId, "saved_queries.json") ?? [];
}

export function saveQuery(connectionId: string, query: SavedQuery): void {
  const all = getAllSavedQueries(connectionId);
  const idx = all.findIndex((q) => q.id === query.id);
  if (idx >= 0) all[idx] = query;
  else all.push(query);
  writeJson(connectionId, "saved_queries.json", all);
}

export function deleteQuery(connectionId: string, id: string): void {
  const all = getAllSavedQueries(connectionId).filter((q) => q.id !== id);
  writeJson(connectionId, "saved_queries.json", all);
}
