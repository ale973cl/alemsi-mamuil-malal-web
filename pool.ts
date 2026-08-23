import 'server-only';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __alemsiPool: Pool | undefined;
}

function databaseUrl(): string {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) throw new Error('DATABASE_URL no configurada.');
  return value;
}

export function db(): Pool {
  if (!global.__alemsiPool) {
    global.__alemsiPool = new Pool({
      connectionString: databaseUrl(),
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });
  }
  return global.__alemsiPool;
}

export async function query<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
  const result = await db().query<T>(sql, params);
  return result.rows;
}

export async function inTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const value = await fn(client);
    await client.query('COMMIT');
    return value;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
