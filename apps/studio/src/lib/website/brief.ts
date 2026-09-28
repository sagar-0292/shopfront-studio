// The brief the team pastes into claude.ai: the business, the chosen look, the rules that keep
// the site high quality, the answer format, and a finished sample site in the same look.
import { DESIGNS, type Direction } from '@/lib/designs';
import { label } from '@/lib/catalog';
import { SITE_TYPES } from '@/lib/catalog';
import { RECIPES, SECTION_REFERENCE } from './format';

/** What the team tells us about the business (saved on the project). */
export type BriefInput = {
  about: string;
  offer: string;
  audience: string;
  street: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  hours: string;
  instagram: string;
  reviews: string;
  notes: string;
};

export type BriefFacts = {
  name: string;
  businessKind: string;
  siteTypeOther: string;
  city: string;
  state: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  siteTypes: string[];
  languages: string[];
};

function materialSection(m: Material) {
  if (!m.logoColours.length && !m.photos.length && !m.documents.length) return '';
  let out = '## The business\'s own material\n';
  if (m.logoColours.length) out += `- Logo colours: ${m.logoColours.join(', ')} (the logo itself is added to the header automatically)\n`;
  if (m.photos.length) {
    out += '- Their own photos. Use each one where it fits best, instead of a stock photo, by writing {"$own": "name"}:\n';
    for (const p of m.photos) out += `  - "${p.name}": ${p.label || 'no description'}\n`;
  }
  if (m.documents.length) {
    out += '- Documents attached to this chat. Read them for facts, products, prices and the way the business speaks:\n';
    for (const d of m.documents) out += `  - ${d.filename}${d.label ? `: ${d.label}` : ''}\n`;
  }
  return out + '\n';
}

const line = (k: string, v: string | null | undefined) => (v && v.trim() ? `- ${k}: ${v.trim()}\n` : '');

/** The business's own material, uploaded on the website page. */
export type Material = {
  logoColours: string[];
  photos: { name: string; label: string }[];
  documents: { filename: string; label: string }[];
};

export function buildBrief(direction: Direction, facts: BriefFacts, input: BriefInput, example: unknown, material: Material): string {
  const d = DESIGNS[direction];
  const sells = facts.siteTypes.some((t) => ['online_store', 'whatsapp_catalogue', 'marketplace'].includes(t));
  const books = facts.siteTypes.includes('bookings');
  return `You are the lead designer and copywriter at an award-winning web studio in Mumbai. Write a complete, high-end
website for the business below. Your answer is read by a program, so reply with ONE JSON object and nothing else.

## The business
- Name: ${facts.name}
${line('Kind of business', facts.businessKind)}${line('What they do', input.about)}${line('What they sell or offer (with prices if known)', input.offer)}${line('Who their customers are', input.audience)}- City: ${[input.area, facts.city, facts.state].filter(Boolean).join(', ')}
${line('Address', [input.street, input.area, facts.city, input.pincode].filter(Boolean).join(', '))}${line('Opening hours', input.hours)}${line('Phone', facts.phone)}${line('WhatsApp', facts.whatsapp)}${line('Instagram', input.instagram)}${line('Real customer reviews (use only these, word for word)', input.reviews)}${line('Anything else', input.notes)}- Kind of website: ${facts.siteTypes.map((t) => (t === 'other' && facts.siteTypeOther ? facts.siteTypeOther : label(SITE_TYPES, t))).join(', ')}
- Language: ${facts.languages.includes('hi') ? 'English, with a few natural Hindi words where they feel right' : 'Indian English'}

${materialSection(material)}## The look: ${d.name}
${d.feel}
Fonts ${d.fonts}; colours, spacing and animation are built in.
${RECIPES[direction]}

## What makes it high-end (follow all of these)
1. Specific, not generic. Use real details from the business above: places, ingredients, materials, names, times.
   Never write filler like "quality you can trust", "one-stop shop", "we are passionate", "best in town", "welcome to our website".
2. Headlines are 2-6 words with one *highlighted* word or phrase. Ledes and texts are 1-2 short sentences.
3. Never invent facts: no made-up reviews, awards, years, numbers, staff names, prices or offers. If a number isn't given,
   don't use a "stats" section. Only use "quotes" if real reviews are given above. Prices only if given (or clearly marked
   as "from ₹" if the business gave a range).
4. The home page has 9-13 sections that alternate rhythm: big photo, words, grid, photo, list… Never two text-only
   sections in a row. Vary backdrops as the look suggests. End with contact and a closing "cta".
5. Photos are real stock photos found by your search words. Make each "q" a concrete scene a photographer would shoot,
   e.g. "hands pouring chai into small glasses at a street stall", not "tea". Prefer Indian settings. Never repeat a
   search. "alt" says plainly what the photo shows. Choose the shape for where it goes: hero "wide", rows "landscape",
   products and portraits "portrait" or "square".
6. Links: pages start and end with "/" (e.g. "/shop/"). Menu links to sections use "/#anchor". WhatsApp links use
   "https://wa.me/91XXXXXXXXXX" with the number above. Every "/#anchor" you link to must exist as an "anchor" on the home page.
7. Page "title" max 70 characters (the home title includes the business name and city), "description" max 160.
${sells ? '8. This site sells online: include "products" (every real product or range you were told about), a "products" section on the home page, and a page "/shop/" with a "shop" section. Add "/shop/" to the menu.\n' : ''}${books ? `${sells ? '9' : '8'}. This site takes bookings: include "bookings" (services, days, hours) and a "booking" section with "anchor": "book".\n` : ''}
## Answer format
{
  "tagline": "one line (max 160)",
  "description": "what the business is, for Google (40-300 characters)",
  "businessType": "one schema.org type, e.g. Bakery, Restaurant, JewelryStore, CafeOrCoffeeShop, LodgingBusiness, Store",
  "announcement": {"text": "optional slim bar at the top, e.g. a delivery offer", "href": "/shop/"},
  "nav": [{"label": "Shop", "href": "/shop/"}, ... up to 5],
  "pages": [{"path": "/", "title": "…", "description": "…", "sections": [ … ]}, {"path": "/shop/", …}],
  "products": [{"name", "description", "price" (rupees), "mrp"? (rupees, only if discounted), "category",
                "featured"? true, "badges"? ["Bestseller"], "variants"? [{"label": "500 g", "price": 450}], "photo": PHOTO}],
  "bookings": {"services": [{"name", "minutes", "price"?}], "days": ["mon", …], "open": "10:00", "close": "19:00",
               "slotMinutes": 30, "capacity": 1}
}
Leave out "products" or "bookings" if the site doesn't sell or take bookings.
${material.logoColours.length
    ? `Colours: set "palette" from the logo colours above, e.g. {"accent": "<the logo's strongest colour>", "accentInk": "<white or near-black, whichever is readable on it>"}. You may also set "bg", "surface", "ink", "muted" and "line" if the brand calls for it. Text must stay easy to read: dark text on light colours or light text on dark ones.`
    : 'Don\'t add colours ("palette"): the look has them.'}

## Sections you can use
${SECTION_REFERENCE}

## A finished example in the same look (a different business). Match this standard, not its words.
${JSON.stringify(example)}

Now write the JSON for ${facts.name}. Reply with the JSON object only.`;
}
