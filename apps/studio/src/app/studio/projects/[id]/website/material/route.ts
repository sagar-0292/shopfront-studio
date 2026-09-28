import { zipSync } from 'fflate';
import { requireAgency } from '@/lib/context';
import { withUser } from '@/lib/db';

// All of the business's uploaded material in one .zip, to attach to the Claude chat with the brief.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response('Not found', { status: 404 });
  const { ctx, agency } = await requireAgency();
  const rows = await withUser(ctx.user, (db) => db.query<{ name: string; kind: string; filename: string; mime: string; data: Buffer; slug: string }>(
    `select f.name, f.kind, f.filename, f.mime, f.data, s.slug from site_files f join sites s on s.id = f.site_id
     where f.site_id = $1 and s.organisation_id = $2 order by f.kind, f.created_at`, [id, agency.organisation_id]));
  if (!rows.length) return new Response('Nothing has been uploaded yet.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  const files: Record<string, Uint8Array> = {};
  for (const r of rows) {
    const clean = r.filename.replace(/[^\w. -]+/g, '_') || r.name;
    const path = r.kind === 'document' ? clean : `${r.kind === 'logo' ? 'logo' : `photo-${r.name}`}.webp`;
    files[path in files ? `${r.name}-${path}` : path] = new Uint8Array(r.data);
  }
  return new Response(zipSync(files, { level: 0 }) as BodyInit, {
    headers: { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="${rows[0].slug}-material-for-claude.zip"`, 'Cache-Control': 'no-store' },
  });
}
