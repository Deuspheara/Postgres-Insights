import path from "path";
import fs from "fs";
import crypto from "crypto";
import type { AppSettings, SafetyConfig, ConnectionConfig } from "@/types";
import { DEFAULT_SAFETY_CONFIG } from "@/types";
import { ensureDir } from "./fs-utils";

const SETTINGS_PATH = path.join(process.cwd(), "data", "settings.json");

interface OldSettings {
  connection: ConnectionConfig | null;
  safetyConfig: SafetyConfig;
  lastConnectedAt?: string;
}

function generateId(): string {
  return crypto.randomUUID();
}

export function loadSettings(): AppSettings {
  ensureDir();
  if (!fs.existsSync(SETTINGS_PATH)) {
    return { connections: [], activeConnectionId: null, safetyConfig: DEFAULT_SAFETY_CONFIG };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8"));
    if ("connections" in raw || !("connection" in raw)) {
      return raw as AppSettings;
    }
    const old = raw as OldSettings;
    const migrated: AppSettings = {
      connections: [],
      activeConnectionId: null,
      safetyConfig: old.safetyConfig ?? DEFAULT_SAFETY_CONFIG,
    };
    if (old.connection) {
      const conn: ConnectionConfig = { ...old.connection };
      if (!conn.id) conn.id = generateId();
      if (!conn.name) conn.name = "Default";
      migrated.connections = [conn];
      migrated.activeConnectionId = conn.id;
    }
    saveSettings(migrated);
    return migrated;
  } catch {
    return { connections: [], activeConnectionId: null, safetyConfig: DEFAULT_SAFETY_CONFIG };
  }
}

export function saveSettings(settings: AppSettings): void {
  ensureDir();
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

export function getSafetyConfig(): SafetyConfig {
  return loadSettings().safetyConfig ?? DEFAULT_SAFETY_CONFIG;
}

export function getActiveConnectionId(): string | null {
  return loadSettings().activeConnectionId;
}

export function getActiveConnection(): ConnectionConfig | null {
  const settings = loadSettings();
  if (!settings.activeConnectionId) return null;
  return settings.connections.find((c) => c.id === settings.activeConnectionId) ?? null;
}

export function getConnection(id: string): ConnectionConfig | null {
  return loadSettings().connections.find((c) => c.id === id) ?? null;
}
