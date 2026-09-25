import { readFile, stat } from 'node:fs/promises';
import { join, normalize, sep, extname } from 'node:path';
import { kitsDir, manifest, VERSION_RE, type KitName } from '@/lib/kits';

// Serves published kits and demo pages. Versioned kit files never change, so
// browsers and CDNs may keep them for a year.
const TYPES: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml', '.webm': 'video/webm', '.mp4': 'video/mp4',
  '.glb': 'model/gltf-binary', '.avif': 'image/avif', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg',
};

function pick(kit: KitName, requested: string | null) {
  const m = manifest()[kit];
  return requested && VERSION_RE.test(requested) && m.versions.some((v) => v.version === requested) ? requested : m.latest;
}

export async function GET(request: Request, ctx: RouteContext<'/kits/[...path]'>) {
  const { path } = await ctx.params;
  const root = kitsDir();
  const rel = normalize(path.join('/'));
  if (path.some((p) => p.startsWith('.')) || rel.startsWith('..')) return new Response('Not found', { status: 404 });
  const file = join(root, rel);
  if (!file.startsWith(root + sep)) return new Response('Not found', { status: 404 });
  const type = TYPES[extname(file).toLowerCase()];
  if (!type) return new Response('Not found', { status: 404 });
  try {
    if (!(await stat(file)).isFile()) throw new Error('not a file');
  } catch {
    return new Response('Not found', { status: 404 });
  }
  const versioned = /^(motion|commerce)\/\d+\.\d+\.\d+/.test(rel);
  const headers: Record<string, string> = {
    'content-type': type,
    'cache-control': versioned ? 'public, max-age=31536000, immutable' : 'public, max-age=60',
    'x-content-type-options': 'nosniff',
  };
  if (rel.startsWith('demo/') && extname(file) === '.html') {
    const q = new URL(request.url).searchParams;
    const html = (await readFile(file, 'utf8'))
      .replaceAll('{{motion}}', pick('motion', q.get('motion')))
      .replaceAll('{{commerce}}', pick('commerce', q.get('commerce')));
    // Demo pages may be shown inside the studio's compare screen.
    headers['x-frame-options'] = 'SAMEORIGIN';
    headers['cache-control'] = 'no-cache';
    return new Response(html, { headers });
  }
  return new Response(await readFile(file), { headers });
}
