import { UserError } from '@/lib/action';

// Tidies a web address someone typed ("rival.in/menu" → "https://rival.in/menu")
// and refuses anything that isn't a public website.
export function normaliseWebsite(input: string): string {
  let s = input.trim();
  if (!s) throw new UserError('Please enter a web address.');
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  let u: URL;
  try { u = new URL(s); } catch { throw new UserError(`“${input}” doesn’t look like a web address.`); }
  if (!/^https?:$/.test(u.protocol)) throw new UserError('Only website addresses (http or https) can be added.');
  const host = u.hostname.toLowerCase();
  if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(host) || /(^|\.)(localhost|local|internal|test|example)$/.test(host)) {
    throw new UserError(`“${input}” isn’t a public website address.`);
  }
  u.hash = '';
  u.username = '';
  u.password = '';
  let out = `${u.protocol}//${host}${u.port ? `:${u.port}` : ''}${u.pathname === '/' ? '' : u.pathname}${u.search}`;
  if (out.length > 500) throw new UserError('That web address is too long.');
  out = out.replace(/\/$/, '');
  return out;
}
