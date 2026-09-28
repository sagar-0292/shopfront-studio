// Turns a chosen photo into fast, responsive images.
// Pexels photos are cropped and saved with the site (allowed by the Pexels licence).
// Unsplash photos stay on Unsplash's image servers, as Unsplash's API terms require;
// their servers crop and resize them for us.
import sharp from 'sharp';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Candidate } from './providers.ts';

export type Credit = { provider: 'pexels' | 'unsplash'; id: string; photographer: string; photographerUrl: string; pageUrl: string };
/** Matches the design kit's image format. */
export type SavedImage = { src: string; srcset: string; width: number; height: number; alt: string; credit: Credit };

export type SaveOptions = {
  /** Folder on disk where files go (Pexels). */
  dir: string;
  /** Web path that folder is served at, e.g. "/img". */
  webPath: string;
  /** File name without extension, e.g. "hero". */
  name: string;
  /** Crop to this shape (width / height), e.g. 4/5. Omit to keep the photo's own shape. */
  aspect?: number;
  /** Output widths, largest last. */
  widths: number[];
  alt?: string;
  /** Where the crop should keep the subject: sharp's "attention" finds the interesting part,
   *  or give a point as fractions of the photo ({ x: 0.3, y: 0.8 } = left of centre, near the bottom). */
  focus?: 'attention' | 'entropy' | 'centre' | 'north' | 'south' | { x: number; y: number };
  quality?: number;
};

const credit = (c: Candidate): Credit => ({ provider: c.provider, id: c.id, photographer: c.photographer, photographerUrl: c.photographerUrl, pageUrl: c.pageUrl });

export async function savePhoto(c: Candidate, o: SaveOptions, f: typeof fetch = fetch): Promise<SavedImage> {
  const aspect = o.aspect ?? c.width / c.height;
  const alt = (o.alt ?? c.alt).trim();
  if (c.provider === 'unsplash') {
    if (c.downloadLocation) await f(`${c.downloadLocation}&client_id=${process.env.UNSPLASH_ACCESS_KEY ?? ''}`).catch(() => undefined);
    const at = (w: number) => `${c.full}&w=${w}&h=${Math.round(w / aspect)}&fit=crop&crop=entropy&auto=format&q=${o.quality ?? 72}`;
    const w = o.widths[o.widths.length - 1];
    return { src: at(w), srcset: o.widths.map((x) => `${at(x)} ${x}w`).join(', '), width: w, height: Math.round(w / aspect), alt, credit: credit(c) };
  }
  // Pexels: fetch a large version, crop once, then write each width.
  const maxW = Math.max(...o.widths);
  const source = `${c.full}?auto=compress&cs=tinysrgb&w=${Math.min(c.width, Math.max(2400, Math.ceil(maxW * 1.4)))}`;
  const r = await f(source);
  if (!r.ok) throw new Error(`Could not download photo ${c.id} (${r.status})`);
  const input = Buffer.from(await r.arrayBuffer());
  const meta = await sharp(input).metadata();
  const srcW = meta.width!, srcH = meta.height!;
  // Largest crop of the right shape that fits the photo.
  const cropW = Math.min(srcW, Math.round(srcH * aspect)), cropH = Math.round(cropW / aspect);
  const focus = o.focus;
  const cropped = typeof focus === 'object'
    ? await sharp(input).rotate().extract({
        left: Math.round(Math.min(Math.max(focus.x * srcW - cropW / 2, 0), srcW - cropW)),
        top: Math.round(Math.min(Math.max(focus.y * srcH - cropH / 2, 0), srcH - cropH)),
        width: cropW, height: cropH,
      }).toBuffer()
    : await sharp(input).rotate().resize(cropW, cropH, { fit: 'cover', position: focus === 'centre' || !focus ? 'centre' : focus === 'north' || focus === 'south' ? focus : sharp.strategy[focus] }).toBuffer();
  mkdirSync(o.dir, { recursive: true });
  const widths = [...new Set(o.widths.map((w) => Math.min(w, cropW)))].sort((a, b) => a - b);
  for (const w of widths) {
    const file = join(o.dir, `${o.name}-${w}.webp`);
    if (!existsSync(file)) writeFileSync(file, await sharp(cropped).resize(w).webp({ quality: o.quality ?? 72, effort: 5 }).toBuffer());
  }
  const w = widths[widths.length - 1];
  const url = (x: number) => `${o.webPath}/${o.name}-${x}.webp`;
  return { src: url(w), srcset: widths.map((x) => `${url(x)} ${x}w`).join(', '), width: w, height: Math.round(w / aspect), alt, credit: credit(c) };
}
