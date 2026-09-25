import 'server-only';
import pg from 'pg';
import { env } from '@/lib/env';
import type { SessionUser } from '@/lib/auth';

// Every query runs inside a transaction as the logged-in person
// (role "authenticated" + their user id), so the database's own security
// rules decide what they can see and change. This app never uses a
// rule-bypassing connection for normal work.

declare global {
  var __shopfrontPool: pg.Pool | undefined;
}

function isLocal(url: string) {
  const host = new URL(url).hostname;
  return host === '127.0.0.1' || host === 'localhost';
}

function pool() {
  if (!globalThis.__shopfrontPool) {
    const url = env.databaseUrl;
    const ca = env.databaseCaCert;
    globalThis.__shopfrontPool = new pg.Pool({
      connectionString: url.replace(/[?&]sslmode=[^&]+/, ''),
      max: Number(process.env.DATABASE_POOL_SIZE ?? 5),
      idleTimeoutMillis: 10_000,
      ssl: isLocal(url) ? false : ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false },
    });
    if (!isLocal(url) && !ca) {
      console.warn('DATABASE_CA_CERT is not set: the database connection is encrypted but the server certificate is not verified.');
    }
  }
  return globalThis.__shopfrontPool;
}

export type Db = {
  query<T extends pg.QueryResultRow = pg.QueryResultRow>(sql: string, params?: unknown[]): Promise<T[]>;
  one<T extends pg.QueryResultRow = pg.QueryResultRow>(sql: string, params?: unknown[]): Promise<T | null>;
};

async function run<T>(claims: Record<string, unknown>, role: 'authenticated' | 'anon', fn: (db: Db) => Promise<T>) {
  const client = await pool().connect();
  try {
    await client.query('begin');
    await client.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(claims)]);
    await client.query(role === 'anon' ? 'set local role anon' : 'set local role authenticated');
    const db: Db = {
      query: async (sql, params) => (await client.query(sql, params as unknown[])).rows,
      one: async (sql, params) => (await client.query(sql, params as unknown[])).rows[0] ?? null,
    };
    const result = await fn(db);
    await client.query('commit');
    return result;
  } catch (e) {
    await client.query('rollback').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

export function withUser<T>(user: SessionUser, fn: (db: Db) => Promise<T>) {
  return run({ sub: user.id, email: user.email, role: 'authenticated' }, 'authenticated', fn);
}

export function withAnon<T>(fn: (db: Db) => Promise<T>) {
  return run({ role: 'anon' }, 'anon', fn);
}
