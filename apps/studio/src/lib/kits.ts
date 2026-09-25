import 'server-only';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Published kit versions live in apps/studio/kits (see scripts/release-kits.mjs).
export type KitName = 'motion' | 'commerce';
export const KIT_NAMES: KitName[] = ['motion', 'commerce'];
export const KIT_LABELS: Record<KitName, string> = { motion: 'Motion kit', commerce: 'Commerce kit' };
export type KitVersion = { version: string; released_at: string; notes: string };
export type Manifest = Record<KitName, { latest: string; versions: KitVersion[] }>;
export type Hook = { attr: string; on: string; values?: readonly string[]; does: string };

export const VERSION_RE = /^\d+\.\d+\.\d+(-[0-9a-z.]+)?$/i;

export function kitsDir() {
  return process.env.KITS_DIR ?? join(process.cwd(), 'kits');
}

export function manifest(): Manifest {
  return JSON.parse(readFileSync(join(kitsDir(), 'manifest.json'), 'utf8')) as Manifest;
}

export function isReleased(kit: KitName, version: string) {
  return VERSION_RE.test(version) && manifest()[kit].versions.some((v) => v.version === version);
}

export function hooks(kit: KitName, version: string): Hook[] {
  if (!isReleased(kit, version)) return [];
  return (JSON.parse(readFileSync(join(kitsDir(), kit, version, 'hooks.json'), 'utf8')) as { hooks: Hook[] }).hooks;
}

/** Compares versions like 1.2.10 > 1.2.9. */
export function compareVersions(a: string, b: string) {
  const pa = a.split(/[.-]/), pb = b.split(/[.-]/);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i], y = pb[i];
    if (x === y) continue;
    if (x === undefined) return 1;
    if (y === undefined) return -1;
    const nx = Number(x), ny = Number(y);
    if (!isNaN(nx) && !isNaN(ny)) return nx > ny ? 1 : -1;
    return x > y ? 1 : -1;
  }
  return 0;
}

/** Address of the sample site rendered with specific kit versions. */
export const sampleUrl = (motion: string, commerce: string, page = 'sample.html') =>
  `/kits/demo/${page}?motion=${encodeURIComponent(motion)}&commerce=${encodeURIComponent(commerce)}`;
