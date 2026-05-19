import path from "path";
import fs from "fs";
import type { AppSettings, SafetyConfig } from "@/types";
import { DEFAULT_SAFETY_CONFIG } from "@/types";
import { ensureDir } from "./fs-utils";

const SETTINGS_PATH = path.join(process.cwd(), "data", "settings.json");

export function loadSettings(): AppSettings {
  ensureDir();
  if (!fs.existsSync(SETTINGS_PATH)) {
    return { connection: null, safetyConfig: DEFAULT_SAFETY_CONFIG };
  }
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8")) as AppSettings;
  } catch {
    return { connection: null, safetyConfig: DEFAULT_SAFETY_CONFIG };
  }
}

export function saveSettings(settings: AppSettings): void {
  ensureDir();
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

export function getSafetyConfig(): SafetyConfig {
  return loadSettings().safetyConfig ?? DEFAULT_SAFETY_CONFIG;
}
