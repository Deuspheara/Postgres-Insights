import { Pool, PoolClient } from "pg";
import { loadSettings } from "./settings";
import { POOL_MAX, POOL_IDLE_TIMEOUT_MS, POOL_CONNECTION_TIMEOUT_MS } from "./constants";

const pools = new Map<string, Pool>();

function isRemoteHost(connectionString: string): boolean {
  try {
    const url = new URL(connectionString);
    const host = url.hostname;
    return host !== "localhost" && host !== "127.0.0.1" && host !== "::1";
  } catch {
    return false;
  }
}

function poolOptions(connectionString: string) {
  return {
    connectionString,
    ssl: isRemoteHost(connectionString) ? { rejectUnauthorized: false } : undefined,
  };
}

function resolveConnectionId(connectionId?: string): string {
  const settings = loadSettings();
  const id = connectionId ?? settings.activeConnectionId;
  if (!id) throw new Error("No active connection. Go to Settings to select one.");
  return id;
}

function resolveConnectionString(connectionId?: string): string {
  const settings = loadSettings();
  const id = resolveConnectionId(connectionId);
  const conn = settings.connections.find((c) => c.id === id);
  if (!conn) throw new Error(`Connection "${id}" not found.`);
  return conn.connectionString;
}

export function getPool(connectionId?: string): Pool {
  const id = resolveConnectionId(connectionId);
  const existing = pools.get(id);
  if (existing) return existing;

  const cs = resolveConnectionString(id);

  const pool = new Pool({
    ...poolOptions(cs),
    max: POOL_MAX,
    idleTimeoutMillis: POOL_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: POOL_CONNECTION_TIMEOUT_MS,
    application_name: "pg-insights",
  });

  pool.on("error", (err) => {
    console.error("Pool error:", err.message);
  });

  pools.set(id, pool);
  return pool;
}

export async function withClient<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export async function testConnection(connectionString: string): Promise<{ ok: boolean; error?: string; version?: string }> {
  const testPool = new Pool({
    ...poolOptions(connectionString),
    max: 1,
    connectionTimeoutMillis: 10000,
    application_name: "pg-insights-test",
  });
  try {
    const res = await testPool.query("SELECT version()");
    return { ok: true, version: res.rows[0].version as string };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  } finally {
    await testPool.end();
  }
}

export function resetPool(connectionId?: string) {
  const settings = loadSettings();
  const id = connectionId ?? settings.activeConnectionId;
  if (!id || !pools.has(id)) return;
  pools.get(id)!.end().catch((err) => { console.warn("Pool shutdown warning:", (err as Error).message); });
  pools.delete(id);
}
