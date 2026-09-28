// The shape of Claude's answer (a website written as JSON for the design kit), the
// reference Claude is given for each section, and how each look is best composed.
import { z } from 'zod';
import type { Direction } from '@/lib/designs';

/** Photo shapes Claude can ask for, and how each is cropped. */
export const SHAPES = {
  wide: { aspect: 1.6, widths: [640, 1000, 1400, 2000], orientation: 'landscape' },
  landscape: { aspect: 4 / 3, widths: [480, 800, 1200], orientation: 'landscape' },
  portrait: { aspect: 0.8, widths: [400, 700, 1000], orientation: 'portrait' },
  square: { aspect: 1, widths: [400, 800], orientation: 'square' },
} as const;
export type Shape = keyof typeof SHAPES;

export const PhotoAsk = z.object({
  $photo: z.object({
    q: z.string().trim().min(2).max(120),
    alt: z.string().trim().max(200),
    shape: z.enum(['wide', 'landscape', 'portrait', 'square']).default('landscape'),
  }),
});
export type PhotoAskT = z.infer<typeof PhotoAsk>['$photo'];

const rupees = z.number().nonnegative().max(10_000_000);
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Times look like 09:30 or 18:00');
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

/** Claude's answer. Pages are checked in full by the design kit itself when the site is built. */
export const Answer = z.object({
  tagline: z.string().trim().max(160).optional(),
  description: z.string().trim().min(20).max(300),
  businessType: z.string().regex(/^[A-Za-z]{3,40}$/, 'businessType is one schema.org word, like Bakery').default('LocalBusiness'),
  palette: z.record(z.string(), z.string()).optional(),
  // Art direction (design kit 2.0+); the kit checks each choice when the site is built.
  style: z.record(z.string(), z.string()).optional(),
  announcement: z.object({ text: z.string(), href: z.string().optional() }).optional(),
  nav: z.array(z.object({ label: z.string(), href: z.string() })).max(7).default([]),
  pages: z.array(z.record(z.string(), z.unknown())).min(1).max(12),
  products: z.array(z.object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(600).optional(),
    price: rupees,
    mrp: rupees.optional(),
    category: z.string().trim().min(1).max(60),
    featured: z.boolean().optional(),
    badges: z.array(z.string().trim().max(20)).max(2).optional(),
    variants: z.array(z.object({ label: z.string().trim().min(1).max(40), price: rupees })).max(8).optional(),
    photo: z.union([PhotoAsk, z.object({ $own: z.string().regex(/^[a-z0-9-]{1,60}$/) })]),
  })).max(60).default([]),
  bookings: z.object({
    services: z.array(z.object({ name: z.string().trim().min(1).max(80), minutes: z.number().int().min(15).max(480), price: rupees.optional() })).min(1).max(8),
    days: z.array(z.enum(DAYS)).min(1),
    open: hhmm,
    close: hhmm,
    slotMinutes: z.number().int().min(15).max(240).default(30),
    capacity: z.number().int().min(1).max(50).default(1),
  }).optional(),
});
export type AnswerT = z.infer<typeof Answer>;

/** Every section the design kit offers, as Claude sees it. Kept in step with the kit by a test. */
export const SECTION_REFERENCE = `
Every section is an object with "type" plus the fields below. "?" means optional. Text in headlines and titles can
mark ONE highlighted word or phrase with *asterisks*. Every section may also have:
  "anchor": "short-name" (so the menu can link to "/#short-name")
  "backdrop": "sky" | "dusk" | "glow" | "grid" | "dots" | "accent" | "pop" | "dark"
PHOTO means {"$photo": {"q": "search words", "alt": "what the photo shows", "shape": "wide|landscape|portrait|square"}},
or {"$own": "name"} for one of the business's own photos listed above.
CTA means {"label": "Order now", "href": "/shop/" or "#book" or "https://wa.me/91XXXXXXXXXX"}.

hero        variant: "split" | "fullbleed" | "typographic" | "collage" | "wordmark"; headline; eyebrow?; lede?;
            ctas? (max 2 CTA); media? PHOTO (not for typographic/collage); collage? [3 PHOTO] (collage only);
            sticker? (max 40 chars, e.g. "Since 1978")
marquee     items [2-10 short words]; outline? true|false; speed? 20-120; reverse? true|false
statement   text (max 400, one strong idea); eyebrow?; meta? [up to 4 short facts]; tone? "default"|"invert"|"surface"|"pop"
products    title; eyebrow?; featured? true|false; category? (a product category name); limit? 1-24; sort? "featured"|"price-asc"|"newest";
            link? {"label","href"}   (shows products from "products" below)
categories  title; eyebrow?; items [2-8 {"name", "href" e.g. "/shop/?cat=gifts", "media": PHOTO}]
story       title?; eyebrow?; panels [2-6 {"title", "text" (max 300), "media"? PHOTO}]   (sideways-scrolling panels)
features    title; eyebrow?; items [2-6 {"title" (max 60), "text" (max 240)}]; tone?
gallery     title; eyebrow?; items [3-12 {"media": PHOTO, "caption"?, "ratio"? "square"|"portrait"|"landscape"}]
menu        title; eyebrow?; note?; categories [1-10 {"name", "items": [{"name", "description"?, "price" (rupees), "diet"? "veg"|"nonveg"|"egg"}]}]
booking     title; eyebrow?; text?; service? (a service name from "bookings"); days? 7-30   (needs "bookings" below)
quotes      ONLY if the business gave you real reviews: title; items [{"quote", "name", "source" e.g. "Google review"}]
stats       items [2-4 {"value" (max 12 chars), "label"}]; tone? "default"|"invert"   (only real numbers you were given)
faq         title; eyebrow?; items [1-12 {"q", "a"}]
cta         headline; eyebrow?; ctas [1-2 CTA]; tone? "invert"|"pop"|"accent"|"default"
contact     title; eyebrow?; media? PHOTO   (address, phone, WhatsApp, hours and map are filled in automatically)
shop        title; eyebrow?   (a full shop page with search and filters; use on its own page, e.g. "/shop/")
rows        title?; eyebrow?; items [1-6 {"eyebrow"?, "title", "text" (max 400), "media": PHOTO, "link"? {"label","href"}}]
bento       title?; eyebrow?; tiles [3-8, each one of:
              {"kind":"photo","media": PHOTO,"caption"?,"size"? "normal"|"wide"|"tall"|"big"}
              {"kind":"text","title","text"?,"size"?,"tone"? "surface"|"accent"|"invert"|"pop"}
              {"kind":"stat","value","label","size"?,"tone"?}]
wishlist    title?   (a saved-items page; use on its own page, e.g. "/wishlist/")
scrolly     title?; eyebrow?; steps [2-6 {"eyebrow"?, "title", "text", "media": PHOTO}]   (photo stays pinned while steps scroll)
index       title?; eyebrow?; items [2-10 {"title" (max 60), "meta"? e.g. a price, "href"?, "media": PHOTO}]   (big list; photo appears on hover)
reel        title?; eyebrow?; items [3-12 {"media": PHOTO, "title", "text"?}]   (photos you swipe sideways)
photostrip  items [4-12 PHOTO]; speed? 20-80; reverse? true|false   (photos gliding across the page)
pinned      title; eyebrow?; text?; cta? CTA; tone?; items [2-8 {"title", "text", "media"? PHOTO}]   (heading stays while cards scroll)
`.trim();

/** How Claude art-directs one site, given the kit's type pairings (design kit 2.0+). */
export const STYLE_REFERENCE = (pairings: string) => `
Every business deserves its own identity, so choose a "style" that fits THIS business, its customers and its city.
Don't settle for the look's default fonts unless they are truly the best fit, and avoid what every other site does.
"style": {
  "type": one type pairing id from this list (display font + text font: when to use it):
${pairings}
  "scale": "calm" | "bold" | "huge"            headline size: huge for confident, loud brands; calm for quiet, premium ones
  "headlineCase": "auto" | "upper" | "normal"   capitals or not ("auto" follows the pairing)
  "shape": "sharp" | "soft" | "round"           corners of photos, cards and buttons
  "space": "airy" | "balanced" | "compact"      room between sections: airy feels luxurious, compact feels energetic
  "buttons": "solid" | "outline" | "pill" | "underline"
  "photos": "natural" | "warm" | "cool" | "soft" | "vivid" | "mono" | "duotone"
            colour grading that makes every stock photo look like one shoot ("duotone" tints photos in the accent
            colour: dramatic, best for poster-like brands; "mono" is black and white: editorial, architectural)
}
Make the choices agree with each other and with the palette: e.g. a heritage jeweller → "vogue", calm, sharp, airy,
underline, warm; a street-food brand → "anton", huge, sharp, compact, solid, vivid.`.trim();

/** How each look is composed at its best: the order of sections and what makes it feel high-end. */
export const RECIPES: Record<Direction, string> = {
  editorial: `Like a luxury fashion magazine. Quiet confidence, lots of air, few words per line.
Home, in this spirit: hero (split, a portrait photo) → marquee (3-5 craft words) → statement (one line of philosophy) →
categories or products → rows (3 "how it's made" rows) → stats (only real numbers) → booking or cta → faq → contact → cta.
Headlines: short, lowercase-feeling, elegant ("Heirlooms, *made slowly*"). Use backdrops sparingly: "dots" or "sky" once, "dark" once.`,
  bold: `Like a festival poster: loud, happy, generous. Big claims made with warmth.
Home: hero (collage or split) → marquee → products (featured) → bento (photos + a stat + a punchy text tile) → categories →
rows (festive or gifting ideas) → booking or cta → faq → contact → cta (tone "pop").
Headlines: punchy and local ("Life's sweeter *in Dadar*"). Backdrops: one "pop" block, one "grid", one "dark".`,
  cinematic: `Like a film title sequence: dark, dramatic, sensory. Short sentences, strong verbs.
Home: hero (fullbleed, a dramatic photo) → marquee (outline true) → statement (backdrop "glow") → bento → menu or products
(backdrop "dark" makes a cream "paper" block) → rows (3 sensory moments) → booking → faq → contact → cta (tone "accent").
Headlines: uppercase-friendly, 2-4 words ("Cooked over *fire*").`,
  crafted: `Like a handmade label: warm, honest, neighbourly. Talk about hands, time, ingredients, people.
Home: hero (split) → marquee → products → rows (backdrop "dark", the craft story) → bento (a day in the life) →
features (backdrop "pop", 3 honest promises) → booking → faq → contact → cta.
Headlines: friendly, with an italic-feeling highlight ("Bread worth *waking up* for").`,
  poster: `Like a gig poster / DIKO: the business name edge to edge, flat bold colour, energy.
Home: hero (wordmark, a real action photo, sticker) → marquee → photostrip (6-8 photos) → scrolly (3-4 steps of how it's made,
backdrop "grid") → index (the menu or best sellers, backdrop "pop") → products → pinned (why us, backdrop "accent") →
reel (locations or favourites) → faq → contact → cta (tone "pop").
Headlines: SHORT, shouty, 2-5 words ("Cutting chai, *loud and proud*").`,
  quiet: `Like a gallery or a quiet luxury hotel: calm, spacious, sensory, very few words.
Home: hero (wordmark, a serene wide photo) → statement (backdrop "sky", one line) → reel (the place, 5 photos) →
scrolly (a day there, backdrop "dusk") → photostrip → index (rooms or collections) → pinned (what's included, backdrop "dark") →
booking (backdrop "sky") → faq → contact → cta (tone "invert"). A second page with rows is ideal (rooms, treatments, collections).
Headlines: soft, with an italic highlight ("Slow days by the *Arabian Sea*").`,
  block: `Like a sticker sheet / DIKO + Mode: every section its own flat colour panel, playful, stretchy type.
Home: hero (wordmark, a colourful photo, sticker) → marquee → products → rows (3 items; photos are cut into shapes
automatically) → photostrip → index (the counter / menu) → reel → stats (only real numbers) → pinned → faq → contact → cta (tone "pop").
Headlines: playful, 2-5 words ("Cold, sweet and *very* Bombay"). Don't set backdrops: the colour panels do that job.`,
};
