import path from "path";
import fs from "fs";
import type { SchemaInfo, TableProfile, AISuggestions, Dashboard, SavedQuery } from "@/types";
import { ensureDir } from "./fs-utils";

const DATA_DIR = path.join(process.cwd(), "data");

function filePath(name: string) {
  return path.join(DATA_DIR, name);
}

function readJson<T>(name: string): T | null {
  ensureDir();
  const fp = filePath(name);
  if (!fs.existsSync(fp)) return null;
  try {
    return JSON.parse(fs.readFileSync(fp, "utf-8")) as T;
  } catch {
    return null;
  }
}

function writeJson<T>(name: string, data: T): void {
  ensureDir();
  fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2));
}

// ─── Schema cache ─────────────────────────────────────────────────────────────

export function getCachedSchema(): SchemaInfo | null {
  return readJson<SchemaInfo>("schema.json");
}

export function setCachedSchema(schema: SchemaInfo): void {
  writeJson("schema.json", schema);
}

// ─── Profile cache ────────────────────────────────────────────────────────────

export function getCachedProfile(tableName: string): TableProfile | null {
  return readJson<TableProfile>(`profile_${tableName.replace(/\./g, "_")}.json`);
}

export function setCachedProfile(profile: TableProfile): void {
  writeJson(`profile_${profile.tableName.replace(/\./g, "_")}.json`, profile);
}

// ─── AI suggestions cache ─────────────────────────────────────────────────────

export function getCachedSuggestions(): AISuggestions | null {
  return readJson<AISuggestions>("suggestions.json");
}

export function setCachedSuggestions(suggestions: AISuggestions): void {
  writeJson("suggestions.json", suggestions);
}

// ─── Dashboards ───────────────────────────────────────────────────────────────

export function getAllDashboards(): Dashboard[] {
  return readJson<Dashboard[]>("dashboards.json") ?? [];
}

export function getDashboard(id: string): Dashboard | null {
  return getAllDashboards().find((d) => d.id === id) ?? null;
}

export function saveDashboard(dashboard: Dashboard): void {
  const all = getAllDashboards();
  const idx = all.findIndex((d) => d.id === dashboard.id);
  if (idx >= 0) all[idx] = dashboard;
  else all.push(dashboard);
  writeJson("dashboards.json", all);
}

export function deleteDashboard(id: string): void {
  const all = getAllDashboards().filter((d) => d.id !== id);
  writeJson("dashboards.json", all);
}

// ─── Saved queries ────────────────────────────────────────────────────────────

export function getAllSavedQueries(): SavedQuery[] {
  return readJson<SavedQuery[]>("saved_queries.json") ?? [];
}

export function saveQuery(query: SavedQuery): void {
  const all = getAllSavedQueries();
  const idx = all.findIndex((q) => q.id === query.id);
  if (idx >= 0) all[idx] = query;
  else all.push(query);
  writeJson("saved_queries.json", all);
}

export function deleteQuery(id: string): void {
  const all = getAllSavedQueries().filter((q) => q.id !== id);
  writeJson("saved_queries.json", all);
}
