// The page definition: what the AI Builder (Phase 3) produces and a human can
// edit. Everything is validated before a page is built.
import { z } from 'zod';
import { PROMISE_ICONS } from './icons';
import { BUTTONS, PAIRING_IDS, PHOTO_TONES, SCALES, SHAPES, SPACES } from './style';

export const DIRECTIONS = ['editorial', 'bold', 'cinematic', 'crafted', 'poster', 'quiet', 'block'] as const;
export type Direction = (typeof DIRECTIONS)[number];
export const OBJECTS = ['ring', 'gem', 'knot', 'blob', 'cup', 'orbit', 'stack'] as const;

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Colours must look like #1a2b3c');
const text = (max: number) => z.string().trim().min(1).max(max);
const href = z.string().max(500);
const imagePath = z.string().regex(/^(\/[\w./%-]+|https:\/\/[^\s"'<>]+)$/, 'Image address must be a site path or https URL').max(500);

export const Image = z.object({
  src: imagePath, alt: z.string().max(200), width: z.number().int().positive(), height: z.number().int().positive(),
  srcset: z.string().max(1000).optional(),
});
// Real photos only: there is no drawn or generated artwork. A 3D object, model or video
// can carry a photo to show until it loads (and on phones that skip 3D).
export const Media = z.union([
  z.object({ image: Image }),
  z.object({ object: z.enum(OBJECTS), color: hex.optional(), material: z.enum(['metal', 'glass', 'matte', 'ceramic']).optional(), label: text(160), poster: Image.optional() }),
  z.object({ model: imagePath.refine((s) => /\.glb(\?|$)/.test(s), 'Models must be .glb files'), label: text(160), poster: Image.optional() }),
  z.object({ video: z.object({ src: imagePath, poster: imagePath.optional() }), label: text(160).optional() }),
]);
export type MediaT = z.infer<typeof Media>;

const Link = z.object({ label: text(40), href });
const Cta = z.object({ label: text(40), href, style: z.enum(['solid', 'plain']).default('solid') });

// Any section can have an anchor, so menus can link to it: "/#our-bread".
const anchor = z.string().regex(/^[a-z][a-z0-9-]{1,30}$/, 'Anchors are short lowercase words with dashes, like our-bread').optional();
// Any section can also have a backdrop, learned from award-winning sites: a sky or dusk gradient
// (Obys, Lusion), a soft glow (Apple), a hairline grid (DIKO, Overrrides), halftone dots (Obys),
// or a flat field of the look's accent, pop or dark colour (DIKO, Mode). All drawn in CSS, never pictures.
export const BACKDROPS = ['sky', 'dusk', 'glow', 'grid', 'dots', 'accent', 'pop', 'dark'] as const;
const backdrop = z.enum(BACKDROPS).optional();

const S = {
  hero: z.object({
    // wordmark: the business name set edge to edge over a big photo (poster style).
    type: z.literal('hero'), anchor, backdrop, variant: z.enum(['split', 'fullbleed', 'typographic', 'collage', 'wordmark']),
    eyebrow: text(80).optional(), headline: text(140), lede: text(320).optional(), ctas: z.array(Cta).max(2).default([]),
    media: Media.optional(), collage: z.array(Media).max(3).optional(), sticker: text(40).optional(),
    background: z.enum(['none', 'aurora', 'particles', 'waves']).default('none'),
  }),
  marquee: z.object({ type: z.literal('marquee'), anchor, backdrop, items: z.array(text(60)).min(2).max(10), outline: z.boolean().default(false), speed: z.number().min(10).max(200).default(60), reverse: z.boolean().default(false) }),
  statement: z.object({ type: z.literal('statement'), anchor, backdrop, eyebrow: text(80).optional(), text: text(400), meta: z.array(text(80)).max(4).default([]), tone: z.enum(['default', 'invert', 'surface', 'pop']).default('default') }),
  products: z.object({ type: z.literal('products'), anchor, backdrop, eyebrow: text(80).optional(), title: text(120), link: Link.optional(), featured: z.boolean().default(false), category: z.string().max(60).optional(), limit: z.number().int().min(1).max(24).default(8), sort: z.enum(['featured', 'price-asc', 'price-desc', 'newest', 'discount']).default('featured'), tone: z.enum(['default', 'invert', 'surface']).default('default') }),
  // "circles": a row of round shortcuts, the shop-by-category row big shops put in the first screen.
  categories: z.object({ type: z.literal('categories'), anchor, backdrop, eyebrow: text(80).optional(), title: text(120), items: z.array(z.object({ name: text(40), href, media: Media })).min(2).max(10), style: z.enum(['tiles', 'circles']).default('tiles') }),
  // The promises that make people comfortable buying (delivery, cash on delivery, returns, secure payment…).
  trust: z.object({ type: z.literal('trust'), anchor, backdrop, title: text(120).optional(), items: z.array(z.object({ icon: z.enum(PROMISE_ICONS), title: text(40), text: text(90).optional() })).min(2).max(5), tone: z.enum(['default', 'invert', 'surface']).default('surface') }),
  story: z.object({ type: z.literal('story'), anchor, backdrop, eyebrow: text(80).optional(), title: text(120).optional(), panels: z.array(z.object({ title: text(80), text: text(300), media: Media.optional() })).min(2).max(6) }),
  features: z.object({ type: z.literal('features'), anchor, backdrop, eyebrow: text(80).optional(), title: text(120), items: z.array(z.object({ title: text(60), text: text(240) })).min(2).max(6), tone: z.enum(['default', 'invert', 'surface']).default('default') }),
  gallery: z.object({ type: z.literal('gallery'), anchor, backdrop, eyebrow: text(80).optional(), title: text(120), items: z.array(z.object({ media: Media, caption: text(120).optional(), ratio: z.enum(['square', 'portrait', 'landscape']).default('portrait') })).min(3).max(12) }),
  menu: z.object({ type: z.literal('menu'), anchor, backdrop, eyebrow: text(80).optional(), title: text(120), note: text(200).optional(),
    categories: z.array(z.object({ name: text(60), items: z.array(z.object({ name: text(80), description: text(200).optional(), price_paise: z.number().int().nonnegative(), diet: z.enum(['veg', 'nonveg', 'egg']).optional() })).min(1).max(30) })).min(1).max(10), tone: z.enum(['default', 'invert', 'surface']).default('default') }),
  booking: z.object({ type: z.literal('booking'), anchor, backdrop, eyebrow: text(80).optional(), title: text(120), text: text(400).optional(), service: z.string().max(60).optional(), days: z.number().int().min(1).max(60).default(10), tone: z.enum(['default', 'invert', 'surface']).default('surface') }),
  quotes: z.object({ type: z.literal('quotes'), anchor, backdrop, eyebrow: text(80).optional(), title: text(120),
    // Only real reviews: every quote must say who wrote it and where it came from.
    items: z.array(z.object({ quote: text(400), name: text(60), source: text(80) })).min(1).max(6) }),
  stats: z.object({ type: z.literal('stats'), anchor, backdrop, items: z.array(z.object({ value: text(12), label: text(60) })).min(2).max(4), tone: z.enum(['default', 'invert']).default('default') }),
  faq: z.object({ type: z.literal('faq'), anchor, backdrop, eyebrow: text(80).optional(), title: text(120), items: z.array(z.object({ q: text(160), a: text(800) })).min(1).max(12) }),
  cta: z.object({ type: z.literal('cta'), anchor, backdrop, eyebrow: text(80).optional(), headline: text(120), ctas: z.array(Cta).min(1).max(2), tone: z.enum(['default', 'invert', 'pop', 'accent']).default('invert'), background: z.enum(['none', 'aurora', 'particles', 'waves']).default('none') }),
  contact: z.object({ type: z.literal('contact'), anchor, backdrop, eyebrow: text(80).optional(), title: text(120), media: Media.optional() }),
  shop: z.object({ type: z.literal('shop'), anchor, backdrop, eyebrow: text(80).optional(), title: text(120) }),
  // Alternating photo-and-text rows (one idea per row, big photography).
  rows: z.object({ type: z.literal('rows'), anchor, backdrop, eyebrow: text(80).optional(), title: text(120).optional(),
    items: z.array(z.object({ eyebrow: text(60).optional(), title: text(100), text: text(400), media: Media, link: Link.optional() })).min(1).max(6), tone: z.enum(['default', 'invert', 'surface']).default('default') }),
  // A mixed grid of photos, short statements and numbers.
  bento: z.object({ type: z.literal('bento'), anchor, backdrop, eyebrow: text(80).optional(), title: text(120).optional(),
    tiles: z.array(z.union([
      z.object({ kind: z.literal('photo'), media: Media, caption: text(80).optional(), size: z.enum(['normal', 'wide', 'tall', 'big']).default('normal') }),
      z.object({ kind: z.literal('text'), title: text(80), text: text(200).optional(), size: z.enum(['normal', 'wide', 'tall', 'big']).default('normal'), tone: z.enum(['surface', 'accent', 'invert', 'pop']).default('surface') }),
      z.object({ kind: z.literal('stat'), value: text(12), label: text(60), size: z.enum(['normal', 'wide', 'tall', 'big']).default('normal'), tone: z.enum(['surface', 'accent', 'invert', 'pop']).default('accent') }),
    ])).min(3).max(8) }),
  wishlist: z.object({ type: z.literal('wishlist'), anchor, backdrop, title: text(120).default('Your wishlist'), empty: text(160).default('Nothing saved yet. Tap the heart on anything you like.') }),
  // A photo that stays put while the story scrolls past it, changing with each step.
  scrolly: z.object({ type: z.literal('scrolly'), anchor, backdrop, eyebrow: text(80).optional(), title: text(120).optional(),
    steps: z.array(z.object({ eyebrow: text(60).optional(), title: text(100), text: text(400), media: Media })).min(2).max(6), tone: z.enum(['default', 'invert', 'surface']).default('default') }),
  // A big typographic list; pointing at a line shows its photo (on phones, a small photo sits beside it).
  index: z.object({ type: z.literal('index'), anchor, backdrop, eyebrow: text(80).optional(), title: text(120).optional(),
    items: z.array(z.object({ title: text(60), meta: text(60).optional(), href: href.optional(), media: Media })).min(2).max(10), tone: z.enum(['default', 'invert', 'surface']).default('default') }),
  // A row of big photos you swipe or scroll sideways.
  reel: z.object({ type: z.literal('reel'), anchor, backdrop, eyebrow: text(80).optional(), title: text(120).optional(),
    items: z.array(z.object({ media: Media, title: text(80), text: text(200).optional() })).min(3).max(12), tone: z.enum(['default', 'invert', 'surface']).default('default') }),
  // Photos gliding slowly across the page, like a film strip.
  photostrip: z.object({ type: z.literal('photostrip'), anchor, backdrop, items: z.array(Media).min(4).max(12), speed: z.number().min(10).max(120).default(40), reverse: z.boolean().default(false) }),
  // Split screen: the heading stays pinned on one side while cards scroll on the other.
  pinned: z.object({ type: z.literal('pinned'), anchor, backdrop, eyebrow: text(80).optional(), title: text(120), text: text(400).optional(), cta: Cta.optional(),
    items: z.array(z.object({ title: text(80), text: text(300), media: Media.optional() })).min(2).max(8), tone: z.enum(['default', 'invert', 'surface', 'pop']).default('default') }),
};
export const Section = z.discriminatedUnion('type', [S.hero, S.marquee, S.statement, S.products, S.categories, S.trust, S.story, S.features, S.gallery, S.menu, S.booking, S.quotes, S.stats, S.faq, S.cta, S.contact, S.shop, S.wishlist, S.rows, S.bento, S.scrolly, S.index, S.reel, S.photostrip, S.pinned]);
export type SectionT = z.infer<typeof Section>;
export const SECTION_TYPES = Object.keys(S);

export const SiteDef = z.object({
  direction: z.enum(DIRECTIONS),
  site: z.object({
    id: z.string().regex(/^[\w-]{3,64}$/), name: text(80), tagline: text(160).optional(), description: text(300),
    url: z.string().regex(/^https:\/\/[^\s/]+$/).optional(),
    phone: z.string().regex(/^\+\d{8,15}$/).optional(), whatsapp: z.string().regex(/^\+\d{8,15}$/).optional(), email: z.string().email().optional(),
    address: z.object({ street: text(120), area: text(80).optional(), city: text(60), state: text(60), pincode: z.string().regex(/^\d{6}$/) }).optional(),
    hours: z.array(z.object({ days: text(40), open: z.string().regex(/^\d{2}:\d{2}$/), close: z.string().regex(/^\d{2}:\d{2}$/) })).max(7).optional(),
    social: z.object({ instagram: z.string().url().optional(), facebook: z.string().url().optional(), youtube: z.string().url().optional() }).optional(),
    businessType: z.string().regex(/^[A-Za-z]{3,40}$/).default('LocalBusiness'),
    sampleNotice: z.string().max(300).optional(),
    /** The business's own logo, shown in the header instead of the name. */
    logo: Image.optional(),
  }),
  /** Photographers whose photos the site uses (shown in the footer). */
  credits: z.array(z.object({ name: text(80), url: z.string().regex(/^https:\/\/[^\s"'<>]+$/).max(300), source: z.enum(['Pexels', 'Unsplash']) })).max(80).default([]),
  /** Art direction for this site: its own type pairing, scale, corners, spacing, buttons and photo grading. */
  style: z.object({
    type: z.enum(PAIRING_IDS).optional(), scale: z.enum(SCALES).optional(), headlineCase: z.enum(['auto', 'upper', 'normal']).optional(),
    shape: z.enum(SHAPES).optional(), space: z.enum(SPACES).optional(), buttons: z.enum(BUTTONS).optional(), photos: z.enum(PHOTO_TONES).optional(),
  }).optional(),
  palette: z.object({ bg: hex, surface: hex, ink: hex, muted: hex, line: hex, accent: hex, accentInk: hex }).partial().optional(),
  /** A slim bar above the header: an offer, free delivery, a new launch. */
  announcement: z.object({ text: text(100), href: href.optional() }).optional(),
  // A bar fixed to the bottom of phone screens with the one or two things a visitor most wants to do.
  actionBar: z.object({ actions: z.array(z.object({ label: text(28), href, icon: z.enum(PROMISE_ICONS).optional() })).min(1).max(2) }).optional(),
  nav: z.array(Link).max(7).default([]),
  commerce: z.object({ source: z.record(z.string(), z.unknown()), delivery: z.record(z.string(), z.unknown()).optional(), payments: z.record(z.string(), z.unknown()).optional(), privacyUrl: z.string().optional() }).optional(),
  pages: z.array(z.object({ path: z.string().regex(/^\/([\w-]+\/)*$/), title: text(70), description: text(160), sections: z.array(Section).min(1).max(30) })).min(1).max(20),
});
export type SiteDefT = z.infer<typeof SiteDef>;
