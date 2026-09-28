// The page definition: what the AI Builder (Phase 3) produces and a human can
// edit. Everything is validated before a page is built.
import { z } from 'zod';

export const DIRECTIONS = ['editorial', 'bold', 'cinematic', 'crafted'] as const;
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

const S = {
  hero: z.object({
    type: z.literal('hero'), anchor, variant: z.enum(['split', 'fullbleed', 'typographic', 'collage']),
    eyebrow: text(80).optional(), headline: text(140), lede: text(320).optional(), ctas: z.array(Cta).max(2).default([]),
    media: Media.optional(), collage: z.array(Media).max(3).optional(), sticker: text(40).optional(),
    background: z.enum(['none', 'aurora', 'particles', 'waves']).default('none'),
  }),
  marquee: z.object({ type: z.literal('marquee'), anchor, items: z.array(text(60)).min(2).max(10), outline: z.boolean().default(false), speed: z.number().min(10).max(200).default(60), reverse: z.boolean().default(false) }),
  statement: z.object({ type: z.literal('statement'), anchor, eyebrow: text(80).optional(), text: text(400), meta: z.array(text(80)).max(4).default([]), tone: z.enum(['default', 'invert', 'surface', 'pop']).default('default') }),
  products: z.object({ type: z.literal('products'), anchor, eyebrow: text(80).optional(), title: text(120), link: Link.optional(), featured: z.boolean().default(false), category: z.string().max(60).optional(), limit: z.number().int().min(1).max(24).default(8), sort: z.enum(['featured', 'price-asc', 'price-desc', 'newest', 'discount']).default('featured'), tone: z.enum(['default', 'invert', 'surface']).default('default') }),
  categories: z.object({ type: z.literal('categories'), anchor, eyebrow: text(80).optional(), title: text(120), items: z.array(z.object({ name: text(40), href, media: Media })).min(2).max(8) }),
  story: z.object({ type: z.literal('story'), anchor, eyebrow: text(80).optional(), title: text(120).optional(), panels: z.array(z.object({ title: text(80), text: text(300), media: Media.optional() })).min(2).max(6) }),
  features: z.object({ type: z.literal('features'), anchor, eyebrow: text(80).optional(), title: text(120), items: z.array(z.object({ title: text(60), text: text(240) })).min(2).max(6), tone: z.enum(['default', 'invert', 'surface']).default('default') }),
  gallery: z.object({ type: z.literal('gallery'), anchor, eyebrow: text(80).optional(), title: text(120), items: z.array(z.object({ media: Media, caption: text(120).optional(), ratio: z.enum(['square', 'portrait', 'landscape']).default('portrait') })).min(3).max(12) }),
  menu: z.object({ type: z.literal('menu'), anchor, eyebrow: text(80).optional(), title: text(120), note: text(200).optional(),
    categories: z.array(z.object({ name: text(60), items: z.array(z.object({ name: text(80), description: text(200).optional(), price_paise: z.number().int().nonnegative(), diet: z.enum(['veg', 'nonveg', 'egg']).optional() })).min(1).max(30) })).min(1).max(10), tone: z.enum(['default', 'invert', 'surface']).default('default') }),
  booking: z.object({ type: z.literal('booking'), anchor, eyebrow: text(80).optional(), title: text(120), text: text(400).optional(), service: z.string().max(60).optional(), days: z.number().int().min(1).max(60).default(10), tone: z.enum(['default', 'invert', 'surface']).default('surface') }),
  quotes: z.object({ type: z.literal('quotes'), anchor, eyebrow: text(80).optional(), title: text(120),
    // Only real reviews: every quote must say who wrote it and where it came from.
    items: z.array(z.object({ quote: text(400), name: text(60), source: text(80) })).min(1).max(6) }),
  stats: z.object({ type: z.literal('stats'), anchor, items: z.array(z.object({ value: text(12), label: text(60) })).min(2).max(4), tone: z.enum(['default', 'invert']).default('default') }),
  faq: z.object({ type: z.literal('faq'), anchor, eyebrow: text(80).optional(), title: text(120), items: z.array(z.object({ q: text(160), a: text(800) })).min(1).max(12) }),
  cta: z.object({ type: z.literal('cta'), anchor, eyebrow: text(80).optional(), headline: text(120), ctas: z.array(Cta).min(1).max(2), tone: z.enum(['default', 'invert', 'pop', 'accent']).default('invert'), background: z.enum(['none', 'aurora', 'particles', 'waves']).default('none') }),
  contact: z.object({ type: z.literal('contact'), anchor, eyebrow: text(80).optional(), title: text(120), media: Media.optional() }),
  shop: z.object({ type: z.literal('shop'), anchor, eyebrow: text(80).optional(), title: text(120) }),
  // Alternating photo-and-text rows (one idea per row, big photography).
  rows: z.object({ type: z.literal('rows'), anchor, eyebrow: text(80).optional(), title: text(120).optional(),
    items: z.array(z.object({ eyebrow: text(60).optional(), title: text(100), text: text(400), media: Media, link: Link.optional() })).min(1).max(6), tone: z.enum(['default', 'invert', 'surface']).default('default') }),
  // A mixed grid of photos, short statements and numbers.
  bento: z.object({ type: z.literal('bento'), anchor, eyebrow: text(80).optional(), title: text(120).optional(),
    tiles: z.array(z.union([
      z.object({ kind: z.literal('photo'), media: Media, caption: text(80).optional(), size: z.enum(['normal', 'wide', 'tall', 'big']).default('normal') }),
      z.object({ kind: z.literal('text'), title: text(80), text: text(200).optional(), size: z.enum(['normal', 'wide', 'tall', 'big']).default('normal'), tone: z.enum(['surface', 'accent', 'invert', 'pop']).default('surface') }),
      z.object({ kind: z.literal('stat'), value: text(12), label: text(60), size: z.enum(['normal', 'wide', 'tall', 'big']).default('normal'), tone: z.enum(['surface', 'accent', 'invert', 'pop']).default('accent') }),
    ])).min(3).max(8) }),
  wishlist: z.object({ type: z.literal('wishlist'), anchor, title: text(120).default('Your wishlist'), empty: text(160).default('Nothing saved yet. Tap the heart on anything you like.') }),
};
export const Section = z.discriminatedUnion('type', [S.hero, S.marquee, S.statement, S.products, S.categories, S.story, S.features, S.gallery, S.menu, S.booking, S.quotes, S.stats, S.faq, S.cta, S.contact, S.shop, S.wishlist, S.rows, S.bento]);
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
  }),
  /** Photographers whose photos the site uses (shown in the footer). */
  credits: z.array(z.object({ name: text(80), url: z.string().regex(/^https:\/\/[^\s"'<>]+$/).max(300), source: z.enum(['Pexels', 'Unsplash']) })).max(80).default([]),
  palette: z.object({ bg: hex, surface: hex, ink: hex, muted: hex, line: hex, accent: hex, accentInk: hex }).partial().optional(),
  nav: z.array(Link).max(7).default([]),
  commerce: z.object({ source: z.record(z.string(), z.unknown()), delivery: z.record(z.string(), z.unknown()).optional(), payments: z.record(z.string(), z.unknown()).optional(), privacyUrl: z.string().optional() }).optional(),
  pages: z.array(z.object({ path: z.string().regex(/^\/([\w-]+\/)*$/), title: text(70), description: text(160), sections: z.array(Section).min(1).max(20) })).min(1).max(20),
});
export type SiteDefT = z.infer<typeof SiteDef>;
