import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { UserError } from '@/lib/action';

// Payment keys are encrypted here, on the server, before they reach the
// database (AES-256-GCM). The key (PAYMENT_SECRETS_KEY, 32 random bytes in
// base64) lives only in the server's settings, so a copy of the database alone
// reveals nothing.
function key(): Buffer {
  const raw = process.env.PAYMENT_SECRETS_KEY;
  const k = raw ? Buffer.from(raw, 'base64') : null;
  if (!k || k.length !== 32) {
    throw new UserError('Payment keys can’t be saved yet: the server’s encryption key isn’t set up. See SETUP.md (PAYMENT_SECRETS_KEY).');
  }
  return k;
}

export function encryptSecret(value: unknown): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key(), iv);
  const body = Buffer.concat([c.update(JSON.stringify(value), 'utf8'), c.final(), c.getAuthTag()]);
  return `v1.${iv.toString('base64url')}.${body.toString('base64url')}`;
}

/** Only for the payment server (Phase 6). Throws if the data was tampered with. */
export function decryptSecret<T = unknown>(token: string): T {
  const [v, ivb, bodyb] = token.split('.');
  if (v !== 'v1' || !ivb || !bodyb) throw new Error('Unknown secret format');
  const body = Buffer.from(bodyb, 'base64url');
  const d = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivb, 'base64url'));
  d.setAuthTag(body.subarray(body.length - 16));
  return JSON.parse(Buffer.concat([d.update(body.subarray(0, body.length - 16)), d.final()]).toString('utf8')) as T;
}

/** "••••1234" — enough to recognise a key without revealing it. */
export const hintOf = (s: string) => `••••${s.slice(-4)}`;
