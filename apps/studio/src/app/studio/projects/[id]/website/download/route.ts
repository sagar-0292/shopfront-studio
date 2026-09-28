import { requireAgency } from '@/lib/context';
import { withUser } from '@/lib/db';
import { UserError } from '@/lib/action';
import { websiteZip } from '@/lib/website/render';
import { loadProjectWebsite } from '@/lib/website/load';

// The finished website as a .zip, ready to drag onto Netlify Drop (or any static host).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response('Not found', { status: 404 });
  const { ctx, agency } = await requireAgency();
  const loaded = await withUser(ctx.user, async (db) => {
    const p = await loadProjectWebsite(db, id, agency.organisation_id);
    if (!p?.site.website) return null;
    const own = await db.query<{ name: string; data: Buffer; small: Buffer | null }>(
      `select name, data, small from site_files where site_id = $1 and kind <> 'document'`, [id]);
    return { p, own };
  });
  if (!loaded) return new Response('This website hasn’t been built yet.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  const { p, own } = loaded;
  try {
    const zip = await websiteZip(p.site.website!, { motion: p.site.motion_kit_version, commerce: p.site.commerce_kit_version, design: p.site.design_kit_version },
      p.site.name, own.map((f) => ({ name: f.name, data: new Uint8Array(f.data), small: f.small ? new Uint8Array(f.small) : null })));
    return new Response(zip as BodyInit, {
      headers: { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="${p.site.slug}-website.zip"`, 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    return new Response(e instanceof UserError ? e.message : 'The website could not be packed. Please try again.', { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}
