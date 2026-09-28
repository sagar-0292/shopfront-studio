// Downloads, crops and saves the real stock photos listed in photos.json, and
// records each one (sizes, alt text, photographer) in photos.lock.json.
// Only photos that are missing are downloaded, so this needs PEXELS_API_KEY
// (or UNSPLASH_ACCESS_KEY) only when photos.json changes.
//   node tools/fetch-photos.ts
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPhoto, savePhoto, type SavedImage, type Provider } from '../../photos/src/index.ts';

type Slot = { provider: Provider; id: string; aspect: number; widths: number[]; alt: string; quality?: number; focus?: 'attention' | 'entropy' | 'centre' | 'north' | 'south' | { x: number; y: number } };
type Manifest = { groups: Record<string, { dir: string; web: string; slots: Record<string, Slot> }> };

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, 'photos.json'), 'utf8')) as Manifest;
const lockPath = join(root, 'photos.lock.json');
const lock: Record<string, SavedImage & { from: string }> = existsSync(lockPath) ? JSON.parse(readFileSync(lockPath, 'utf8')) : {};
const cache = new Map<string, Awaited<ReturnType<typeof getPhoto>>>();

let fetched = 0;
for (const [group, g] of Object.entries(manifest.groups)) {
  for (const [slot, s] of Object.entries(g.slots)) {
    const key = `${group}/${slot}`;
    const from = `${s.provider}:${s.id}:${s.aspect.toFixed(4)}:${s.widths.join(',')}:${JSON.stringify(s.focus ?? 'attention')}:${s.quality ?? 72}`;
    const files = s.widths.map((w) => join(root, g.dir, `${slot}-${w}.webp`));
    if (lock[key]?.from === from && s.provider === 'pexels' && lock[key].srcset.split(', ').every((part) => existsSync(join(root, g.dir, part.split(' ')[0].split('/').pop()!)))) {
      lock[key].alt = s.alt; // alt text may be edited without re-downloading
      continue;
    }
    const id = `${s.provider}:${s.id}`;
    if (!cache.has(id)) cache.set(id, await getPhoto(s.provider, s.id));
    mkdirSync(join(root, g.dir), { recursive: true });
    for (const w of s.widths) { const f = join(root, g.dir, `${slot}-${w}.webp`); if (existsSync(f)) rmSync(f); }
    const saved = await savePhoto(cache.get(id)!, { dir: join(root, g.dir), webPath: g.web, name: slot, aspect: s.aspect, widths: s.widths, alt: s.alt, focus: s.focus ?? 'attention', quality: s.quality });
    lock[key] = { ...saved, from };
    fetched++;
    console.log(`✓ ${key}  ${saved.credit.photographer}  ${files.length} sizes`);
  }
}
// Drop entries no longer in the manifest.
for (const k of Object.keys(lock)) { const [g, s] = k.split('/'); if (!manifest.groups[g]?.slots[s]) delete lock[k]; }
// Remove photo files that no saved photo uses any more.
const inUse = new Set(Object.values(lock).flatMap((p) => p.srcset.split(', ').map((x) => x.split(' ')[0].split('/').pop()!)));
for (const g of Object.values(manifest.groups)) {
  const dir = join(root, g.dir);
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir)) if (f.endsWith('.webp') && !inUse.has(f)) { rmSync(join(dir, f)); console.log(`- removed unused ${g.dir}/${f}`); }
}
writeFileSync(lockPath, JSON.stringify(Object.fromEntries(Object.entries(lock).sort()), null, 1) + '\n');
console.log(`${fetched} downloaded, ${Object.keys(lock).length} photos recorded in photos.lock.json`);
