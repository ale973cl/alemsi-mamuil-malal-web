import 'server-only';
import type { QueryResultRow } from 'pg';
import { db as sharedDb, query as sharedQuery } from '@/lib/db/pool';

export function db() {
  return sharedDb();
}

export async function query<T extends QueryResultRow = Record<string, unknown>>(text: string, values: unknown[] = []) {
  return sharedQuery<T>(text, values);
}
