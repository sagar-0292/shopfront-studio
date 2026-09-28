// Stock photo search. Keys come only from the server's environment
// (PEXELS_API_KEY, UNSPLASH_ACCESS_KEY) and never reach a browser or a file.

export type Provider = 'pexels' | 'unsplash';

/** One search result, the same shape whichever library it came from. */
export type Candidate = {
  provider: Provider;
  id: string;
  width: number;
  height: number;
  alt: string;
  color: string | null;
  photographer: string;
  photographerUrl: string;
  pageUrl: string;
  /** Small preview for choosing. */
  thumb: string;
  /** Full-size image address. */
  full: string;
  /** Unsplash asks apps to call this when a photo is used. */
  downloadLocation?: string;
};

export type SearchOptions = { orientation?: 'landscape' | 'portrait' | 'square'; perPage?: number; page?: number };
type Fetch = typeof fetch;

export class PhotoError extends Error {}

function key(name: 'PEXELS_API_KEY' | 'UNSPLASH_ACCESS_KEY') {
  const v = process.env[name];
  if (!v) throw new PhotoError(`${name === 'PEXELS_API_KEY' ? 'Pexels' : 'Unsplash'} isn't connected yet: add ${name} to the server settings.`);
  return v;
}

async function getJson(f: Fetch, url: string, headers: Record<string, string>) {
  const r = await f(url, { headers });
  if (r.status === 401 || r.status === 403) throw new PhotoError('The photo library refused the key. Check it in the server settings.');
  if (r.status === 429) throw new PhotoError('Too many photo searches this hour. Try again later.');
  if (!r.ok) throw new PhotoError(`The photo library is not responding (${r.status}). Try again in a minute.`);
  return r.json();
}

type PexelsPhoto = { id: number; width: number; height: number; url: string; photographer: string; photographer_url: string; avg_color: string | null; alt: string; src: Record<string, string> };
const fromPexels = (p: PexelsPhoto): Candidate => ({
  provider: 'pexels', id: String(p.id), width: p.width, height: p.height, alt: p.alt ?? '', color: p.avg_color,
  photographer: p.photographer.replace(/\s+/g, ' ').trim(), photographerUrl: p.photographer_url, pageUrl: p.url, thumb: p.src.medium, full: p.src.original,
});

type UnsplashPhoto = { id: string; width: number; height: number; color: string | null; alt_description: string | null; description: string | null;
  user: { name: string; links: { html: string } }; links: { html: string; download_location: string }; urls: Record<string, string> };
const fromUnsplash = (p: UnsplashPhoto): Candidate => ({
  provider: 'unsplash', id: p.id, width: p.width, height: p.height, alt: p.alt_description ?? p.description ?? '', color: p.color,
  photographer: p.user.name.replace(/\s+/g, ' ').trim(), photographerUrl: `${p.user.links.html}?utm_source=shopfront&utm_medium=referral`,
  pageUrl: `${p.links.html}?utm_source=shopfront&utm_medium=referral`, thumb: p.urls.small, full: p.urls.raw, downloadLocation: p.links.download_location,
});

export async function search(provider: Provider, query: string, opts: SearchOptions = {}, f: Fetch = fetch): Promise<Candidate[]> {
  const perPage = Math.min(Math.max(opts.perPage ?? 15, 1), 30);
  const q = new URLSearchParams({ query, per_page: String(perPage), page: String(opts.page ?? 1) });
  if (provider === 'pexels') {
    if (opts.orientation) q.set('orientation', opts.orientation);
    const d = await getJson(f, `https://api.pexels.com/v1/search?${q}`, { Authorization: key('PEXELS_API_KEY') });
    return (d.photos as PexelsPhoto[]).map(fromPexels);
  }
  if (opts.orientation) q.set('orientation', opts.orientation === 'square' ? 'squarish' : opts.orientation);
  q.set('content_filter', 'high');
  const d = await getJson(f, `https://api.unsplash.com/search/photos?${q}`, { Authorization: `Client-ID ${key('UNSPLASH_ACCESS_KEY')}`, 'Accept-Version': 'v1' });
  return (d.results as UnsplashPhoto[]).map(fromUnsplash);
}

/** Looks up one photo by its id, e.g. to rebuild a site from its saved choices. */
export async function getPhoto(provider: Provider, id: string, f: Fetch = fetch): Promise<Candidate> {
  if (!/^[\w-]{1,40}$/.test(id)) throw new PhotoError('That photo id does not look right.');
  if (provider === 'pexels') return fromPexels(await getJson(f, `https://api.pexels.com/v1/photos/${id}`, { Authorization: key('PEXELS_API_KEY') }));
  return fromUnsplash(await getJson(f, `https://api.unsplash.com/photos/${id}`, { Authorization: `Client-ID ${key('UNSPLASH_ACCESS_KEY')}`, 'Accept-Version': 'v1' }));
}

/** Searches every library that is connected, alternating results. */
export async function searchAll(query: string, opts: SearchOptions = {}, f: Fetch = fetch): Promise<Candidate[]> {
  const providers = (['pexels', 'unsplash'] as const).filter((p) => process.env[p === 'pexels' ? 'PEXELS_API_KEY' : 'UNSPLASH_ACCESS_KEY']);
  if (!providers.length) throw new PhotoError('No photo library is connected: add PEXELS_API_KEY or UNSPLASH_ACCESS_KEY to the server settings.');
  const lists = await Promise.all(providers.map((p) => search(p, query, opts, f).catch(() => [] as Candidate[])));
  const out: Candidate[] = [];
  for (let i = 0; i < Math.max(...lists.map((l) => l.length)); i++) for (const l of lists) if (l[i]) out.push(l[i]);
  return out;
}
