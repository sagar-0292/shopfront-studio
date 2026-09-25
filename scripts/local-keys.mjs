// Fixed keys for the LOCAL login server only. Never used in production:
// hosted Supabase gives you its own keys in the dashboard.
import { createHmac } from 'node:crypto';

export const JWT_SECRET = 'local-only-shopfront-jwt-secret-at-least-32-chars';

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function sign(payload) {
  const head = b64({ alg: 'HS256', typ: 'JWT' });
  const body = b64(payload);
  const sig = createHmac('sha256', JWT_SECRET).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${sig}`;
}

const exp = 2000000000; // 2033
export const ANON_KEY = sign({ iss: 'supabase-local', role: 'anon', exp });

export const PORTS = { gateway: 54321, gotrue: 9999, smtp: 54325, mail: 54324 };
export const SUPABASE_URL = `http://127.0.0.1:${PORTS.gateway}`;
export const MAIL_URL = `http://127.0.0.1:${PORTS.mail}`;
