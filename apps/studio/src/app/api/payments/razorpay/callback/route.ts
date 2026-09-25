import { NextResponse, type NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { getUser } from '@/lib/auth';
import { withUser } from '@/lib/db';
import { appOrigin } from '@/lib/urls';
import { encryptSecret } from '@/lib/secrets';
import { friendlyError } from '@/lib/errors';
import { razorpayConnectConfig, RZP_COOKIE, withParam, type RazorpayTokens } from '@/lib/razorpay-connect';

// Step 2: Razorpay sends the owner back here with a one-time code, which we
// swap (server to server) for tokens, encrypt, and store.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  let saved: { state: string; site: string; mode: 'test' | 'live'; back: string; user: string } | null = null;
  try { saved = JSON.parse(request.cookies.get(RZP_COOKIE)?.value ?? 'null'); } catch { saved = null; }
  const back = saved?.back ?? '/';
  const done = (key: string, value: string) => {
    const res = NextResponse.redirect(withParam(back, key, value, request.nextUrl.origin));
    res.cookies.delete({ name: RZP_COOKIE, path: '/api/payments/razorpay' });
    return res;
  };
  const fail = (msg: string) => done('payments_error', msg);

  const state = q.get('state') ?? '';
  if (!saved || state.length !== saved.state.length || !timingSafeEqual(Buffer.from(state), Buffer.from(saved.state))) {
    return fail('The Razorpay connection expired or didn’t match. Please try again.');
  }
  if (q.get('error')) return fail('Razorpay connection was cancelled.');
  const user = await getUser();
  const cfg = razorpayConnectConfig();
  if (!user || user.id !== saved.user || !cfg) return fail('Please log in again and retry connecting Razorpay.');

  try {
    const r = await fetch(`${cfg.base}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        client_id: cfg.clientId, client_secret: cfg.clientSecret, grant_type: 'authorization_code',
        redirect_uri: `${await appOrigin()}/api/payments/razorpay/callback`, code: q.get('code') ?? '', mode: saved.mode,
      }),
    });
    const t = (await r.json().catch(() => null)) as RazorpayTokens | null;
    if (!r.ok || !t?.access_token || !t.public_token) return fail('Razorpay didn’t accept the connection. Please try again.');
    const ciphertext = encryptSecret({
      kind: 'oauth', access_token: t.access_token, refresh_token: t.refresh_token, account_id: t.razorpay_account_id,
      expires_at: new Date(Date.now() + (t.expires_in ?? 0) * 1000).toISOString(),
    });
    await withUser(user, (db) =>
      db.query(`select save_payment_credentials($1, 'razorpay', $2, $3, $4, $5)`,
        [saved!.site, ciphertext, `Account ••••${t.razorpay_account_id.slice(-4)}`, t.public_token, saved!.mode]),
    );
    return done('payments', 'connected');
  } catch (e) {
    return fail(friendlyError(e));
  }
}
