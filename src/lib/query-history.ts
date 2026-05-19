import path from "path";
import fs from "fs";
import type { QueryHistoryEntry } from "@/types";
import { ensureDir } from "./fs-utils";

const DATA_DIR = path.join(process.cwd(), "data");
const MAX_HISTORY = 200;

function filePath(connectionId: string) {
  return path.join(DATA_DIR, connectionId, "query_history.json");
}

export function getQueryHistory(connectionId: string): QueryHistoryEntry[] {
  const fp = filePath(connectionId);
  if (!fs.existsSync(fp)) return [];
  try {
    return JSON.parse(fs.readFileSync(fp, "utf-8")) as QueryHistoryEntry[];
  } catch {
    return [];
  }
}

export function addQueryHistory(connectionId: string, entry: QueryHistoryEntry): void {
  ensureDir(path.join(DATA_DIR, connectionId));
  const all = getQueryHistory(connectionId);
  all.unshift(entry);
  if (all.length > MAX_HISTORY) all.length = MAX_HISTORY;
  fs.writeFileSync(filePath(connectionId), JSON.stringify(all, null, 2));
}

export function clearQueryHistory(connectionId: string): void {
  const fp = filePath(connectionId);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
}
