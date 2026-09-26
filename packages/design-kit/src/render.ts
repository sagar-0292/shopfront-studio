// Turns a page definition into finished HTML pages. Pure function: no files,
// no network — the studio, the publisher and the tests all call this.
import { html, raw, esc, emph, cls, type Raw } from './html';
import { section, link, type Ctx } from './sections';
import { SiteDef, type Direction, type SiteDefT, type SectionT } from './schema';
import { checkPalette } from './contrast';

export type RenderOptions = {
  /** Where kits are served, e.g. "/kits" or "https://kits.shopfront.in". */
  kitsBase?: string;
  versions: { motion: string; commerce: string; design: string };
  /** Where this site is served. "" on its own domain, "/kits/sites/ember" in previews. */
  base?: string;
  /** Hide from search engines (previews, samples). */
  noindex?: boolean;
};

/** The headline font each direction loads first, so the big type never jumps.
 *  Body fonts load normally: preloading them too slows the first paint on 4G. */
export const PRELOAD: Record<Direction, string[]> = {
  editorial: ['cormorant-garamond-normal.woff2'],
  bold: ['bricolage-grotesque-normal.woff2'],
  cinematic: ['syne-normal.woff2'],
  crafted: ['fraunces-normal.woff2'],
};
const THEME_COLOR: Record<Direction, string> = { editorial: '#f7f3ec', bold: '#fff6e5', cinematic: '#0b0b0c', crafted: '#f3e8d6' };
const COMMERCE_SECTIONS = new Set<SectionT['type']>(['products', 'shop', 'booking', 'wishlist']);

export class DesignError extends Error {}

export function renderSite(input: unknown, opts: RenderOptions): Record<string, string> {
  const parsed = SiteDef.safeParse(input);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    throw new DesignError(`The page design has a problem at ${i.path.join(' → ') || 'the top'}: ${i.message}`);
  }
  const def = parsed.data;
  const paths = new Set<string>();
  for (const p of def.pages) {
    if (paths.has(p.path)) throw new DesignError(`Two pages use the address ${p.path}. Each page needs its own address.`);
    paths.add(p.path);
  }
  const needsCommerce = def.pages.some((p) => p.sections.some((s) => COMMERCE_SECTIONS.has(s.type)));
  if (needsCommerce && !def.commerce) throw new DesignError('This design shows products or bookings, so it needs a catalogue. Add one under "commerce".');
  const problems = checkPalette(def.direction, def.palette);
  if (problems.length) throw new DesignError(problems[0]);

  const out: Record<string, string> = {};
  for (const page of def.pages) out[`${page.path}index.html`] = renderPage(def, page, opts);
  return out;
}

type Page = SiteDefT['pages'][number];

function renderPage(def: SiteDefT, page: Page, opts: RenderOptions): string {
  const kits = (opts.kitsBase ?? '/kits').replace(/\/$/, '');
  const base = (opts.base ?? '').replace(/\/$/, '');
  const v = opts.versions;
  const dir = def.direction;
  const hasCommerce = !!def.commerce;
  const ctxBase = { base };
  const designUrl = `${kits}/design/${v.design}`;
  const sections = page.sections.map((s, index) => section(s, { dir, site: def.site, palette: def.palette, hasCommerce, index, base } satisfies Ctx));
  const isHome = page.path === '/';
  const title = isHome ? page.title : `${page.title} – ${def.site.name}`;
  const canonical = def.site.url ? def.site.url + page.path : null;

  return '<!doctype html>\n' + html`<html lang="en-IN" class="${`d-${dir}`}" data-sf-smooth data-sf-cursor>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${page.description}">
<meta name="theme-color" content="${def.palette?.bg ?? THEME_COLOR[dir]}">
${opts.noindex ? raw('<meta name="robots" content="noindex">') : ''}
${canonical ? html`<link rel="canonical" href="${canonical}">` : ''}
<meta property="og:type" content="website">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${page.description}">
<meta property="og:site_name" content="${def.site.name}">
<meta property="og:locale" content="en_IN">
${canonical ? html`<meta property="og:url" content="${canonical}">` : ''}
<script>document.documentElement.classList.add('sf-js')</script>
${PRELOAD[dir].map((f) => html`<link rel="preload" href="${`${designUrl}/fonts/${f}`}" as="font" type="font/woff2" crossorigin>`)}
<link rel="stylesheet" href="${`${kits}/motion/${v.motion}/sf-motion.css`}">
${hasCommerce ? html`<link rel="stylesheet" href="${`${kits}/commerce/${v.commerce}/sf-commerce.css`}">` : ''}
<link rel="stylesheet" href="${`${designUrl}/${dir}.css`}">
${paletteStyle(def)}
<script type="module" src="${`${kits}/motion/${v.motion}/sf-motion.js`}"></script>
${hasCommerce ? html`<script type="module" src="${`${kits}/commerce/${v.commerce}/sf-commerce.js`}"></script>
<script type="application/json" id="sf-config">${raw(json(commerceConfig(def, base)))}</script>` : ''}
${structuredData(def, page)}
</head>
<body>
<a class="d-skip" href="#main">Skip to content</a>
<div class="d-progress" data-sf-progress></div>
${header(def, page, ctxBase)}
<main id="main">
${sections}
</main>
${footer(def, ctxBase)}
</body>
</html>
`.value;
}

function header(def: SiteDefT, page: Page, ctx: { base: string }): Raw {
  const current = (href: string) => (href === page.path ? raw('aria-current="page"') : raw(''));
  const nav = def.nav.map((n) => html`<a class="d-link" href="${link(ctx, n.href)}" ${current(n.href)}>${n.label}</a>`);
  const hasWishlist = def.pages.some((p) => p.sections.some((s) => s.type === 'wishlist'));
  const wishlistPath = def.pages.find((p) => p.sections.some((s) => s.type === 'wishlist'))?.path;
  return html`<header class="d-header" data-sf-header="autohide">
  <div class="d-wrap d-header-in">
    <a class="d-logo" href="${link(ctx, '/')}">${def.site.name}</a>
    ${def.nav.length ? html`<nav class="d-nav" aria-label="Main">${nav}</nav>` : ''}
    <div class="d-header-actions">
      ${hasWishlist && wishlistPath ? html`<a class="d-icon-btn d-header-wish" href="${link(ctx, wishlistPath)}"><span aria-hidden="true">♡</span><span class="d-sr">Wishlist</span> <b data-sf-wishlist-count>0</b></a>` : ''}
      ${def.commerce && def.pages.some((p) => p.sections.some((s) => s.type === 'products' || s.type === 'shop')) ? raw('<button class="d-icon-btn" type="button" data-sf-cart-open aria-label="Cart 0 items">Cart <b data-sf-cart-count>0</b></button>') : ''}
      ${def.nav.length ? html`<details class="d-menu">
        <summary class="d-icon-btn">Menu</summary>
        <nav class="d-menu-panel" aria-label="Menu">${def.nav.map((n) => html`<a href="${link(ctx, n.href)}" ${current(n.href)}>${n.label}</a>`)}${hasWishlist && wishlistPath ? html`<a class="d-menu-wish" href="${link(ctx, wishlistPath)}">Wishlist</a>` : ''}</nav>
      </details>` : ''}
    </div>
  </div>
</header>`;
}

function footer(def: SiteDefT, ctx: { base: string }): Raw {
  const s = def.site;
  const a = s.address;
  const social = Object.entries(s.social ?? {}).filter(([, u]) => u) as [string, string][];
  const name = (k: string) => k[0].toUpperCase() + k.slice(1);
  return html`<footer class="d-footer" id="privacy">
  <div class="d-wrap">
    <p class="d-footer-big" aria-hidden="true" data-sf-split="chars">${s.name}</p>
    <div class="d-footer-grid">
      <div><h2>${s.name}</h2><p class="d-muted">${s.tagline ?? s.description}</p></div>
      ${a ? html`<div><h2>Visit</h2><p>${a.street}${a.area ? `, ${a.area}` : ''}<br>${a.city} ${a.pincode}</p></div>` : ''}
      ${s.phone || s.email || s.whatsapp ? html`<div><h2>Talk to us</h2><ul>
        ${s.phone ? html`<li><a class="d-link" href="${`tel:${s.phone}`}">${s.phone.replace(/^\+91(\d{5})(\d{5})$/, '+91 $1 $2')}</a></li>` : ''}
        ${s.whatsapp ? html`<li><a class="d-link" href="${`https://wa.me/${s.whatsapp.replace(/\D/g, '')}`}" target="_blank" rel="noopener">WhatsApp</a></li>` : ''}
        ${s.email ? html`<li><a class="d-link" href="${`mailto:${s.email}`}">${s.email}</a></li>` : ''}
      </ul></div>` : ''}
      ${def.nav.length || social.length ? html`<div><h2>Explore</h2><ul>
        ${def.nav.map((n) => html`<li><a class="d-link" href="${link(ctx, n.href)}">${n.label}</a></li>`)}
        ${social.map(([k, u]) => html`<li><a class="d-link" href="${link(ctx, u)}" target="_blank" rel="noopener">${name(k)}</a></li>`)}
      </ul></div>` : ''}
    </div>
    <div class="d-footer-base">
      <p>© ${s.name}. Your details are only used to reply to you or deliver your order.</p>
      <button type="button" data-sf-motion-toggle>Pause animations</button>
    </div>
    ${s.sampleNotice ? html`<p class="d-muted" style="margin-top:20px;font-size:.8rem">${s.sampleNotice}</p>` : ''}
  </div>
</footer>`;
}

function paletteStyle(def: SiteDefT): Raw | '' {
  const p = def.palette;
  if (!p || !Object.keys(p).length) return '';
  const map: Record<string, string> = { bg: '--c-bg', surface: '--c-surface', ink: '--c-ink', muted: '--c-muted', line: '--c-line', accent: '--c-accent', accentInk: '--c-accent-ink' };
  const decls = Object.entries(p).filter(([, v]) => v).map(([k, v]) => `${map[k]}:${v}`).join(';');
  // Values are validated as #rrggbb by the schema, so this is safe to inline.
  return raw(`<style>.d-${def.direction}{${decls}}</style>`);
}

function commerceConfig(def: SiteDefT, base: string) {
  const c = def.commerce!;
  const source = { ...c.source };
  if (typeof source.url === 'string' && source.url.startsWith('/')) source.url = base + source.url;
  return {
    site: { id: def.site.id, name: def.site.name, privacyUrl: c.privacyUrl ?? '#privacy' },
    ...(def.site.whatsapp ? { whatsapp: def.site.whatsapp } : {}),
    ...(c.delivery ? { delivery: c.delivery } : {}),
    ...(c.payments ? { payments: c.payments } : {}),
    source,
  };
}

const DAY: Record<string, string> = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };

function structuredData(def: SiteDefT, page: Page): Raw {
  const s = def.site;
  const biz: Record<string, unknown> = {
    '@context': 'https://schema.org', '@type': s.businessType, name: s.name, description: s.description,
    ...(s.url ? { url: s.url } : {}), ...(s.phone ? { telephone: s.phone } : {}), ...(s.email ? { email: s.email } : {}),
  };
  if (s.address) biz.address = { '@type': 'PostalAddress', streetAddress: [s.address.street, s.address.area].filter(Boolean).join(', '), addressLocality: s.address.city, addressRegion: s.address.state, postalCode: s.address.pincode, addressCountry: 'IN' };
  if (s.hours?.length) {
    biz.openingHoursSpecification = s.hours.map((h) => {
      const days = h.days.toLowerCase().match(/mon|tue|wed|thu|fri|sat|sun/g) ?? [];
      const range = /–|-|to/.test(h.days) && days.length === 2 ? expand(days[0], days[1]) : days;
      return { '@type': 'OpeningHoursSpecification', dayOfWeek: range.map((d) => DAY[d]), opens: h.open, closes: h.close };
    });
  }
  const blocks: unknown[] = [biz];
  const faq = page.sections.find((x) => x.type === 'faq');
  if (faq && faq.type === 'faq') {
    blocks.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });
  }
  return raw(blocks.map((b) => `<script type="application/ld+json">${json(b)}</script>`).join('\n'));
}

function expand(from: string, to: string) {
  const order = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const a = order.indexOf(from), b = order.indexOf(to);
  if (a < 0 || b < 0) return [from, to];
  return a <= b ? order.slice(a, b + 1) : [...order.slice(a), ...order.slice(0, b + 1)];
}

/** JSON that is safe inside a <script> tag. */
function json(v: unknown) {
  return JSON.stringify(v).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

export { esc, emph, cls };
