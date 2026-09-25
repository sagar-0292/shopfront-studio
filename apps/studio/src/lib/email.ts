import 'server-only';
import { env } from '@/lib/env';

/**
 * Sends an email through Resend when RESEND_API_KEY is set. Without it
 * (local development) the email is printed to the server log instead.
 * Returns true if an email was actually sent.
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!env.resendApiKey) {
    console.info(`[email not sent: RESEND_API_KEY missing] to=${to} subject="${subject}"`);
    return false;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.resendApiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: env.emailFrom, to, subject, html }),
  });
  if (!res.ok) {
    console.error('Email failed', res.status, await res.text().catch(() => ''));
    return false;
  }
  return true;
}

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
