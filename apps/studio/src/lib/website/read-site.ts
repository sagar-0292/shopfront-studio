import 'server-only';
import { lookup } from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import { isIP, type LookupFunction } from 'node:net';
import { UserError } from '@/lib/action';

// Reads a business's current website (the home page and a few pages like About, Menu and
// Contact) as plain text, so Claude can fill in the brief from it. The server only fetches
// public web addresses: never this machine, the private network or cloud metadata.

const MAX_BYTES = 2_000_000;
const MAX_PAGE_TEXT = 12_000;
const MAX_PAGES = 6;
/** Pages worth reading besides the home page, by the words in their address or link text. */
const USEFUL = /about|story|who-we-are|contact|visit|location|find-us|menu|product|shop|collection|service|price|pricing|rate|tariff|room|treatment|course|faq|team|gallery|review|testimonial|hours|order/i;

/** True for addresses that are not on the public internet. */
export function isPrivateAddress(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const [a, b] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19));
  }
  if (v === 6) {
    const x = ip.toLowerCase().replace(/^\[|\]$/g, '');
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(x)?.[1];
    if (mapped) return isPrivateAddress(mapped);
    return x === '::' || x === '::1' || /^f[cd]/.test(x) || /^fe[89ab]/.test(x) || /^ff/.test(x) || x.startsWith('64:ff9b:') || x.startsWith('2001:db8:');
  }
  return true;
}

// Local tests serve a pretend business website on 127.0.0.1; nothing else sets this.
const allowPrivate = () => process.env.WEBSITE_READER_ALLOW_PRIVATE === '1';

/** DNS lookup that refuses private addresses, checked at connection time (so a name can't switch after checking). */
const safeLookup: LookupFunction = (host, options, cb) => {
  lookup(host, { ...options, all: true }, (err, addrs) => {
    if (err) return (cb as (e: Error | null) => void)(err);
    const list = addrs as { address: string; family: number }[];
    if (!list.length || (!allowPrivate() && list.some((a) => isPrivateAddress(a.address)))) {
      return (cb as (e: Error | null) => void)(Object.assign(new Error('private address'), { code: 'EPRIVATE' }));
    }
    if (options.all) return (cb as (e: null, a: typeof list) => void)(null, list);
    (cb as (e: null, a: string, f: number) => void)(null, list[0].address, list[0].family);
  });
};

/** Turns what the person typed into a web address, or explains what's wrong. */
export function websiteUrl(input: string): URL {
  const t = input.trim();
  let u: URL;
  try {
    u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(t) ? t : `https://${t}`);
  } catch {
    throw new UserError('That doesn’t look like a website address. Type it like mithaimarket.in or https://mithaimarket.in.');
  }
  if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) throw new UserError('Only normal website addresses (http or https) can be read.');
  if (u.port && !['80', '443'].includes(u.port) && !allowPrivate()) throw new UserError('Only normal website addresses (without a port number) can be read.');
  const host = u.hostname.toLowerCase();
  if (/(^|\.)(instagram|facebook|fb)\.com$/.test(host)) {
    throw new UserError('Instagram and Facebook pages can only be read when logged in. Copy their bio and a few post captions into “Anything else Claude should know” instead, and put the Instagram handle in the Instagram box.');
  }
  if (!host.includes('.') && !allowPrivate()) throw new UserError('That doesn’t look like a website address. Type it like mithaimarket.in.');
  if (isIP(host.replace(/^\[|\]$/g, '')) && isPrivateAddress(host) && !allowPrivate()) throw new UserError('That address is on a private network, so it can’t be read.');
  u.hash = '';
  return u;
}

type Got = { url: URL; html: string };

/** One page: follows up to 4 redirects (each checked again), HTML only, size and time limited. */
function get(url: URL, redirects = 0): Promise<Got> {
  return new Promise((resolve, reject) => {
    const mod = url.protocol === 'https:' ? https : http;
    const req = mod.get(url, {
      lookup: safeLookup, timeout: 12_000,
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; ShopfrontStudio/1.0; reads a business website to prepare its new one)', accept: 'text/html,application/xhtml+xml', 'accept-language': 'en-IN,en;q=0.9' },
    }, (res) => {
      const status = res.statusCode ?? 0;
      if (status >= 300 && status < 400 && res.headers.location) {
        res.resume();
        if (redirects >= 4) return reject(new UserError('That website keeps redirecting, so it couldn’t be read.'));
        let next: URL;
        try { next = websiteUrl(new URL(res.headers.location, url).toString()); } catch (e) { return reject(e); }
        return resolve(get(next, redirects + 1));
      }
      if (status >= 400) { res.resume(); return reject(Object.assign(new Error(`HTTP ${status}`), { status })); }
      if (!/text\/html|application\/xhtml/i.test(String(res.headers['content-type'] ?? 'text/html'))) { res.resume(); return reject(new Error('not html')); }
      const chunks: Buffer[] = [];
      let size = 0;
      res.on('data', (c: Buffer) => { size += c.length; if (size > MAX_BYTES) { req.destroy(); resolve({ url, html: Buffer.concat(chunks).toString('utf8') }); } else chunks.push(c); });
      res.on('end', () => resolve({ url, html: Buffer.concat(chunks).toString('utf8') }));
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' })));
    req.on('error', reject);
  });
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'', nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—', hellip: '…', rupee: '₹', copy: '©', middot: '·', bull: '•' };
export const decode = (s: string) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
  if (e[0] === '#') { const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1)); return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ''; }
  return ENTITIES[e.toLowerCase()] ?? m;
});

export type PageText = { url: string; title: string; text: string; links: { href: string; text: string }[] };

/** The readable content of a page: title, description, structured business data, contact links and text. */
export function pageText(html: string, base: URL): PageText {
  const title = decode(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '').replace(/\s+/g, ' ').trim();
  const meta = [...html.matchAll(/<meta\s[^>]*>/gi)].map(([m]) => {
    const name = /(?:name|property)\s*=\s*["']([^"']+)["']/i.exec(m)?.[1]?.toLowerCase();
    const content = /content\s*=\s*["']([^"']*)["']/i.exec(m)?.[1];
    return name && content && /^(description|og:description|og:site_name|og:title)$/.test(name) ? `${name}: ${decode(content)}` : null;
  }).filter(Boolean);
  // Structured data (schema.org) often has the exact address, phone and opening hours.
  const jsonLd = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1].trim().slice(0, 4000));
  const links: PageText['links'] = [];
  const contacts = new Set<string>();
  for (const m of html.matchAll(/<a\s[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = decode(m[1].trim());
    const text = decode(m[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim().slice(0, 80);
    if (/^(tel:|mailto:|https?:\/\/(wa\.me|api\.whatsapp\.com|(www\.)?instagram\.com|(www\.)?facebook\.com|maps\.app\.goo\.gl|(www\.)?google\.[a-z.]+\/maps))/i.test(href)) contacts.add(href.slice(0, 200));
    try { links.push({ href: new URL(href, base).toString(), text }); } catch { /* not a link */ }
  }
  const body = decode(html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|template|iframe|head)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<img\s[^>]*alt\s*=\s*["']([^"']{3,})["'][^>]*>/gi, ' [photo: $1] ')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/section|\/article|\/header|\/footer|\/nav)\b[^>]*>/gi, '\n')
    .replace(/<(h[1-6])\b[^>]*>/gi, '\n## ')
    .replace(/<li\b[^>]*>/gi, '\n- ')
    .replace(/<\/t[dh]>/gi, ' | ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/[ \t\f\r]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const text = [
    ...meta,
    ...(jsonLd.length ? [`Structured data: ${jsonLd.join('\n')}`] : []),
    ...(contacts.size ? [`Contact links: ${[...contacts].join(' ')}`] : []),
    body,
  ].join('\n').slice(0, MAX_PAGE_TEXT);
  return { url: base.toString(), title, text, links };
}

/** The most useful other pages on the same site: About, Menu, Contact… (never other websites). */
export function pickPages(home: PageText, homeUrl: URL, limit = MAX_PAGES - 1): URL[] {
  const bare = (h: string) => h.toLowerCase().replace(/^www\./, '');
  const seen = new Set([homeUrl.origin + homeUrl.pathname.replace(/\/$/, '')]);
  const out: URL[] = [];
  for (const l of home.links) {
    let u: URL;
    try { u = new URL(l.href); } catch { continue; }
    if (!['http:', 'https:'].includes(u.protocol) || bare(u.hostname) !== bare(homeUrl.hostname)) continue;
    if (/\.(pdf|jpe?g|png|webp|gif|zip|mp4|docx?)$/i.test(u.pathname) || /\/(cart|checkout|account|login|wp-admin|wp-login)/i.test(u.pathname)) continue;
    u.hash = '';
    u.search = '';
    const key = u.origin + u.pathname.replace(/\/$/, '');
    if (seen.has(key) || !(USEFUL.test(u.pathname) || USEFUL.test(l.text))) continue;
    seen.add(key);
    out.push(u);
    if (out.length >= limit) break;
  }
  return out;
}

const why = (e: unknown) => {
  const err = e as { status?: number; code?: string };
  if (e instanceof UserError) return e.message;
  if (err.code === 'EPRIVATE') return 'That address is on a private network, so it can’t be read.';
  if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') return 'That website address doesn’t exist. Check the spelling.';
  if (err.code === 'ETIMEDOUT') return 'That website took too long to answer.';
  if (err.status === 403 || err.status === 429) return 'That website doesn’t let other computers read it.';
  if (err.status) return `That website answered with an error (${err.status}).`;
  return 'That website couldn’t be reached.';
};

/** Reads the home page and up to five useful pages. Fails with a plain-language reason if the home page can't be read. */
export async function readWebsite(input: string): Promise<{ url: string; pages: PageText[] }> {
  const start = websiteUrl(input);
  let home: Got;
  try {
    home = await get(start);
  } catch (e) {
    throw new UserError(`${why(e)} You can still fill in the details by hand, or upload a brochure or menu instead.`);
  }
  const first = pageText(home.html, home.url);
  if (first.text.length < 80) {
    throw new UserError('That website shows almost no text to a program (it may be built entirely in JavaScript). Upload a brochure or menu instead, or fill in the details by hand.');
  }
  const more = await Promise.all(pickPages(first, home.url).map((u) => get(u).then((g) => pageText(g.html, g.url)).catch(() => null)));
  return { url: home.url.toString(), pages: [first, ...more.filter((p): p is PageText => !!p && p.text.length > 40)] };
}
