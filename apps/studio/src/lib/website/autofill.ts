// "Fill in the details for me": Claude reads the business's current website and documents
// and answers with the brief's fields, so the team doesn't type everything again.
import { z } from 'zod';
import { UserError } from '@/lib/action';
import { INDIAN_STATES } from '@/lib/catalog';
import type { BriefInput } from './brief';
import type { PageText } from './read-site';

/** The brief fields Claude can fill, with the same limits as the form. */
const FIELDS = {
  about: { label: 'What the business does', max: 2000, ask: 'what the business does and what makes it special, in 2-4 sentences, in their own words where possible (history, speciality, what they are known for)' },
  offer: { label: 'What they sell', max: 4000, ask: 'what they sell or offer, one per line, with the price exactly as written ("Kaju katli – ₹1,100 per kg"); keep every item and price you find, group by category if there are many' },
  audience: { label: 'Customers', max: 600, ask: 'who their customers are, if it is clear (areas served, kinds of customers)' },
  street: { label: 'Street address', max: 120, ask: 'building and street, e.g. "Shop 4, 12 Ranade Road"' },
  area: { label: 'Area', max: 80, ask: 'the neighbourhood, e.g. "Dadar West"' },
  city: { label: 'City', max: 60, ask: 'the city' },
  state: { label: 'State', max: 60, ask: 'the Indian state, spelt out in full (e.g. "Maharashtra")' },
  pincode: { label: 'PIN code', max: 6, ask: 'the 6-digit PIN code' },
  hours: { label: 'Opening hours', max: 500, ask: 'opening hours, one line per group of days, like "Mon – Sat 10am – 8:30pm"' },
  instagram: { label: 'Instagram', max: 200, ask: 'their Instagram handle, like "@mithaimarket"' },
  reviews: { label: 'Reviews', max: 4000, ask: 'real customer reviews shown on the website or in the documents, word for word, each with the person\'s name and where it was posted, one per line: “quote” – Name, Google review. Never write or improve a review' },
  notes: { label: 'Other notes', max: 4000, ask: 'other useful facts: year founded, awards, delivery areas, offers, how they order or book, the way they speak about themselves, words and phrases they use' },
} as const satisfies Record<Exclude<keyof BriefInput, 'website'>, { label: string; max: number; ask: string }>;
type Field = keyof typeof FIELDS;
const FIELD_NAMES = Object.keys(FIELDS) as Field[];

export const FillIn = z.object(Object.fromEntries(FIELD_NAMES.map((k) => [k, z.string().optional()])) as Record<Field, z.ZodOptional<z.ZodString>>)
  .extend({ phone: z.string().optional(), whatsapp: z.string().optional(), email: z.string().optional() });
export type FillInT = z.infer<typeof FillIn>;

const MARK = 'FILL-IN-THE-BRIEF';

/** The request to Claude. With `pages`, the website's text is included; without, Claude is asked to visit the address itself (claude.ai can). */
export function fillInPrompt(o: { name: string; url: string | null; pages: PageText[] | null; documents: string[] }): string {
  const sources = [
    o.url && (o.pages ? `their current website (${o.url}), whose pages are below` : `their current website: ${o.url}. Visit it and its About, Menu or Products, and Contact pages`),
    o.documents.length && `the documents attached to this message (${o.documents.join(', ')})`,
  ].filter(Boolean).join(', and ');
  return `<!-- ${MARK} -->
You help a web studio in Mumbai prepare a new website for "${o.name}". Read ${sources}, and fill in the details
below from what you find. Your answer is read by a program: reply with ONE JSON object and nothing else.

Rules:
- Only facts that are really there. Leave a field out when you didn't find it. Never guess or invent anything.
- Keep prices, names, addresses and phone numbers exactly as written.
- Plain text in each field (no markdown). Use \\n between lines.

Fields:
${FIELD_NAMES.map((k) => `  "${k}": ${FIELDS[k].ask}`).join('\n')}
  "phone", "whatsapp", "email": if shown

${o.pages ? o.pages.map((p) => `--- Page: ${p.url}${p.title ? ` (${p.title})` : ''}\n${p.text}`).join('\n\n') : ''}

Reply with the JSON object only, e.g. {"about": "…", "offer": "…\\n…", "city": "Mumbai"}.`;
}

/** Is this request (as received by the local Claude stand-in or in a test) a fill-in request? */
export const isFillInPrompt = (text: string) => text.includes(MARK);

/** Pulls the JSON out of Claude's reply. */
export function parseFillIn(text: string): FillInT {
  const t = text.trim();
  if (!t) throw new UserError('Paste Claude’s answer first.');
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(t)?.[1];
  const body = fenced ?? t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1);
  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    throw new UserError('That doesn’t look like Claude’s complete answer. Copy Claude’s whole reply and paste it again.');
  }
  // Numbers (like a PIN code) are accepted as text; anything else unexpected is dropped.
  const clean = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? Object.fromEntries(Object.entries(raw).filter(([, v]) => typeof v === 'string' || typeof v === 'number').map(([k, v]) => [k, String(v)]))
    : {};
  const r = FillIn.safeParse(clean);
  if (!r.success) throw new UserError('Claude’s answer wasn’t in the expected format. Please try again.');
  return r.data;
}

/**
 * Adds what Claude found to the brief. Only empty fields are filled, so nothing the team typed is
 * lost. Returns the new brief and the labels of the fields that were filled.
 */
export function mergeFillIn(brief: BriefInput, fill: FillInT): { brief: BriefInput; filled: string[] } {
  const out = { ...brief };
  const filled: string[] = [];
  for (const k of FIELD_NAMES) {
    let v = (fill[k] ?? '').replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').trim();
    if (!v || out[k].trim()) continue;
    if (k === 'pincode') { v = v.replace(/\s/g, ''); if (!/^\d{6}$/.test(v)) continue; }
    if (k === 'state') { const s = INDIAN_STATES.find((x) => x.toLowerCase() === v.toLowerCase()); if (!s) continue; v = s; }
    if (k === 'instagram') { const h = /instagram\.com\/([\w.]+)/i.exec(v)?.[1] ?? v.replace(/^@/, ''); if (!/^[\w.]{1,30}$/.test(h)) continue; v = `@${h}`; }
    out[k] = v.slice(0, FIELDS[k].max);
    filled.push(FIELDS[k].label);
  }
  return { brief: out, filled };
}
