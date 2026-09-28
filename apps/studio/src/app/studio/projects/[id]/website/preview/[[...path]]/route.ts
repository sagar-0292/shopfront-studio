import { requireAgency } from '@/lib/context';
import { withUser } from '@/lib/db';
import { catalogJson, renderPages } from '@/lib/website/render';
import { loadProjectWebsite } from '@/lib/website/load';

// The website preview inside the studio: every page, its catalogue and its own photos,
// rendered on request with the project's kit versions. Only the agency can see it.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; path?: string[] }> }) {
  const { id, path = [] } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id) || path.some((p) => !/^[\w.-]{1,80}$/.test(p) || p.startsWith('.'))) return new Response('Not found', { status: 404 });
  const { ctx, agency } = await requireAgency();
  const base = `/studio/projects/${id}/website/preview`;
  const joined = path.join('/');

  // The business's own photos: /img/own/<name>.webp (and <name>-800.webp).
  const own = /^img\/own\/([a-z0-9-]+?)(-800)?\.webp$/.exec(joined);
  if (own) {
    const f = await withUser(ctx.user, (db) => db.one<{ data: Buffer; small: Buffer | null }>(
      `select f.data, f.small from site_files f join sites s on s.id = f.site_id where f.site_id = $1 and s.organisation_id = $3 and f.name = $2 and f.kind <> 'document'`,
      [id, own[1], agency.organisation_id]));
    if (!f) return new Response('Not found', { status: 404 });
    return new Response(new Uint8Array(own[2] && f.small ? f.small : f.data), { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, max-age=300' } });
  }

  const p = await withUser(ctx.user, (db) => loadProjectWebsite(db, id, agency.organisation_id));
  if (!p?.site.website) return new Response('This website hasn’t been built yet.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  const w = p.site.website;
  if (joined === 'data/catalog.json') {
    const json = catalogJson(w, base);
    return json ? new Response(json, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }) : new Response('Not found', { status: 404 });
  }
  const versions = { motion: p.site.motion_kit_version, commerce: p.site.commerce_kit_version, design: p.site.design_kit_version };
  let pages: Record<string, string>;
  try {
    pages = await renderPages(w, versions, { base, noindex: true });
  } catch (e) {
    return new Response(e instanceof Error ? e.message : 'This website could not be shown.', { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
  const html = pages[`/${joined ? `${joined.replace(/\/$/, '')}/` : ''}index.html`];
  if (!html) return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
