import { NextResponse, type NextRequest } from 'next/server';
import { randomBytes } from 'node:crypto';
import { getUser } from '@/lib/auth';
import { withUser } from '@/lib/db';
import { appOrigin, safeNext } from '@/lib/urls';
import { razorpayConnectConfig, RZP_COOKIE, withParam } from '@/lib/razorpay-connect';

// Step 1: send the shop owner to Razorpay to approve the connection.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const back = safeNext(q.get('back'), '/');
  const fail = (msg: string) => NextResponse.redirect(withParam(back, 'payments_error', msg, request.nextUrl.origin));
  const user = await getUser();
  if (!user) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(back)}`, request.nextUrl.origin));
  const cfg = razorpayConnectConfig();
  if (!cfg) return fail('Razorpay Connect isn’t set up for this agency yet. Enter the shop’s keys instead.');
  const site = q.get('site') ?? '';
  const mode = q.get('mode') === 'live' ? 'live' : 'test';
  const allowed = /^[0-9a-f-]{36}$/.test(site) && (await withUser(user, (db) => db.one<{ ok: boolean }>(`select private.is_site_owner_side($1) as ok`, [site])))?.ok;
  if (!allowed) return fail('You don’t have permission to connect payments for this website.');
  const state = randomBytes(24).toString('base64url');
  const redirectUri = `${await appOrigin()}/api/payments/razorpay/callback`;
  const url = new URL(`${cfg.base}/authorize`);
  url.search = new URLSearchParams({ response_type: 'code', client_id: cfg.clientId, redirect_uri: redirectUri, scope: 'read_write', state }).toString();
  const res = NextResponse.redirect(url);
  res.cookies.set(RZP_COOKIE, JSON.stringify({ state, site, mode, back, user: user.id }), {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/api/payments/razorpay', maxAge: 600,
  });
  return res;
}
