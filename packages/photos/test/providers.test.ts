import { describe, it, expect, beforeEach } from 'vitest';
import { search, searchAll, getPhoto, PhotoError } from '../src/providers.ts';

const pexelsPhoto = { id: 1, width: 4000, height: 3000, url: 'https://www.pexels.com/photo/1/', photographer: 'Asha', photographer_url: 'https://www.pexels.com/@asha',
  avg_color: '#aa8866', alt: 'Kaju katli on a plate', src: { original: 'https://images.pexels.com/photos/1/a.jpeg', medium: 'https://images.pexels.com/photos/1/m.jpeg' } };
const unsplashPhoto = { id: 'abc', width: 3000, height: 2000, color: '#112233', alt_description: 'bakery counter', description: null,
  user: { name: 'Ravi', links: { html: 'https://unsplash.com/@ravi' } }, links: { html: 'https://unsplash.com/photos/abc', download_location: 'https://api.unsplash.com/photos/abc/download?ixid=1' },
  urls: { raw: 'https://images.unsplash.com/photo-abc?ixid=1', small: 'https://images.unsplash.com/photo-abc?w=400' } };

function fakeFetch(routes: Record<string, unknown>, seen: { url: string; headers: Record<string, string> }[] = []) {
  return (async (url: string, init?: RequestInit) => {
    seen.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
    const hit = Object.entries(routes).find(([k]) => url.startsWith(k));
    if (!hit) return new Response('nope', { status: 404 });
    return typeof hit[1] === 'number' ? new Response('x', { status: hit[1] }) : Response.json(hit[1]);
  }) as unknown as typeof fetch;
}

beforeEach(() => { process.env.PEXELS_API_KEY = 'test-pexels'; process.env.UNSPLASH_ACCESS_KEY = 'test-unsplash'; });

describe('photo search', () => {
  it('searches Pexels with the key in a header, never in the address', async () => {
    const seen: { url: string; headers: Record<string, string> }[] = [];
    const r = await search('pexels', 'kaju katli', { orientation: 'square', perPage: 5 }, fakeFetch({ 'https://api.pexels.com/v1/search': { photos: [pexelsPhoto] } }, seen));
    expect(r[0]).toMatchObject({ provider: 'pexels', id: '1', photographer: 'Asha', alt: 'Kaju katli on a plate', full: pexelsPhoto.src.original });
    expect(seen[0].url).toContain('orientation=square');
    expect(seen[0].url).not.toContain('test-pexels');
    expect(seen[0].headers.Authorization).toBe('test-pexels');
  });

  it('searches Unsplash and keeps its credit links and download tracking', async () => {
    const seen: { url: string; headers: Record<string, string> }[] = [];
    const r = await search('unsplash', 'bakery', { orientation: 'square' }, fakeFetch({ 'https://api.unsplash.com/search/photos': { results: [unsplashPhoto] } }, seen));
    expect(seen[0].url).toContain('orientation=squarish');
    expect(seen[0].headers.Authorization).toBe('Client-ID test-unsplash');
    expect(r[0]).toMatchObject({ provider: 'unsplash', id: 'abc', alt: 'bakery counter', downloadLocation: unsplashPhoto.links.download_location });
    expect(r[0].photographerUrl).toContain('utm_source=shopfront');
  });

  it('mixes both libraries, and keeps going if one fails', async () => {
    const both = await searchAll('sweets', {}, fakeFetch({ 'https://api.pexels.com': { photos: [pexelsPhoto, pexelsPhoto] }, 'https://api.unsplash.com': { results: [unsplashPhoto] } }));
    expect(both.map((c) => c.provider)).toEqual(['pexels', 'unsplash', 'pexels']);
    const one = await searchAll('sweets', {}, fakeFetch({ 'https://api.pexels.com': { photos: [pexelsPhoto] }, 'https://api.unsplash.com': 500 }));
    expect(one).toHaveLength(1);
    delete process.env.UNSPLASH_ACCESS_KEY;
    const onlyPexels = await searchAll('sweets', {}, fakeFetch({ 'https://api.pexels.com': { photos: [pexelsPhoto] } }));
    expect(onlyPexels.map((c) => c.provider)).toEqual(['pexels']);
  });

  it('explains problems in plain language', async () => {
    delete process.env.PEXELS_API_KEY;
    await expect(search('pexels', 'x', {}, fakeFetch({}))).rejects.toThrow(/Pexels isn't connected yet/);
    process.env.PEXELS_API_KEY = 'k';
    await expect(search('pexels', 'x', {}, fakeFetch({ 'https://api.pexels.com': 401 }))).rejects.toThrow(/refused the key/);
    await expect(search('pexels', 'x', {}, fakeFetch({ 'https://api.pexels.com': 429 }))).rejects.toThrow(/Too many photo searches/);
    await expect(getPhoto('pexels', '../etc', fakeFetch({}))).rejects.toBeInstanceOf(PhotoError);
  });
});
