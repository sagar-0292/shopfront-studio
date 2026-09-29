import { html, raw, emph, safeHref, cls, esc, type Raw } from './html';
import { backgroundColours } from './contrast';
import { icon } from './icons';
import { DEFAULT_PAIRING } from './style';
import { METRIC_CHARS, WIDTHS } from './metrics';

/** How wide a name is, in em, set in capitals in the headline font (unknown characters count as an average letter). */
export function nameWidth(name: string, type: string): number {
  const w = WIDTHS[type];
  if (!w) return [...name].length * 0.6;
  const avg = w.slice(0, 26).reduce((a, b) => a + b, 0) / 26;
  return [...name.toUpperCase()].reduce((sum, c) => { const i = METRIC_CHARS.indexOf(c); return sum + (i >= 0 ? w[i] : avg); }, 0);
}
import type { z } from 'zod';
import type { Direction, MediaT, SectionT, SiteDefT, Image } from './schema';

export type Ctx = { dir: Direction; site: SiteDefT['site']; palette?: SiteDefT['palette']; hasCommerce: boolean; index: number; base: string; type?: string };

/** Site paths ("/shop/") are prefixed with where the site is served ("/kits/sites/ember"). */
export function link(ctx: Pick<Ctx, 'base'>, href: string): string {
  const h = safeHref(href);
  return h.startsWith('/') ? ctx.base + h : h;
}
const asset = (ctx: Ctx, src: string) => (src.startsWith('/') ? ctx.base + src : src);
const srcsetOf = (ctx: Ctx, set: string) => set.split(',').map((part) => { const [u, ...d] = part.trim().split(/\s+/); return [asset(ctx, u), ...d].join(' '); }).join(', ');

// How each direction moves: which reveal it prefers and its signature background.
const MOTION: Record<Direction, { reveal: string; head: string; bg: { hero: string; colors: string } }> = {
  editorial: { reveal: 'fade', head: 'mask', bg: { hero: 'none', colors: '#f7f3ec,#efe4d0,#e9dcc6,#f3ead9' } },
  bold: { reveal: 'up', head: 'up', bg: { hero: 'none', colors: '#2b0a3d,#c8135f,#ff9f1c,#6a1b9a' } },
  cinematic: { reveal: 'blur', head: 'blur', bg: { hero: 'particles', colors: '#0b0b0c,#ff5a1f,#ffb347' } },
  crafted: { reveal: 'up', head: 'up', bg: { hero: 'none', colors: '#f3e8d6,#e7cfa8,#d9a877,#f6eadb' } },
  poster: { reveal: 'up', head: 'up', bg: { hero: 'none', colors: '#c8321a,#1e3bd6,#ffd23f' } },
  quiet: { reveal: 'fade', head: 'mask', bg: { hero: 'none', colors: '#f1eee8,#e4e0d6,#d6e3d0' } },
  block: { reveal: 'up', head: 'up', bg: { hero: 'none', colors: '#e8412c,#c6f24e,#ffc93c,#7b4dff' } },
};
export const motionFor = (d: Direction) => MOTION[d];
/** How wide the split hero's photo is shown; the page also preloads it with these sizes. */
export const HERO_SPLIT_SIZES = '(min-width: 960px) 42vw, 92vw';

const inr = (paise: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: paise % 100 ? 2 : 0 }).format(paise / 100);
const num = (i: number) => String(i + 1).padStart(2, '0');

export function media(m: MediaT | undefined, ctx: Ctx, _seed: string, opts: { w?: number; h?: number; eager?: boolean; sizes?: string } = {}): Raw {
  // Without a photo, a calm block in the site's own colours (never a drawing).
  const blank = raw('<div class="d-blank"></div>');
  const img = (i: z.infer<typeof Image>) => html`<img src="${asset(ctx, i.src)}" alt="${i.alt}" width="${i.width}" height="${i.height}" ${raw(i.srcset ? `srcset="${esc(srcsetOf(ctx, i.srcset))}" sizes="${esc(opts.sizes ?? '(min-width: 900px) 50vw, 100vw')}"` : '')} ${raw(opts.eager ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"')}>`;
  if (!m) return blank;
  if ('image' in m) return img(m.image);
  if ('object' in m) {
    return html`<div class="d-3d" data-sf-3d="${m.object}" ${raw(m.color ? `data-sf-3d-color="${m.color}"` : '')} ${raw(m.material ? `data-sf-3d-material="${m.material}"` : '')} role="img" aria-label="${m.label}" style="position:absolute;inset:0">${m.poster ? img(m.poster) : blank}</div>`;
  }
  if ('model' in m) {
    return html`<div class="d-3d" data-sf-3d="model" data-src="${asset(ctx, m.model)}" role="img" aria-label="${m.label}" style="position:absolute;inset:0">${m.poster ? img(m.poster) : blank}</div>`;
  }
  return html`<div data-sf-video data-src="${asset(ctx, m.video.src)}" ${raw(m.video.poster ? `data-poster="${esc(asset(ctx, m.video.poster))}"` : '')} ${raw(m.label ? `role="img" aria-label="${esc(m.label)}"` : '')} style="position:absolute;inset:0">${m.video.poster ? '' : blank}</div>`;
}

// A sticker: a flat label, or (in looks that want it) its words running round a turning circle.
// The circle is made of ordinary letters, each turned into place; it is decoration, so screen readers skip it.
const sticker = (text: string) => {
  const ring = [...`${text} · ${text} · `];
  return html`<span class="d-sticker" aria-hidden="true"><span class="d-sticker-text">${text}</span><span class="d-ring" style="${`--n:${ring.length}`}">${ring.map((c, i) => html`<i style="${`--i:${i}`}">${c}</i>`)}</span></span>`;
};

const btn = (ctx: Ctx, c: { label: string; href: string; style?: 'solid' | 'plain' }, magnetic = true) =>
  html`<a class="${cls('d-btn', c.style !== 'plain' && 'd-btn--solid')}" href="${link(ctx, c.href)}" ${raw(magnetic ? 'data-sf-magnetic="0.3"' : '')}>${c.label} <span class="d-arrow">${icon('arrowRight')}</span></a>`;

const head = (ctx: Ctx, s: { eyebrow?: string; title?: string }, extra?: Raw, level: 'h2' = 'h2') => {
  if (!s.title && !s.eyebrow) return '';
  return html`<div class="${cls('d-section-head', extra && 'd-section-head--row')}">
    <div>
      ${s.eyebrow ? html`<p class="d-eyebrow" data-sf-reveal="fade">${s.eyebrow}</p>` : ''}
      ${s.title ? raw(`<${level} class="d-display d-h2" data-sf-split="words" style="margin-top:14px">${emph(s.title)}</${level}>`) : ''}
    </div>
    ${extra ?? ''}
  </div>`;
};

const tone = (t?: string) => (t === 'invert' ? 'd-section--invert' : t === 'surface' ? 'd-section--surface' : t === 'pop' ? 'd-block--pop' : t === 'accent' ? 'd-block--accent' : '');

export const CARD_TEMPLATE = `<template data-sf-card>
  <article class="d-card" data-sf-reveal="up" data-sf-cursor-label="View">
    <div class="d-card-badges" data-slot="badges"></div>
    <a class="d-card-media" data-slot="link"><img data-slot="image" alt=""></a>
    <div class="d-card-body">
      <p class="d-card-meta"><span data-slot="category"></span></p>
      <h3 class="d-card-name" data-slot="name"></h3>
      <p class="d-card-price"><span data-slot="price"></span><s data-slot="mrp"></s><i data-slot="discount"></i></p>
      <p class="d-card-stock" data-slot="stock"></p>
      <div class="d-card-actions"><select data-slot="variant"></select><button data-slot="add">Add to cart</button><button data-slot="wishlist"></button></div>
    </div>
  </article>
</template>`;

const BACKDROP_CLASS: Record<string, string> = { accent: 'd-block--accent', pop: 'd-block--pop', dark: 'd-section--invert' };
/** A section with its backdrop: the class goes on the section's own outer element. */
export function section(s: SectionT, ctx: Ctx): Raw {
  const out = sectionInner(s, ctx);
  if (!s.backdrop) return out;
  const c = `d-bd d-bd--${s.backdrop}${BACKDROP_CLASS[s.backdrop] ? ` ${BACKDROP_CLASS[s.backdrop]}` : ''}`;
  return raw(out.value.replace('class="', `class="${c} `));
}

function sectionInner(s: SectionT, ctx: Ctx): Raw {
  const mv = MOTION[ctx.dir];
  const id = s.anchor ?? `s${ctx.index}`;
  switch (s.type) {
    case 'hero': {
      const eager = ctx.index === 0;
      const bg = s.background !== 'none' ? s.background : mv.bg.hero;
      const bgAttr = bg !== 'none' && s.variant !== 'fullbleed' ? raw(`data-sf-bg="${bg}" data-sf-colors="${mv.bg.colors}"`) : raw('');
      const H = raw(`<h1 class="d-display d-h1" data-sf-split="words">${emph(s.headline)}</h1>`);
      const copy = html`<div class="d-hero-copy">
        ${s.eyebrow ? html`<p class="d-eyebrow" data-sf-reveal="fade">${s.eyebrow}</p>` : ''}
        ${H}
        ${s.lede ? html`<p class="d-lede" data-sf-reveal="up" data-sf-delay="250">${s.lede}</p>` : ''}
        ${s.ctas.length ? html`<div class="d-actions" data-sf-reveal="up" data-sf-delay="400">${s.ctas.map((c, i) => btn(ctx, { ...c, style: i === 0 ? c.style : 'plain' }))}</div>` : ''}
      </div>`;
      if (s.variant === 'fullbleed') {
        return html`<section class="d-hero d-hero--fullbleed" id="${id}">
          <div class="d-hero-bg" data-sf-parallax="-0.15">${media(s.media, ctx, `${id}-bg`, { w: 1600, h: 1000, eager, sizes: '100vw' })}</div>
          <div class="d-wrap d-hero-grid">${copy}<p class="d-scroll-hint" aria-hidden="true">Scroll ${icon('arrowDown', 16)}</p></div>
        </section>`;
      }
      if (s.variant === 'typographic') {
        return html`<section class="d-hero d-hero--typographic" id="${id}" ${bgAttr}>
          ${ctx.dir === 'cinematic' ? raw('<div class="d-glow" aria-hidden="true" style="left:-20vmax;top:-20vmax"></div>') : ''}
          <div class="d-wrap d-hero-grid">
            ${s.eyebrow ? html`<p class="d-eyebrow" data-sf-reveal="fade">${s.eyebrow}</p>` : ''}
            ${H}
            <div class="d-hero-foot">
              ${s.lede ? html`<p class="d-lede" data-sf-reveal="up" data-sf-delay="250">${s.lede}</p>` : raw('<span></span>')}
              ${s.ctas.length ? html`<div class="d-actions" style="margin-top:0" data-sf-reveal="up" data-sf-delay="400">${s.ctas.map((c, i) => btn(ctx, { ...c, style: i === 0 ? c.style : 'plain' }))}</div>` : ''}
            </div>
          </div>
        </section>`;
      }
      if (s.variant === 'wordmark') {
        // The name is decoration here (the logo and headline already say it), so screen readers skip it.
        const name = ctx.site.name;
        return html`<section class="d-hero d-hero--wordmark" id="${id}">
          <p class="d-wordmark" aria-hidden="true" style="${`--chars:${Math.max(3, [...name].length)};--wm-em:${Math.max(1.5, nameWidth(name, ctx.type ?? DEFAULT_PAIRING[ctx.dir])).toFixed(3)}`}">${name}</p>
          <div class="d-wordmark-media">${media(s.media, ctx, `${id}-media`, { eager, sizes: '100vw' })}${s.sticker ? sticker(s.sticker) : ''}</div>
          <div class="d-wrap d-wordmark-copy">
            <div>${s.eyebrow ? html`<p class="d-eyebrow" data-sf-reveal="fade">${s.eyebrow}</p>` : ''}${H}</div>
            <div>
              ${s.lede ? html`<p class="d-lede" data-sf-reveal="up" data-sf-delay="200">${s.lede}</p>` : ''}
              ${s.ctas.length ? html`<div class="d-actions" data-sf-reveal="up" data-sf-delay="300">${s.ctas.map((c, i) => btn(ctx, { ...c, style: i === 0 ? c.style : 'plain' }))}</div>` : ''}
            </div>
          </div>
        </section>`;
      }
      if (s.variant === 'collage') {
        return html`<section class="d-hero d-hero--collage" id="${id}" ${bgAttr}>
          <div aria-hidden="true">${(s.collage ?? [undefined, undefined, undefined]).map((m, i) => html`<div class="d-collage-item" data-sf-parallax="${[0.25, -0.2, 0.35][i]}">${media(m, ctx, `${id}-c${i}`, { w: 400, h: 500, eager: i === 0 && eager, sizes: '(min-width: 760px) 16vw, 30vw' })}</div>`)}</div>
          <div class="d-wrap d-hero-grid">${copy}</div>
        </section>`;
      }
      return html`<section class="d-hero d-hero--split" id="${id}" ${bgAttr}>
        ${ctx.dir === 'cinematic' ? raw('<div class="d-glow" aria-hidden="true" style="right:-25vmax;top:-10vmax"></div>') : ''}
        <div class="d-wrap d-hero-grid">
          ${copy}
          <div class="d-hero-media">
            ${media(s.media, ctx, `${id}-media`, { w: 900, h: 900, eager, sizes: HERO_SPLIT_SIZES })}
            ${s.sticker ? sticker(s.sticker) : ''}
          </div>
        </div>
      </section>`;
    }
    case 'marquee':
      return html`<div class="${cls('d-marquee', s.outline && 'd-marquee--outline')}" data-sf-marquee="${s.speed}" ${raw(s.reverse ? 'data-sf-direction="right"' : '')} role="marquee" aria-label="${s.items.join(', ')}">${s.items.map((i) => html`<span>${i}</span>`)}</div>`;
    case 'statement':
      return html`<section class="${cls('d-section d-statement', tone(s.tone))}" id="${id}">
        <div class="d-wrap">
          ${s.eyebrow ? html`<p class="d-eyebrow" data-sf-reveal="fade" style="margin-bottom:28px">${s.eyebrow}</p>` : ''}
          <p data-sf-split="words">${emph(s.text)}</p>
          ${s.meta.length ? html`<div class="d-statement-meta" data-sf-reveal="fade">${s.meta.map((m) => html`<span>${m}</span>`)}</div>` : ''}
        </div>
      </section>`;
    case 'products':
      return html`<section class="${cls('d-section d-products', tone(s.tone))}" id="${id}">
        <div class="d-wrap">
          ${head(ctx, s, s.link ? html`<a class="d-btn" href="${link(ctx, s.link.href)}">${s.link.label} <span class="d-arrow">${icon('arrowRight')}</span></a>` : undefined)}
          <div data-sf-products id="${id}-grid" data-limit="${s.limit}" data-sort="${s.sort}" ${raw(s.featured ? 'data-featured' : '')} ${raw(s.category ? `data-category="${esc(s.category)}"` : '')} data-sf-stagger="80">${raw(CARD_TEMPLATE)}</div>
        </div>
      </section>`;
    case 'categories':
      if (s.style === 'circles') {
        // Round shortcuts: swipe sideways on phones, one row on computers.
        return html`<section class="d-section d-section--tight" id="${id}">
        <div class="d-wrap">
          <h2 class="d-circles-title">${s.title}</h2>
          <ul class="d-circles" role="list">${s.items.map((c, i) => html`<li><a class="d-circle" href="${link(ctx, c.href)}"><span class="d-circle-img">${media(c.media, ctx, `${id}-cat${i}`, { w: 240, h: 240, sizes: '120px' })}</span><span class="d-circle-label">${c.name}</span></a></li>`)}</ul>
        </div>
      </section>`;
      }
      return html`<section class="d-section" id="${id}">
        <div class="d-wrap">
          ${head(ctx, s)}
          <div class="d-cat-grid" data-sf-stagger="90">${s.items.map((c, i) => html`<a class="d-cat" href="${link(ctx, c.href)}" data-sf-reveal="${mv.reveal}" data-sf-cursor-label="Shop">${media(c.media, ctx, `${id}-cat${i}`, { w: 600, h: 800, sizes: '(min-width: 900px) 25vw, 50vw' })}<span class="d-cat-label">${c.name}${icon('arrowUpRight', 22)}</span></a>`)}</div>
        </div>
      </section>`;
    case 'trust':
      return html`<section class="${cls('d-trust', tone(s.tone))}" id="${id}" aria-label="${s.title ?? 'Our promises'}">
        <div class="d-wrap">
          ${s.title ? html`<h2 class="d-trust-title">${s.title}</h2>` : ''}
          <ul class="d-trust-list" role="list">${s.items.map((t) => html`<li class="d-trust-item">${icon(t.icon, 28)}<span><strong>${t.title}</strong>${t.text ? html`<span class="d-muted">${t.text}</span>` : ''}</span></li>`)}</ul>
        </div>
      </section>`;
    case 'story':
      return html`<section class="d-story" data-sf-hscroll aria-label="${s.title ?? 'Our story'}" id="${id}">
        <div class="panels" data-sf-hscroll-track>
          ${s.title ? html`<div class="d-panel" style="background:transparent;border:0;justify-content:center;align-content:center;grid-template-rows:auto">${s.eyebrow ? html`<p class="d-eyebrow">${s.eyebrow}</p>` : ''}<h2 class="d-display d-h2">${emph(s.title)}</h2></div>` : ''}
          ${s.panels.map((p, i) => html`<article class="d-panel">
            <div class="d-panel-media">${media(p.media, ctx, `${id}-p${i}`, { w: 800, h: 600 })}</div>
            <div><span class="d-panel-num">${num(i)}</span><h3>${p.title}</h3><p class="d-muted">${p.text}</p></div>
          </article>`)}
        </div>
      </section>`;
    case 'features':
      return html`<section class="${cls('d-section', tone(s.tone))}" id="${id}">
        <div class="d-wrap">
          ${head(ctx, s)}
          <div class="d-features" data-sf-stagger="100">${s.items.map((f, i) => html`<div class="d-feature" data-sf-reveal="${mv.reveal}"><span class="d-feature-num">${num(i)}</span><h3>${f.title}</h3><p class="d-muted">${f.text}</p></div>`)}</div>
        </div>
      </section>`;
    case 'gallery': {
      const dims = { square: [800, 800], portrait: [800, 1000], landscape: [1000, 700] } as const;
      return html`<section class="d-section" id="${id}">
        <div class="d-wrap">
          ${head(ctx, s)}
          <div class="d-gallery">${s.items.map((g, i) => {
            const [w, h] = dims[g.ratio];
            return html`<figure data-sf-reveal="${mv.reveal}">${media(g.media, ctx, `${id}-g${i}`, { w, h })}${g.caption ? html`<figcaption>${g.caption}</figcaption>` : ''}</figure>`;
          })}</div>
        </div>
      </section>`;
    }
    case 'menu':
      return html`<section class="${cls('d-section', tone(s.tone))}" id="${id}">
        <div class="d-wrap">
          ${head(ctx, s)}
          <div class="d-menu-grid">${s.categories.map((c) => html`<div class="d-menu-cat" data-sf-reveal="${mv.reveal}">
            <h3>${c.name}</h3>
            <ul class="d-menu-list">${c.items.map((d) => html`<li class="d-dish">
              ${d.diet ? html`<span class="${`d-diet d-diet--${d.diet === 'veg' ? 'veg' : 'nonveg'}`}" role="img" aria-label="${d.diet === 'veg' ? 'Vegetarian' : d.diet === 'egg' ? 'Contains egg' : 'Non-vegetarian'}"></span>` : raw('<span></span>')}
              <span class="d-dish-name">${d.name}</span>
              <span class="d-dish-price">${inr(d.price_paise)}</span>
              ${d.description ? html`<span class="d-dish-desc">${d.description}</span>` : ''}
            </li>`)}</ul>
          </div>`)}</div>
          ${s.note ? html`<p class="d-muted" style="margin-top:40px;font-size:.9rem">${s.note}</p>` : ''}
        </div>
      </section>`;
    case 'booking':
      return html`<section class="${cls('d-section', tone(s.tone))}" id="${s.anchor ?? 'book'}">
        <div class="d-wrap d-split">
          <div>
            ${s.eyebrow ? html`<p class="d-eyebrow" data-sf-reveal="fade">${s.eyebrow}</p>` : ''}
            <h2 class="d-display d-h2" data-sf-split="words" style="margin-top:14px">${emph(s.title)}</h2>
            ${s.text ? html`<p class="d-lede" style="margin-top:24px" data-sf-reveal="up">${s.text}</p>` : ''}
          </div>
          <div class="d-booking" data-sf-booking ${raw(s.service ? `data-service="${esc(s.service)}"` : '')} data-days="${s.days}"></div>
        </div>
      </section>`;
    case 'quotes':
      return html`<section class="d-section" id="${id}">
        <div class="d-wrap">
          ${head(ctx, s)}
          <div class="d-quotes">${s.items.map((q) => html`<figure class="d-quote" data-sf-reveal="${mv.reveal}"><blockquote>“${q.quote}”</blockquote><figcaption><strong>${q.name}</strong> · ${q.source}</figcaption></figure>`)}</div>
        </div>
      </section>`;
    case 'stats':
      return html`<section class="${cls('d-section d-section--tight', tone(s.tone))}" id="${id}">
        <div class="d-wrap"><dl class="d-stats" data-sf-stagger="100">${s.items.map((st) => html`<div class="d-stat" data-sf-reveal="up"><dt class="d-sr">${st.label}</dt><dd style="margin:0"><b>${st.value}</b><span class="d-muted">${st.label}</span></dd></div>`)}</dl></div>
      </section>`;
    case 'faq':
      return html`<section class="d-section" id="${id}">
        <div class="d-wrap d-split">
          ${head(ctx, s)}
          <div class="d-faq">${s.items.map((f) => html`<details><summary>${f.q}</summary><p>${f.a}</p></details>`)}</div>
        </div>
      </section>`;
    case 'cta': {
      const bg = s.background !== 'none' ? raw(`data-sf-bg="${s.background}" data-sf-colors="${backgroundColours(ctx.dir, ctx.palette, s.tone)}"`) : raw('');
      return html`<section class="${cls('d-section d-cta', s.tone === 'invert' ? 'd-section--invert' : tone(s.tone))}" id="${id}" ${bg}>
        <div class="d-wrap">
          ${s.eyebrow ? html`<p class="d-eyebrow" data-sf-reveal="fade" style="justify-content:center">${s.eyebrow}</p>` : ''}
          <h2 class="d-display d-h2" data-sf-split="words" style="margin-top:18px">${emph(s.headline)}</h2>
          <div class="d-actions">${s.ctas.map((c) => btn(ctx, c))}</div>
        </div>
      </section>`;
    }
    case 'contact': {
      const a = ctx.site.address;
      const addr = a ? [a.street, a.area, `${a.city} ${a.pincode}`].filter(Boolean).join(', ') : '';
      const map = a ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ctx.site.name}, ${addr}`)}` : '';
      const wa = ctx.site.whatsapp ? `https://wa.me/${ctx.site.whatsapp.replace(/\D/g, '')}` : '';
      const t12 = (t: string) => { const [h, m] = t.split(':').map(Number); return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h >= 12 ? 'pm' : 'am'}`; };
      return html`<section class="d-section" id="${s.anchor ?? 'visit'}">
        <div class="d-wrap d-split">
          <div>
            ${head(ctx, s)}
            <dl class="d-contact-list" data-sf-reveal="up">
              ${addr ? html`<div><dt>Address</dt><dd><a class="d-link" href="${map}" target="_blank" rel="noopener">${addr}</a></dd></div>` : ''}
              ${ctx.site.phone ? html`<div><dt>Call</dt><dd><a class="d-link" href="${`tel:${ctx.site.phone}`}">${ctx.site.phone.replace(/^\+91(\d{5})(\d{5})$/, '+91 $1 $2')}</a></dd></div>` : ''}
              ${wa ? html`<div><dt>WhatsApp</dt><dd><a class="d-link" href="${wa}" target="_blank" rel="noopener">Message us</a></dd></div>` : ''}
              ${ctx.site.email ? html`<div><dt>Email</dt><dd><a class="d-link" href="${`mailto:${ctx.site.email}`}">${ctx.site.email}</a></dd></div>` : ''}
            </dl>
          </div>
          <div>
            ${ctx.site.hours?.length ? html`<table class="d-hours" data-sf-reveal="up"><caption class="d-eyebrow" style="text-align:left;margin-bottom:12px">Opening hours</caption><tbody>${ctx.site.hours.map((h) => html`<tr><th scope="row">${h.days}</th><td>${t12(h.open)} – ${t12(h.close)}</td></tr>`)}</tbody></table>` : ''}
            ${s.media ? html`<div class="d-media-frame" style="aspect-ratio:4/3;margin-top:32px" data-sf-reveal="${mv.reveal}">${media(s.media, ctx, `${id}-m`, { w: 800, h: 600, sizes: '(min-width: 900px) 45vw, 92vw' })}</div>` : ''}
          </div>
        </div>
      </section>`;
    }
    case 'rows':
      return html`<section class="${cls('d-section d-rows', tone(s.tone))}" id="${id}">
        <div class="d-wrap">
          ${head(ctx, s)}
          <div class="d-rows-list">${s.items.map((r, i) => html`<article class="${cls('d-row', i % 2 === 1 && 'd-row--flip')}">
            <div class="d-row-media d-media-frame" data-sf-reveal="${mv.reveal}">${media(r.media, ctx, `${id}-r${i}`, { sizes: '(min-width: 900px) 55vw, 92vw' })}</div>
            <div class="d-row-copy" data-sf-reveal="up">
              ${r.eyebrow ? html`<p class="d-eyebrow">${r.eyebrow}</p>` : ''}
              <h3 class="d-display d-h3">${emph(r.title)}</h3>
              <p class="d-lede">${r.text}</p>
              ${r.link ? html`<a class="d-btn" href="${link(ctx, r.link.href)}">${r.link.label} <span class="d-arrow">${icon('arrowRight')}</span></a>` : ''}
            </div>
          </article>`)}</div>
        </div>
      </section>`;
    case 'bento':
      return html`<section class="d-section" id="${id}">
        <div class="d-wrap">
          ${head(ctx, s)}
          <div class="d-bento" data-sf-stagger="70">${s.tiles.map((t, i) => {
            const size = `d-tile--${t.size}`;
            if (t.kind === 'photo') return html`<figure class="${cls('d-tile d-tile--photo', size)}" data-sf-reveal="${mv.reveal}">${media(t.media, ctx, `${id}-t${i}`, { sizes: t.size === 'big' || t.size === 'wide' ? '(min-width: 900px) 50vw, 100vw' : '(min-width: 900px) 25vw, 50vw' })}${t.caption ? html`<figcaption>${t.caption}</figcaption>` : ''}</figure>`;
            const toneCls = t.tone === 'accent' ? 'd-block--accent' : t.tone === 'invert' ? 'd-section--invert' : t.tone === 'pop' ? 'd-block--pop' : 'd-tile--surface';
            if (t.kind === 'stat') return html`<div class="${cls('d-tile d-tile--stat', size, toneCls)}" data-sf-reveal="up"><b class="d-display">${t.value}</b><span>${t.label}</span></div>`;
            return html`<div class="${cls('d-tile d-tile--text', size, toneCls)}" data-sf-reveal="up"><h3 class="d-display d-h3">${emph(t.title)}</h3>${t.text ? html`<p>${t.text}</p>` : ''}</div>`;
          })}</div>
        </div>
      </section>`;
    case 'scrolly': {
      // Each step names a scroll timeline; the pinned photo for that step fades in as the step
      // reaches the middle of the screen. Browsers without scroll timelines, phones and people who
      // turned animations off see each photo inline with its step instead.
      const tl = (i: number) => `--sc-${id}-${i}`;
      return html`<section class="${cls('d-section d-scrolly', tone(s.tone))}" id="${id}">
        <div class="d-wrap">
          ${head(ctx, s)}
          <div class="d-scrolly-grid" style="${`timeline-scope:${s.steps.map((_, i) => tl(i)).join(',')}`}">
            <div class="d-scrolly-stage" aria-hidden="true">${s.steps.map((st, i) => html`<div class="d-scrolly-frame" style="${`animation-timeline:${tl(i)}`}">${media(st.media, ctx, `${id}-f${i}`, { sizes: '45vw' })}</div>`)}</div>
            <ol class="d-scrolly-steps">${s.steps.map((st, i) => html`<li class="d-scrolly-step" style="${`view-timeline-name:${tl(i)}`}">
              <div class="d-scrolly-photo d-media-frame">${media(st.media, ctx, `${id}-s${i}`, { sizes: '92vw' })}</div>
              <div class="d-scrolly-copy" data-sf-reveal="up">
                <span class="d-scrolly-num">${num(i)}</span>
                ${st.eyebrow ? html`<p class="d-eyebrow">${st.eyebrow}</p>` : ''}
                <h3 class="d-display d-h3">${emph(st.title)}</h3>
                <p class="d-lede">${st.text}</p>
              </div>
            </li>`)}</ol>
          </div>
        </div>
      </section>`;
    }
    case 'index':
      return html`<section class="${cls('d-section d-index', tone(s.tone))}" id="${id}">
        <div class="d-wrap">
          ${head(ctx, s)}
          <ul class="d-index-list">${s.items.map((it, i) => {
            const inner = html`<span class="d-index-thumb">${media(it.media, ctx, `${id}-i${i}`, { sizes: '(hover: hover) and (min-width: 900px) 24vw, 72px' })}</span>
              <span class="d-index-num">${num(i)}</span>
              <span class="d-index-title d-display">${it.title}</span>
              ${it.meta ? html`<span class="d-index-meta">${it.meta}</span>` : ''}
              ${it.href ? html`<span class="d-index-go">${icon('arrowUpRight', 22)}</span>` : ''}`;
            return html`<li class="d-index-item" data-sf-reveal="up">${it.href ? html`<a class="d-index-row" href="${link(ctx, it.href)}">${inner}</a>` : html`<div class="d-index-row">${inner}</div>`}</li>`;
          })}</ul>
        </div>
      </section>`;
    case 'reel':
      return html`<section class="${cls('d-section d-reel', tone(s.tone))}" id="${id}">
        <div class="d-wrap">${head(ctx, s, html`<p class="d-reel-hint d-muted">Swipe ${icon('arrowRight', 16)}</p>`)}</div>
        <div class="d-reel-track" tabindex="0" role="region" aria-label="${s.title ? s.title.replace(/\*/g, '') : 'Photos'}">
          ${s.items.map((it, i) => html`<figure class="d-reel-item">
            <div class="d-reel-media">${media(it.media, ctx, `${id}-r${i}`, { sizes: '(min-width: 900px) 34vw, 78vw' })}</div>
            <figcaption><span class="d-reel-num">${num(i)}</span><b>${it.title}</b>${it.text ? html`<span class="d-muted">${it.text}</span>` : ''}</figcaption>
          </figure>`)}
        </div>
      </section>`;
    case 'photostrip': {
      // One set of photos gliding back and forth: no hidden duplicates for screen readers to trip on.
      // Each photo loads lazily as it glides (or is swiped) into view.
      // With animations off it becomes a row you can scroll (and reach by keyboard).
      const dur = Math.round((s.items.length * 360) / s.speed);
      return html`<section class="d-photostrip" id="${id}" aria-label="Photos" tabindex="0">
        <div class="${cls('d-strip-track', s.reverse && 'd-strip-track--reverse')}" style="${`--strip-dur:${dur}s`}">
          ${s.items.map((m, i) => html`<div class="d-strip-item">${media(m, ctx, `${id}-p${i}`, { sizes: '(min-width: 900px) 20vw, 180px' })}</div>`)}
        </div>
      </section>`;
    }
    case 'pinned':
      return html`<section class="${cls('d-section d-pinned', tone(s.tone))}" id="${id}">
        <div class="d-wrap d-pinned-grid">
          <div class="d-pinned-head">
            ${s.eyebrow ? html`<p class="d-eyebrow" data-sf-reveal="fade">${s.eyebrow}</p>` : ''}
            <h2 class="d-display d-h2" data-sf-split="words">${emph(s.title)}</h2>
            ${s.text ? html`<p class="d-lede" data-sf-reveal="up">${s.text}</p>` : ''}
            ${s.cta ? html`<div class="d-actions" style="margin-top:8px">${btn(ctx, s.cta)}</div>` : ''}
          </div>
          <ol class="d-pinned-list">${s.items.map((it, i) => html`<li class="d-pinned-card" data-sf-reveal="up">
            ${it.media ? html`<div class="d-pinned-media d-media-frame">${media(it.media, ctx, `${id}-c${i}`, { sizes: '(min-width: 900px) 48vw, 92vw' })}</div>` : ''}
            <div class="d-pinned-copy"><span class="d-pinned-num">${num(i)}</span><h3 class="d-display d-h3">${emph(it.title)}</h3><p class="d-muted">${it.text}</p></div>
          </li>`)}</ol>
        </div>
      </section>`;
    case 'wishlist':
      return html`<section class="d-section" id="${id}" style="padding-top:clamp(40px,6vw,80px)">
        <div class="d-wrap">
          <h1 class="d-display d-h2" style="margin-bottom:clamp(28px,4vw,48px)">${emph(s.title)}</h1>
          <h2 class="d-sr">Saved products</h2>
          <div class="d-products"><div data-sf-wishlist data-empty="${s.empty}">${raw(CARD_TEMPLATE)}</div></div>
        </div>
      </section>`;
    case 'shop':
      return html`<section class="d-section" id="${id}" style="padding-top:clamp(40px,6vw,80px)">
        <div class="d-wrap">
          ${s.eyebrow ? html`<p class="d-eyebrow">${s.eyebrow}</p>` : ''}
          <h1 class="d-display d-h2" data-sf-split="words" style="margin:14px 0 clamp(28px,4vw,48px)">${emph(s.title)}</h1>
          <div class="d-shop">
            <form data-sf-filters data-for="shop" aria-label="Filters"></form>
            <div>
              <div class="d-toolbar"><input data-sf-search data-for="shop" placeholder="Search…" aria-label="Search products"><select data-sf-sort data-for="shop" aria-label="Sort products"></select></div>
              <h2 class="d-sr">Products</h2>
              <div class="d-products"><div data-sf-products id="shop" data-sync-url>${raw(CARD_TEMPLATE)}</div></div>
            </div>
          </div>
        </div>
      </section>`;
  }
}
