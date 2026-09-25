// Test helpers: run SQL as a specific logged-in user, exactly the way the app
// (and Supabase's API) does — by switching to the `authenticated` role and
// setting the user's identity for the duration of one transaction.
import pg from 'pg';

export const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://postgres:postgres@127.0.0.1:5432/shopfront_test';

export const pool = new pg.Pool({ connectionString: TEST_DB_URL, max: 4 });

export type Who = { id: string; email: string } | 'anon';

type Q = <T extends pg.QueryResultRow = any>(sql: string, params?: unknown[]) => Promise<pg.QueryResult<T>>;

/** Runs fn as `who` inside a transaction that is always rolled back. */
export async function as<T>(who: Who, fn: (q: Q) => Promise<T>, { commit = false } = {}): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    if (who === 'anon') {
      await client.query(`select set_config('request.jwt.claims', '{"role":"anon"}', true)`);
      await client.query('set local role anon');
    } else {
      const claims = JSON.stringify({ sub: who.id, email: who.email, role: 'authenticated' });
      await client.query(`select set_config('request.jwt.claims', $1, true)`, [claims]);
      await client.query('set local role authenticated');
    }
    const q: Q = (sql, params) => client.query(sql, params as any[]);
    const result = await fn(q);
    await client.query(commit ? 'commit' : 'rollback');
    return result;
  } catch (e) {
    await client.query('rollback').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/** Superuser access for setting up fixtures (bypasses all rules). */
export async function admin<T extends pg.QueryResultRow = any>(sql: string, params?: unknown[]) {
  return pool.query<T>(sql, params as any[]);
}

/** Expects the promise to be refused by the database. Returns the error. */
export async function refused(p: Promise<unknown>): Promise<pg.DatabaseError> {
  try {
    await p;
  } catch (e) {
    return e as pg.DatabaseError;
  }
  throw new Error('Expected the database to refuse this, but it was allowed.');
}
