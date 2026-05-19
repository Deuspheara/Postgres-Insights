import { Pool, PoolClient } from "pg";
import { loadSettings } from "./settings";

let _pool: Pool | null = null;
let _connectionString: string | null = null;

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

export function getPool(): Pool {
  const settings = loadSettings();
  const cs = settings.connection?.connectionString;
  if (!cs) throw new Error("No database connection configured. Go to Settings to connect.");

  if (_pool && _connectionString === cs) return _pool;

  if (_pool) {
    _pool.end().catch(() => {});
  }

  _pool = new Pool({
    ...poolOptions(cs),
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
    application_name: "pg-insights",
  });

  _pool.on("error", (err) => {
    console.error("Pool error:", err.message);
  });

  _connectionString = cs;
  return _pool;
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

export function resetPool() {
  if (_pool) {
    _pool.end().catch(() => {});
    _pool = null;
    _connectionString = null;
  }
}
