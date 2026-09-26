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
export const Media = z.union([
  z.object({ image: Image }),
  z.object({ art: z.string().max(60) }),
  z.object({ object: z.enum(OBJECTS), color: hex.optional(), material: z.enum(['metal', 'glass', 'matte', 'ceramic']).optional(), label: text(160), art: z.string().max(60).optional() }),
  z.object({ model: imagePath.refine((s) => /\.glb(\?|$)/.test(s), 'Models must be .glb files'), label: text(160), art: z.string().max(60).optional() }),
  z.object({ video: z.object({ src: imagePath, poster: imagePath.optional() }), art: z.string().max(60).optional() }),
]);
export type MediaT = z.infer<typeof Media>;

const Link = z.object({ label: text(40), href });
const Cta = z.object({ label: text(40), href, style: z.enum(['solid', 'plain']).default('solid') });

const S = {
  hero: z.object({
    type: z.literal('hero'), variant: z.enum(['split', 'fullbleed', 'typographic', 'collage']),
    eyebrow: text(80).optional(), headline: text(140), lede: text(320).optional(), ctas: z.array(Cta).max(2).default([]),
    media: Media.optional(), collage: z.array(Media).max(3).optional(), sticker: text(40).optional(),
    background: z.enum(['none', 'aurora', 'particles', 'waves']).default('none'),
  }),
  marquee: z.object({ type: z.literal('marquee'), items: z.array(text(60)).min(2).max(10), outline: z.boolean().default(false), speed: z.number().min(10).max(200).default(60), reverse: z.boolean().default(false) }),
  statement: z.object({ type: z.literal('statement'), eyebrow: text(80).optional(), text: text(400), meta: z.array(text(80)).max(4).default([]), tone: z.enum(['default', 'invert', 'surface', 'pop']).default('default') }),
  products: z.object({ type: z.literal('products'), eyebrow: text(80).optional(), title: text(120), link: Link.optional(), featured: z.boolean().default(false), category: z.string().max(60).optional(), limit: z.number().int().min(1).max(24).default(8), sort: z.enum(['featured', 'price-asc', 'price-desc', 'newest', 'discount']).default('featured'), tone: z.enum(['default', 'invert', 'surface']).default('default') }),
  categories: z.object({ type: z.literal('categories'), eyebrow: text(80).optional(), title: text(120), items: z.array(z.object({ name: text(40), href, media: Media })).min(2).max(8) }),
  story: z.object({ type: z.literal('story'), eyebrow: text(80).optional(), title: text(120).optional(), panels: z.array(z.object({ title: text(80), text: text(300), media: Media.optional() })).min(2).max(6) }),
  features: z.object({ type: z.literal('features'), eyebrow: text(80).optional(), title: text(120), items: z.array(z.object({ title: text(60), text: text(240) })).min(2).max(6), tone: z.enum(['default', 'invert', 'surface']).default('default') }),
  gallery: z.object({ type: z.literal('gallery'), eyebrow: text(80).optional(), title: text(120), items: z.array(z.object({ media: Media, caption: text(120).optional(), ratio: z.enum(['square', 'portrait', 'landscape']).default('portrait') })).min(3).max(12) }),
  menu: z.object({ type: z.literal('menu'), eyebrow: text(80).optional(), title: text(120), note: text(200).optional(),
    categories: z.array(z.object({ name: text(60), items: z.array(z.object({ name: text(80), description: text(200).optional(), price_paise: z.number().int().nonnegative(), diet: z.enum(['veg', 'nonveg', 'egg']).optional() })).min(1).max(30) })).min(1).max(10), tone: z.enum(['default', 'invert', 'surface']).default('default') }),
  booking: z.object({ type: z.literal('booking'), eyebrow: text(80).optional(), title: text(120), text: text(400).optional(), service: z.string().max(60).optional(), days: z.number().int().min(1).max(60).default(10), tone: z.enum(['default', 'invert', 'surface']).default('surface') }),
  quotes: z.object({ type: z.literal('quotes'), eyebrow: text(80).optional(), title: text(120),
    // Only real reviews: every quote must say who wrote it and where it came from.
    items: z.array(z.object({ quote: text(400), name: text(60), source: text(80) })).min(1).max(6) }),
  stats: z.object({ type: z.literal('stats'), items: z.array(z.object({ value: text(12), label: text(60) })).min(2).max(4), tone: z.enum(['default', 'invert']).default('default') }),
  faq: z.object({ type: z.literal('faq'), eyebrow: text(80).optional(), title: text(120), items: z.array(z.object({ q: text(160), a: text(800) })).min(1).max(12) }),
  cta: z.object({ type: z.literal('cta'), eyebrow: text(80).optional(), headline: text(120), ctas: z.array(Cta).min(1).max(2), tone: z.enum(['default', 'invert', 'pop', 'accent']).default('invert'), background: z.enum(['none', 'aurora', 'particles', 'waves']).default('none') }),
  contact: z.object({ type: z.literal('contact'), eyebrow: text(80).optional(), title: text(120), media: Media.optional() }),
  shop: z.object({ type: z.literal('shop'), eyebrow: text(80).optional(), title: text(120) }),
  wishlist: z.object({ type: z.literal('wishlist'), title: text(120).default('Your wishlist'), empty: text(160).default('Nothing saved yet. Tap ♡ on anything you like.') }),
};
export const Section = z.discriminatedUnion('type', [S.hero, S.marquee, S.statement, S.products, S.categories, S.story, S.features, S.gallery, S.menu, S.booking, S.quotes, S.stats, S.faq, S.cta, S.contact, S.shop, S.wishlist]);
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
  palette: z.object({ bg: hex, surface: hex, ink: hex, muted: hex, line: hex, accent: hex, accentInk: hex }).partial().optional(),
  nav: z.array(Link).max(7).default([]),
  commerce: z.object({ source: z.record(z.string(), z.unknown()), delivery: z.record(z.string(), z.unknown()).optional(), payments: z.record(z.string(), z.unknown()).optional(), privacyUrl: z.string().optional() }).optional(),
  pages: z.array(z.object({ path: z.string().regex(/^\/([\w-]+\/)*$/), title: text(70), description: text(160), sections: z.array(Section).min(1).max(20) })).min(1).max(20),
});
export type SiteDefT = z.infer<typeof SiteDef>;
