import path from "path";
import fs from "fs";

export const DATA_DIR = path.join(process.cwd(), "data");

export function ensureDir(dir: string = DATA_DIR): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
