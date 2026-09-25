#!/usr/bin/env node
// Local database helper.
//   node scripts/db.mjs reset [--db name] [--shim]
// Drops and recreates a LOCAL database, then applies every migration in
// supabase/migrations in order. --shim adds a stand-in for Supabase Auth
// (used by the security tests, which run without the login server).
// Never point this at a hosted database: it refuses non-local hosts.
import pg from 'pg';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);

const adminUrl = process.env.LOCAL_PG_URL ?? 'postgres://postgres:postgres@127.0.0.1:5432/postgres';
const dbName = opt('--db', process.env.LOCAL_DB_NAME ?? 'shopfront');
const host = new URL(adminUrl).hostname;
if (!['127.0.0.1', 'localhost', 'postgres', 'db'].includes(host)) {
  console.error(`Refusing to reset a database on "${host}". This tool is for local databases only.`);
  process.exit(1);
}
if (!/^[a-z0-9_]+$/.test(dbName)) throw new Error('Database name may only contain a-z, 0-9 and _');

export async function reset({ db = dbName, shim = flag('--shim'), afterRoles } = {}) {
  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  await admin.query(`select pg_terminate_backend(pid) from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()`, [db]);
  await admin.query(`drop database if exists ${db}`);
  await admin.query(`create database ${db}`);
  await admin.end();

  const url = new URL(adminUrl);
  url.pathname = `/${db}`;
  const client = new pg.Client({ connectionString: url.toString() });
  await client.connect();
  const run = async (file) => {
    await client.query(readFileSync(file, 'utf8'));
  };
  await run(join(root, 'supabase/local/00-roles.sql'));
  if (shim) await run(join(root, 'supabase/local/01-auth-shim.sql'));
  if (afterRoles) await afterRoles(url.toString());
  const dir = join(root, 'supabase/migrations');
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    try {
      await run(join(dir, f));
    } catch (e) {
      console.error(`Migration ${f} failed: ${e.message}`);
      throw e;
    }
  }
  await client.end();
  return url.toString();
}

if (process.argv[1] === fileURLToPath(import.meta.url) && args[0] === 'reset') {
  reset().then((u) => console.log(`Database ready: ${u.replace(/:[^:@/]+@/, ':****@')}`)).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
