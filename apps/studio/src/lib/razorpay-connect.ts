import 'server-only';

// Razorpay "Connect" (Razorpay Partners OAuth): the shop approves access on
// Razorpay's own site; we receive tokens, never their password or key secret.
// Needs the agency's Razorpay Partner app (see SETUP.md).
export const RZP_COOKIE = 'sf_rzp_connect';

export function razorpayConnectConfig() {
  const clientId = process.env.RAZORPAY_PARTNER_CLIENT_ID;
  const clientSecret = process.env.RAZORPAY_PARTNER_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, base: (process.env.RAZORPAY_OAUTH_URL ?? 'https://auth.razorpay.com').replace(/\/$/, '') };
}

export type RazorpayTokens = {
  access_token: string;
  refresh_token: string;
  public_token: string;
  razorpay_account_id: string;
  expires_in: number;
};

/** Adds a query parameter to a path that may end in "#section", keeping the section. */
export function withParam(path: string, key: string, value: string, origin: string) {
  const u = new URL(path, origin);
  u.searchParams.set(key, value);
  return u;
}
