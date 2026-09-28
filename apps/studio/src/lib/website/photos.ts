import 'server-only';
import { SHAPES, type PhotoAskT, type Shape } from './format';

// Finds a real stock photo for each of Claude's search phrases (Pexels). The key
// (PEXELS_API_KEY) stays on the server. Photos are served from Pexels' own image
// servers, cropped to the shape each spot needs, with sizes for phones and computers.

export type SiteImage = { src: string; srcset?: string; alt: string; width: number; height: number };
export type Credit = { name: string; url: string; source: 'Pexels' };
type Found = { id: string; original: string; photographer: string; photographerUrl: string };
type Fetch = typeof fetch;

export class PhotoSetupError extends Error {}

async function searchPexels(query: string, shape: Shape, f: Fetch): Promise<Found[]> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) throw new PhotoSetupError('Photos can’t be found yet: add PEXELS_API_KEY to the server settings (Vercel → Settings → Environment Variables).');
  const base = (process.env.PEXELS_API_URL ?? 'https://api.pexels.com').replace(/\/$/, '');
  const q = new URLSearchParams({ query, per_page: '12', orientation: SHAPES[shape].orientation });
  const r = await f(`${base}/v1/search?${q}`, { headers: { Authorization: key }, signal: AbortSignal.timeout(15_000) });
  if (r.status === 401 || r.status === 403) throw new PhotoSetupError('Pexels refused the key. Check PEXELS_API_KEY in the server settings.');
  if (r.status === 429) throw new PhotoSetupError('Pexels has had too many searches this hour. Try building again in a little while.');
  if (!r.ok) throw new Error(`Pexels search failed (${r.status})`);
  const d = (await r.json()) as { photos?: { id: number; photographer: string; photographer_url: string; src: { original: string } }[] };
  return (d.photos ?? []).map((p) => ({ id: String(p.id), original: p.src.original, photographer: p.photographer, photographerUrl: p.photographer_url }));
}

/** A Pexels photo cropped to a shape, with sizes for phones and computers. */
export function pexelsImage(found: Pick<Found, 'original'>, shape: Shape, alt: string): SiteImage {
  const s = SHAPES[shape];
  const url = (w: number) => `${found.original}?auto=compress&cs=tinysrgb&fm=webp&fit=crop&w=${w}&h=${Math.round(w / s.aspect)}`;
  const w = s.widths[s.widths.length > 2 ? s.widths.length - 2 : s.widths.length - 1];
  return { src: url(w), srcset: s.widths.map((x) => `${url(x)} ${x}w`).join(', '), alt, width: w, height: Math.round(w / s.aspect) };
}

/** Words that describe the scene, without small filler words, for a second, broader search. */
const broader = (q: string) => q.split(/\s+/).filter((w) => w.length > 3).slice(0, 3).join(' ');

/**
 * Finds a photo for every request (the same request twice gets the same photo; different
 * requests never share one). Returns the photos, their photographers, and plain-language notes
 * for anything that needed a broader search.
 */
export async function findPhotos(asks: PhotoAskT[], f: Fetch = fetch) {
  const key = (a: PhotoAskT) => `${a.shape}|${a.q.toLowerCase()}`;
  const unique = [...new Map(asks.map((a) => [key(a), a])).values()];
  const used = new Set<string>();
  const images = new Map<string, SiteImage>();
  const credits = new Map<string, Credit>();
  const notes: string[] = [];
  // A few searches at a time, in order, so earlier requests get first pick.
  const results = new Map<string, Found[]>();
  for (let i = 0; i < unique.length; i += 4) {
    const batch = unique.slice(i, i + 4);
    const found = await Promise.all(batch.map(async (a) => {
      let list = await searchPexels(a.q, a.shape, f);
      if (!list.length && broader(a.q) && broader(a.q) !== a.q) list = await searchPexels(broader(a.q), a.shape, f);
      return list;
    }));
    batch.forEach((a, j) => results.set(key(a), found[j]));
  }
  for (const a of unique) {
    const list = results.get(key(a)) ?? [];
    const pick = list.find((p) => !used.has(p.id)) ?? list[0];
    if (!pick) { notes.push(`No photo was found for “${a.q}”, so that spot shows a plain colour block. Ask Claude for different search words, or upload the business’s own photo.`); continue; }
    used.add(pick.id);
    images.set(key(a), pexelsImage(pick, a.shape, a.alt || a.q));
    credits.set(pick.photographerUrl, { name: pick.photographer.slice(0, 80), url: pick.photographerUrl, source: 'Pexels' });
  }
  return { image: (a: PhotoAskT) => images.get(key(a)) ?? null, credits: [...credits.values()], notes };
}
