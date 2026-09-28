import 'server-only';
import { UserError } from '@/lib/action';
import { slugify } from '@/lib/slug';
import { Answer, type AnswerT, type PhotoAskT } from './format';
import { findPhotos, PhotoSetupError, type Credit, type SiteImage } from './photos';
import type { BriefFacts, BriefInput } from './brief';
import type { Direction } from '@/lib/designs';

// Turns Claude's answer into a website: the page description the design kit renders
// and the product catalogue. Business facts (phone, address, hours) always come from
// the project, never from Claude. Everything is checked before it is saved.

/** The business's own uploaded pictures (see site_files). */
export type OwnImage = { name: string; label: string; kind: 'logo' | 'photo'; width: number; height: number; hasSmall: boolean };

/** What is saved on the project and rendered into pages. */
export type Website = { def: Record<string, unknown>; catalog: Record<string, unknown> | null; notes: string[] };

/** Pulls the JSON out of Claude's reply (with or without ``` fences or a sentence around it). */
export function parseAnswer(text: string): AnswerT {
  const t = text.trim();
  if (!t) throw new UserError('Paste Claude’s answer first.');
  if (t.length > 400_000) throw new UserError('That answer is too long. Ask Claude for a shorter website (fewer pages or sections).');
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(t)?.[1];
  const body = fenced ?? t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1);
  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    throw new UserError('That doesn’t look like Claude’s complete answer. If Claude stopped part-way, type “continue” in Claude, then paste both parts together here.');
  }
  const r = Answer.safeParse(raw);
  if (!r.success) {
    const i = r.error.issues[0];
    throw new UserError(`Claude’s answer has a problem at ${i.path.join(' → ') || 'the top'}: ${i.message}. Ask Claude: “Please fix: ${i.path.join('.')} – ${i.message}”, then paste the new answer.`);
  }
  return r.data;
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const photoOf = (v: unknown): PhotoAskT | null => (isObj(v) && isObj(v.$photo) && typeof v.$photo.q === 'string'
  ? { q: v.$photo.q, alt: String(v.$photo.alt ?? v.$photo.q).slice(0, 200), shape: (['wide', 'landscape', 'portrait', 'square'].includes(String(v.$photo.shape)) ? v.$photo.shape : 'landscape') as PhotoAskT['shape'] }
  : null);
const ownOf = (v: unknown) => (isObj(v) && typeof v.$own === 'string' ? v.$own : null);

/** Walks a JSON tree, replacing values. */
function mapTree(v: unknown, fn: (v: unknown) => unknown | undefined): unknown {
  const r = fn(v);
  if (r !== undefined) return r;
  if (Array.isArray(v)) return v.map((x) => mapTree(x, fn));
  if (isObj(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, mapTree(x, fn)]));
  return v;
}

/** "Mon – Sat: 10am – 8:30pm" → {days, open, close}. Lines that can't be read are reported. */
export function parseHours(text: string) {
  const hours: { days: string; open: string; close: string }[] = [];
  const bad: string[] = [];
  const t24 = (h: string, m: string | undefined, ap: string | undefined) => {
    let hh = Number(h);
    if (ap?.toLowerCase() === 'pm' && hh < 12) hh += 12;
    if (ap?.toLowerCase() === 'am' && hh === 12) hh = 0;
    return hh > 23 ? null : `${String(hh).padStart(2, '0')}:${m ?? '00'}`;
  };
  for (const raw of text.split(/\n|;/).map((l) => l.trim()).filter(Boolean)) {
    const m = /^(.+?)[\s,:]+(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?\s*(?:-|–|—|to)\s*(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?$/i.exec(raw);
    const open = m && t24(m[2], m[3], m[4] ?? m[7]);
    const close = m && t24(m[5], m[6], m[7]);
    if (m && open && close && m[1].length <= 40) hours.push({ days: m[1].replace(/[\s:,]+$/, ''), open, close });
    else bad.push(raw);
  }
  return { hours: hours.slice(0, 7), bad };
}

export type BuildInput = {
  answer: AnswerT;
  direction: Direction;
  site: { id: string; name: string };
  facts: BriefFacts;
  input: BriefInput;
  own: OwnImage[];
  payments: Record<string, unknown> | null;
  /** The project's design kit takes art direction ("style", from 2.0). */
  styled?: boolean;
  fetch?: typeof fetch;
};

export async function buildWebsite(b: BuildInput): Promise<Website> {
  const { answer, facts, input } = b;
  const notes: string[] = [];
  const own = new Map(b.own.filter((o) => o.kind === 'photo').map((o) => [o.name, o]));
  const ownImage = (name: string): SiteImage | null => {
    const o = own.get(name);
    if (!o) return null;
    return {
      src: `/img/own/${o.name}.webp`, alt: o.label || o.name.replace(/-/g, ' '), width: o.width, height: o.height,
      ...(o.hasSmall && o.width > 800 ? { srcset: `/img/own/${o.name}-800.webp 800w, /img/own/${o.name}.webp ${o.width}w` } : {}),
    };
  };

  // Media written as {"image": {"$photo": …}} is treated the same as {"$photo": …}.
  const normalise = (v: unknown) => mapTree(v, (x) => (isObj(x) && Object.keys(x).length === 1 && (photoOf(x.image) || ownOf(x.image)) ? x.image : undefined));
  const pages = normalise(answer.pages) as Record<string, unknown>[];
  const products = answer.products.map((p) => ({ ...p, photo: normalise(p.photo) }));

  // Find every stock photo in one go.
  const asks: PhotoAskT[] = [];
  mapTree([pages, products.map((p) => p.photo)], (x) => { const a = photoOf(x); if (a) asks.push(a); return a ? x : undefined; });
  let found: Awaited<ReturnType<typeof findPhotos>> = { image: () => null, credits: [] as Credit[], notes: [] };
  if (asks.length) {
    try {
      found = await findPhotos(asks, b.fetch);
    } catch (e) {
      if (e instanceof PhotoSetupError) throw new UserError(e.message);
      throw new UserError('The photo library didn’t answer. Please try building again in a minute.');
    }
    notes.push(...found.notes);
  }
  const fallbacks: SiteImage[] = [];
  const resolve = (x: unknown): SiteImage | null => {
    const a = photoOf(x);
    if (a) { const img = found.image(a); if (img) fallbacks.push(img); return img; }
    const o = ownOf(x);
    if (o) {
      const img = ownImage(o);
      if (!img) notes.push(`Claude used a photo called “${o}”, but no uploaded photo has that name. A stock photo was used instead.`);
      return img;
    }
    return null;
  };
  // Pages: photos become {image: …}. A spot whose photo couldn't be found borrows one found elsewhere.
  const resolvedPages = mapTree(pages, (x) => {
    if (!photoOf(x) && !ownOf(x)) return undefined;
    const img = resolve(x) ?? fallbacks[0];
    return img ? { image: img } : undefined;
  }) as Record<string, unknown>[];
  // Restaurant menus: Claude writes prices in rupees; the kit counts paise.
  const withMenus = mapTree(resolvedPages, (x) => {
    if (!isObj(x) || x.type !== 'menu' || !Array.isArray(x.categories)) return undefined;
    return { ...x, categories: x.categories.map((c) => (isObj(c) && Array.isArray(c.items) ? { ...c, items: c.items.map((it) => (isObj(it) ? (({ price, ...rest }) => ({ ...rest, price_paise: Math.round(Number(price ?? rest.price_paise ?? 0) * 100) }))(it) : it)) } : c)) };
  });

  // Catalogue (products and bookings) in the commerce kit's format.
  const today = new Date().toISOString().slice(0, 10);
  const taken = new Set<string>();
  const uniq = (s: string) => { let x = s || 'item'; for (let i = 2; taken.has(x); i++) x = `${s}-${i}`; taken.add(x); return x; };
  const catalogProducts = products.map((p, i) => {
    const slug = uniq(slugify(p.name));
    const image = resolve(p.photo) ?? fallbacks[0];
    return {
      id: `p${i + 1}`, slug, name: p.name, description: p.description ?? '', price_paise: Math.round(p.price * 100),
      ...(p.mrp && p.mrp > p.price ? { mrp_paise: Math.round(p.mrp * 100) } : {}),
      ...(image ? { image } : {}),
      category: { slug: slugify(p.category) || 'other', name: p.category }, stock: 50, status: 'active', created_at: today,
      ...(p.featured ? { featured: true } : {}), ...(p.badges?.length ? { badges: p.badges } : {}),
      ...(p.variants?.length ? { variants: p.variants.map((v, j) => ({ id: `${slug}-${j + 1}`, label: v.label, price_paise: Math.round(v.price * 100), stock: 25 })) } : {}),
    };
  });
  const bk = answer.bookings;
  const bookings = bk ? {
    services: bk.services.map((sv) => ({ id: uniq(slugify(sv.name)), name: sv.name, duration_minutes: sv.minutes, ...(sv.price != null ? { price_paise: Math.round(sv.price * 100) } : {}) })),
    hours: Object.fromEntries(bk.days.map((d) => [d, [[bk.open, bk.close]]])), slot_minutes: bk.slotMinutes, capacity: bk.capacity, blocked_dates: [], booked: {},
  } : null;
  const usesCommerce = catalogProducts.length > 0 || !!bookings
    || JSON.stringify(withMenus).match(/"type":"(products|shop|booking|wishlist)"/) !== null;
  const catalog = usesCommerce ? { products: catalogProducts, ...(bookings ? { bookings } : {}) } : null;

  // Business facts from the project.
  const { hours, bad } = parseHours(input.hours);
  if (bad.length) notes.push(`These opening hours couldn’t be read, so they were left out: ${bad.join('; ')}. Write them like “Mon – Sat 10am – 8pm”.`);
  const address = input.street && /^\d{6}$/.test(input.pincode) && facts.city && facts.state
    ? { street: input.street.slice(0, 120), ...(input.area ? { area: input.area.slice(0, 80) } : {}), city: facts.city.slice(0, 60), state: facts.state.slice(0, 60), pincode: input.pincode }
    : undefined;
  if (!address) notes.push('No full address yet (street and a 6-digit PIN code), so the map link and address are left out.');
  const instagram = input.instagram.trim()
    ? (/^https:\/\//.test(input.instagram.trim()) ? input.instagram.trim() : `https://www.instagram.com/${input.instagram.trim().replace(/^@/, '')}`)
    : null;
  if (answer.style && !b.styled) notes.push('Claude chose fonts and a style for this site, but this project’s design kit is older than 2.0, so the look’s own fonts were used. Move the project to the newest design kit (below) and build again to use them.');
  const logo = b.own.find((o) => o.kind === 'logo');
  const payments = b.payments ? Object.fromEntries(Object.entries(b.payments).filter(([k]) => k !== 'online')) : { whatsapp: !!facts.whatsapp };
  if (b.payments && 'online' in b.payments) notes.push('Card and net-banking payments need the online checkout, which comes with hosting on Shopfront. The downloaded site takes WhatsApp, UPI and cash-on-delivery orders.');

  const def: Record<string, unknown> = {
    direction: b.direction,
    site: {
      id: b.site.id, name: b.site.name.slice(0, 80), ...(answer.tagline ? { tagline: answer.tagline } : {}), description: answer.description,
      ...(facts.phone ? { phone: facts.phone } : {}), ...(facts.whatsapp ? { whatsapp: facts.whatsapp } : {}), ...(facts.email ? { email: facts.email } : {}),
      ...(address ? { address } : {}), ...(hours.length ? { hours } : {}), ...(instagram ? { social: { instagram } } : {}),
      businessType: answer.businessType,
      ...(logo ? { logo: { src: '/img/own/logo.webp', alt: `${b.site.name} logo`, width: logo.width, height: logo.height } } : {}),
    },
    credits: found.credits,
    ...(answer.palette ? { palette: answer.palette } : {}),
    ...(answer.style && b.styled ? { style: answer.style } : {}),
    ...(answer.announcement ? { announcement: answer.announcement } : {}),
    nav: answer.nav,
    ...(usesCommerce ? { commerce: { source: { type: 'json', url: '/data/catalog.json' }, payments } } : {}),
    pages: withMenus,
  };
  return { def, catalog, notes };
}
