import 'server-only';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { zipSync } from 'fflate';
import { UserError } from '@/lib/action';
import { kitsDir, VERSION_RE } from '@/lib/kits';
import type { Website } from './build';

// Renders a saved website with the exact kit versions the project is pinned to, for the
// studio preview and for the download that goes on Netlify (or any static host).

type Pairing = { name: string; mood: string; display: { family: string }; body: { family: string } };
type DesignKit = {
  renderSite(def: unknown, opts: Record<string, unknown>): Record<string, string>;
  /** From design kit 2.0: the type pairings and style options a site can choose. */
  PAIRINGS?: Record<string, Pairing>;
  DEFAULT_PAIRING?: Record<string, string>;
};
export type Versions = { motion: string; commerce: string; design: string };

const kits = new Map<string, Promise<DesignKit>>();
/** The frozen page renderer published with a design kit version. */
export function designKit(version: string): Promise<DesignKit> {
  if (!VERSION_RE.test(version)) throw new UserError('This project’s design kit version is not valid.');
  const file = join(kitsDir(), 'design', version, 'render.mjs');
  if (!existsSync(file)) throw new UserError(`Design kit ${version} isn’t published.`);
  if (!kits.has(version)) kits.set(version, import(/* turbopackIgnore: true */ /* webpackIgnore: true */ pathToFileURL(file).href) as Promise<DesignKit>);
  return kits.get(version)!;
}

/** The art-direction choices for Claude (fonts and style), or null on design kits before 2.0. */
export async function styleGuide(version: string, direction: string): Promise<string | null> {
  const kit = await designKit(version);
  if (!kit.PAIRINGS) return null;
  const pairings = Object.entries(kit.PAIRINGS)
    .map(([id, p]) => `  ${id.padEnd(11)}${p.display.family}${p.body.family !== p.display.family ? ` + ${p.body.family}` : ''}: ${p.mood}`).join('\n');
  return `${pairings}
(The look's own pairing is "${kit.DEFAULT_PAIRING?.[direction] ?? ''}".)`;
}

const needsCommerce =(w: Website) => !!(w.def as { commerce?: unknown }).commerce;

/** The stylesheets a page links, so they can be written into the page itself (faster first paint). */
function styles(v: Versions, direction: string, commerce: boolean) {
  const out: Record<string, string> = {};
  const add = (kit: string, ver: string, file: string) => {
    const p = join(kitsDir(), kit, ver, file);
    if (existsSync(p)) out[`/kits/${kit}/${ver}/${file}`] = readFileSync(p, 'utf8');
  };
  add('motion', v.motion, 'sf-motion.css');
  if (commerce) add('commerce', v.commerce, 'sf-commerce.css');
  add('design', v.design, `${direction}.css`);
  return out;
}

/** Every page of the website, as HTML, keyed by path ("/index.html", "/shop/index.html"). */
export async function renderPages(w: Website, v: Versions, opts: { base: string; noindex: boolean }) {
  const kit = await designKit(v.design);
  const direction = String((w.def as { direction?: string }).direction);
  try {
    return kit.renderSite(w.def, { versions: v, kitsBase: '/kits', base: opts.base, noindex: opts.noindex, styles: styles(v, direction, needsCommerce(w)) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new UserError(`${msg.replace(/\.$/, '')}. Ask Claude to fix this part, then paste the new answer.`);
  }
}

/** The product catalogue as served to the website (photo paths point at where the site lives). */
export function catalogJson(w: Website, base: string) {
  if (!w.catalog) return null;
  const at = (u: string) => (u.startsWith('/') ? base + u : u);
  return JSON.stringify(w.catalog, (k, val) => (k === 'src' && typeof val === 'string' ? at(val)
    : k === 'srcset' && typeof val === 'string' ? val.split(', ').map((p) => { const [u, d] = p.split(' '); return `${at(u)} ${d}`; }).join(', ') : val));
}

function filesUnder(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? filesUnder(join(dir, f)) : [join(dir, f)]));
}

const HEADERS = `# Netlify and Cloudflare Pages read this file. Kit files never change, so browsers can keep them.
/kits/*
  Cache-Control: public, max-age=31536000, immutable
/img/*
  Cache-Control: public, max-age=604800
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
`;

const README = (name: string) => `${name} — website files, made with Shopfront Studio

To put this website online (about 2 minutes):
1. Go to https://app.netlify.com/drop and log in (a free account is fine).
2. Unzip this file, then drag the whole folder onto the page.
3. Netlify gives the site an address straight away. To use the business's own
   domain, open the site in Netlify → Domain management → Add a domain.

Also works on Cloudflare Pages, Vercel or any web host: upload the folder as it is.
The website must be at the top of its address (example.in/), not in a sub-folder.
`;

/** Font files of the families the look or the pages actually name (the kit declares every family it ships). */
export function usedFonts(css: string, pages: string[]): string[] {
  const FACE = /@font-face\s*\{[^}]*\}/g;
  const rest = [css, ...pages].map((t) => t.replace(FACE, '')).join('\n');
  const files = new Set<string>();
  for (const [face] of css.matchAll(FACE)) {
    const family = /font-family:\s*(["']?)([^;"'}]+)\1/.exec(face)?.[2]?.trim();
    const file = /url\(\.\/fonts\/([\w.-]+\.woff2)\)/.exec(face)?.[1];
    if (!family || !file) continue;
    const esc = family.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(["'])${esc}\\1|[:,]\\s*${esc}\\s*[,;}]`).test(rest)) files.add(file);
  }
  return [...files];
}

export type OwnFile ={ name: string; data: Uint8Array; small: Uint8Array | null };

/** The whole website as one .zip file, ready to drag onto Netlify Drop. */
export async function websiteZip(w: Website, v: Versions, siteName: string, own: OwnFile[]): Promise<Uint8Array> {
  const pages = await renderPages(w, v, { base: '', noindex: false });
  const files: Record<string, Uint8Array> = {};
  const enc = new TextEncoder();
  for (const [path, html] of Object.entries(pages)) files[path.replace(/^\//, '')] = enc.encode(html);
  const catalog = catalogJson(w, '');
  if (catalog) files['data/catalog.json'] = enc.encode(catalog);
  for (const f of own) {
    files[`img/own/${f.name}.webp`] = f.data;
    if (f.small) files[`img/own/${f.name}-800.webp`] = f.small;
  }
  // Kit files the pages load: motion (always), commerce (shops and bookings), and the fonts the pages use.
  const k = kitsDir();
  const addDir = (sub: string) => { for (const p of filesUnder(join(k, sub))) files[`kits/${relative(k, p)}`] = readFileSync(p); };
  addDir(`motion/${v.motion}`);
  if (needsCommerce(w)) addDir(`commerce/${v.commerce}`);
  const direction = String((w.def as { direction?: string }).direction);
  const css = readFileSync(join(k, 'design', v.design, `${direction}.css`), 'utf8');
  for (const f of usedFonts(css, Object.values(pages))) {
    const p = join(k, 'design', v.design, 'fonts', f);
    if (existsSync(p)) files[`kits/design/${v.design}/fonts/${f}`] = readFileSync(p);
  }
  files['_headers'] = enc.encode(HEADERS);
  files['README.txt'] = enc.encode(README(siteName));
  // Photos and fonts are already compressed; pages and scripts shrink well.
  return zipSync(Object.fromEntries(Object.entries(files).map(([p, d]) => [p, [d, { level: /\.(webp|woff2)$/.test(p) ? 0 : 6 }]])) as never);
}
