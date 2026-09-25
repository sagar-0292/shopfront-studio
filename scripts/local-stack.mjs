#!/usr/bin/env node
// Runs a Supabase-compatible stack on this machine, without Docker:
//   • resets the local database and applies all migrations
//   • the real Supabase login server (GoTrue), built by scripts/build-gotrue.sh
//   • a gateway at http://127.0.0.1:54321 that looks like a Supabase project URL
//   • a mail catcher: every email is captured instead of sent. View them at
//     http://127.0.0.1:54324 (JSON at /messages?to=someone@example.com)
//
// Usage: node scripts/local-stack.mjs [--db shopfront] [--site http://localhost:3000] [--keep-db]
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SMTPServer } from 'smtp-server';
import { simpleParser } from 'mailparser';
import { reset } from './db.mjs';
import { JWT_SECRET, ANON_KEY, PORTS, SUPABASE_URL, MAIL_URL } from './local-keys.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const dbName = opt('--db', 'shopfront');
const siteUrl = opt('--site', 'http://localhost:3000');
const gotrueBin = process.env.GOTRUE_BIN ?? join(root, '.local/gotrue/gotrue');
if (!existsSync(gotrueBin)) {
  console.error('The login server is not built yet. Run: bash scripts/build-gotrue.sh');
  process.exit(1);
}

const pgHost = process.env.LOCAL_PG_HOST ?? '127.0.0.1:5432';
const authDbUrl = `postgres://supabase_auth_admin:auth-local-only@${pgHost}/${dbName}`;
const gotrueEnv = {
  ...process.env,
  GOTRUE_API_HOST: '127.0.0.1',
  PORT: String(PORTS.gotrue),
  API_EXTERNAL_URL: `${SUPABASE_URL}/auth/v1`,
  GOTRUE_DB_DRIVER: 'postgres',
  DB_NAMESPACE: 'auth',
  DATABASE_URL: authDbUrl,
  GOTRUE_DB_MIGRATIONS_PATH: join(dirname(gotrueBin), 'migrations'),
  GOTRUE_SITE_URL: siteUrl,
  GOTRUE_URI_ALLOW_LIST: `${siteUrl}/**,http://localhost:3000/**,http://localhost:3100/**`,
  GOTRUE_JWT_SECRET: JWT_SECRET,
  GOTRUE_JWT_EXP: '3600',
  GOTRUE_JWT_AUD: 'authenticated',
  GOTRUE_JWT_ADMIN_ROLES: 'service_role',
  GOTRUE_DISABLE_SIGNUP: 'false',
  GOTRUE_EXTERNAL_EMAIL_ENABLED: 'true',
  GOTRUE_EXTERNAL_PHONE_ENABLED: 'false',
  GOTRUE_MAILER_AUTOCONFIRM: 'false',
  GOTRUE_MAILER_OTP_EXP: '3600',
  GOTRUE_SMTP_HOST: '127.0.0.1',
  GOTRUE_SMTP_PORT: String(PORTS.smtp),
  GOTRUE_SMTP_USER: 'local',
  GOTRUE_SMTP_PASS: 'local',
  GOTRUE_SMTP_ADMIN_EMAIL: 'no-reply@shopfront.local',
  GOTRUE_SMTP_SENDER_NAME: 'Shopfront Studio',
  GOTRUE_SMTP_MAX_FREQUENCY: '1s',
  GOTRUE_MAILER_URLPATHS_CONFIRMATION: '/auth/v1/verify',
  GOTRUE_MAILER_URLPATHS_INVITE: '/auth/v1/verify',
  GOTRUE_MAILER_URLPATHS_RECOVERY: '/auth/v1/verify',
  GOTRUE_MAILER_URLPATHS_EMAIL_CHANGE: '/auth/v1/verify',
  GOTRUE_RATE_LIMIT_EMAIL_SENT: '10000',
  GOTRUE_RATE_LIMIT_VERIFY: '10000',
  GOTRUE_RATE_LIMIT_TOKEN_REFRESH: '10000',
  GOTRUE_RATE_LIMIT_OTP: '10000',
  GOTRUE_SECURITY_REFRESH_TOKEN_ROTATION_ENABLED: 'true',
  GOTRUE_LOG_LEVEL: process.env.GOTRUE_LOG_LEVEL ?? 'warn',
};

// 1. Database
if (!args.includes('--keep-db')) {
  await reset({
    db: dbName,
    shim: false,
    afterRoles: () => {
      const r = spawnSync(gotrueBin, ['migrate'], { env: gotrueEnv, stdio: 'inherit' });
      if (r.status !== 0) throw new Error('Login server database setup failed');
    },
  });
  console.log(`✓ Database "${dbName}" reset and migrated`);
}

// 2. Mail catcher
const mails = [];
const smtp = new SMTPServer({
  authOptional: true,
  disabledCommands: ['STARTTLS'],
  onAuth: (_a, _s, cb) => cb(null, { user: 'local' }),
  onData(stream, _session, cb) {
    simpleParser(stream).then((m) => {
      const html = m.html || '';
      const links = [...html.matchAll(/href="([^"]+)"/g)].map((x) => x[1].replaceAll('&amp;', '&'));
      mails.push({ to: m.to?.value?.map((v) => v.address.toLowerCase()) ?? [], subject: m.subject, text: m.text, html, links, at: Date.now() });
      cb();
    }, cb);
  },
});
smtp.listen(PORTS.smtp, '127.0.0.1');
http
  .createServer((req, res) => {
    const u = new URL(req.url, MAIL_URL);
    const to = u.searchParams.get('to')?.toLowerCase();
    const list = to ? mails.filter((m) => m.to.includes(to)) : mails;
    if (u.pathname === '/messages') {
      res.setHeader('content-type', 'application/json');
      return res.end(JSON.stringify(list.slice().reverse()));
    }
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end(`<h1>Captured emails (${mails.length})</h1>` + list.slice().reverse()
      .map((m) => `<hr><p><b>${m.subject}</b> → ${m.to.join(', ')}</p>${m.html}`).join(''));
  })
  .listen(PORTS.mail, '127.0.0.1');
console.log(`✓ Mail catcher at ${MAIL_URL}`);

// 2b. A stand-in for Razorpay's "Connect" sign-in, so the flow can be tested
// without a real Razorpay Partner account. It approves immediately.
http
  .createServer((req, res) => {
    const u = new URL(req.url, `http://127.0.0.1:${PORTS.razorpay}`);
    if (req.method === 'GET' && u.pathname === '/authorize') {
      const back = new URL(u.searchParams.get('redirect_uri'));
      if (u.searchParams.get('client_id') !== 'mock-partner') { res.statusCode = 400; return res.end('unknown client'); }
      back.searchParams.set('code', 'mock-code');
      back.searchParams.set('state', u.searchParams.get('state') ?? '');
      res.writeHead(302, { location: back.toString() });
      return res.end();
    }
    if (req.method === 'POST' && u.pathname === '/token') {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        const b = JSON.parse(body || '{}');
        const ok = b.client_id === 'mock-partner' && b.client_secret === 'mock-partner-secret' && b.code === 'mock-code';
        res.writeHead(ok ? 200 : 400, { 'content-type': 'application/json' });
        res.end(JSON.stringify(ok
          ? { access_token: 'mock-access', refresh_token: 'mock-refresh', public_token: `rzp_${b.mode}_oauth_Mock1234`, razorpay_account_id: 'acc_Mock5678', expires_in: 7776000, token_type: 'Bearer' }
          : { error: 'invalid_grant' }));
      });
      return;
    }
    res.statusCode = 404;
    res.end();
  })
  .listen(PORTS.razorpay, '127.0.0.1');

// 3. Login server
const gotrue = spawn(gotrueBin, ['serve'], { env: gotrueEnv, stdio: 'inherit' });
gotrue.on('exit', (code) => {
  console.error(`Login server stopped (code ${code})`);
  process.exit(1);
});

// 4. Gateway: /auth/v1/* → login server
http
  .createServer((req, res) => {
    if (req.url === '/health') return res.end('ok');
    if (!req.url.startsWith('/auth/v1')) {
      res.statusCode = 404;
      return res.end('Only /auth/v1 is available locally; the app talks to the database directly.');
    }
    const path = req.url.slice('/auth/v1'.length) || '/';
    const up = http.request(
      { host: '127.0.0.1', port: PORTS.gotrue, path, method: req.method, headers: { ...req.headers, host: `127.0.0.1:${PORTS.gotrue}` } },
      (r) => {
        res.writeHead(r.statusCode, r.headers);
        r.pipe(res);
      },
    );
    up.on('error', () => {
      res.statusCode = 502;
      res.end('Login server is starting, try again');
    });
    req.pipe(up);
  })
  .listen(PORTS.gateway, '127.0.0.1');

// wait until the login server answers
for (let i = 0; i < 100; i++) {
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/health`);
    if (r.ok) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 200));
}
console.log(`✓ Login server at ${SUPABASE_URL}

Put these in apps/studio/.env.local:
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}
DATABASE_URL=postgres://shopfront_app:app-local-only@${pgHost}/${dbName}
`);

const stop = () => {
  gotrue.kill();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
