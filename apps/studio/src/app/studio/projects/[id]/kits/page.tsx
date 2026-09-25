import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionForm } from '@/components/action-form';
import { Card, Notice, PageHeader } from '@/components/ui';
import { KitCompare } from '@/components/studio/kit-compare';
import { requireAgency } from '@/lib/context';
import { withUser } from '@/lib/db';
import { compareVersions, isReleased, KIT_LABELS, manifest, sampleUrl, type KitName } from '@/lib/kits';
import { switchKitVersion } from '../../actions';

export const metadata: Metadata = { title: 'Compare kit versions' };

export default async function CompareKitsPage({ params, searchParams }: PageProps<'/studio/projects/[id]/kits'>) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const kit = (sp.kit === 'commerce' ? 'commerce' : 'motion') as KitName;
  const { ctx, agency, isOwner } = await requireAgency();
  const site = await withUser(ctx.user, (db) =>
    db.one<{ id: string; name: string; motion_kit_version: string; commerce_kit_version: string }>(
      `select id, name, motion_kit_version, commerce_kit_version from sites where id = $1 and organisation_id = $2`, [id, agency.organisation_id]),
  );
  if (!site) notFound();
  const m = manifest();
  const current = kit === 'motion' ? site.motion_kit_version : site.commerce_kit_version;
  const to = typeof sp.to === 'string' && isReleased(kit, sp.to) ? sp.to : m[kit].latest;
  const notes = m[kit].versions.find((v) => v.version === to)?.notes;
  const other = kit === 'motion' ? site.commerce_kit_version : site.motion_kit_version;
  const url = (v: string) => (kit === 'motion' ? sampleUrl(v, other) : sampleUrl(other, v));
  const direction = compareVersions(to, current);

  return (
    <div className="max-w-6xl space-y-6">
      <p className="text-sm"><Link className="text-muted underline" href={`/studio/projects/${id}`}>← {site.name}</Link></p>
      <PageHeader
        eyebrow={site.name}
        title={`${KIT_LABELS[kit]}: ${current} → ${to}`}
        description="Check how the website looks and moves on the new version before switching. Scroll inside each preview to compare."
      />
      <form className="flex flex-wrap items-end gap-3" method="get">
        <input type="hidden" name="kit" value={kit} />
        <label className="text-sm font-medium">Compare with version
          <select name="to" defaultValue={to} className="ml-2 min-h-11 rounded-xl border border-line bg-card px-3">
            {m[kit].versions.map((v) => <option key={v.version} value={v.version}>{v.version}{v.version === current ? ' (current)' : ''}</option>)}
          </select>
        </label>
        <button className="min-h-11 rounded-full border border-line bg-card px-5 text-sm font-medium">Show</button>
      </form>
      {notes && <Card><h2 className="font-semibold text-brand">What’s new in {to}</h2><p className="mt-2 text-sm text-muted">{notes}</p></Card>}
      <Notice>Shown on the sample site for now. Once this project has its own pages (with the AI build pipeline), they appear here instead.</Notice>
      <KitCompare before={url(current)} after={url(to)} beforeLabel={`Now: ${current}`} afterLabel={`After: ${to}`} />
      <Card>
        {direction === 0 ? (
          <p className="text-sm text-muted">This website already uses {KIT_LABELS[kit].toLowerCase()} {current}.</p>
        ) : isOwner ? (
          <ActionForm action={switchKitVersion} submitLabel={direction > 0 ? `Upgrade to ${to}` : `Switch back to ${to}`} variant="accent" confirm={`Switch ${site.name} to ${KIT_LABELS[kit].toLowerCase()} ${to}?`}>
            <input type="hidden" name="id" value={site.id} />
            <input type="hidden" name="kit" value={kit} />
            <input type="hidden" name="version" value={to} />
            <p className="text-sm text-muted">The website keeps its current version until you press this. You can switch back at any time.</p>
          </ActionForm>
        ) : (
          <p className="text-sm text-muted">Only the agency owner can change a website’s kit version. Share this page with them.</p>
        )}
      </Card>
    </div>
  );
}
