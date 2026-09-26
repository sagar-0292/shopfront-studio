import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, Card, PageHeader } from '@/components/ui';
import { DesignPreview, Swatches } from '@/components/studio/design-preview';
import { requireAgency } from '@/lib/context';
import { withUser } from '@/lib/db';
import { DESIGNS, DIRECTIONS, sampleSiteUrl } from '@/lib/designs';

export const metadata: Metadata = { title: 'Designs' };

export default async function DesignsPage() {
  const { ctx, agency } = await requireAgency();
  const counts = await withUser(ctx.user, (db) =>
    db.query<{ design_direction: string; n: number }>(
      `select design_direction, count(*)::int as n from sites
       where organisation_id = $1 and archived_at is null and design_direction is not null group by design_direction`,
      [agency.organisation_id],
    ),
  );
  const used = Object.fromEntries(counts.map((c) => [c.design_direction, c.n]));

  return (
    <div className="max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Design kit"
        title="Designs"
        description="Four complete looks for client websites. Each one sets the fonts, colours, spacing, animation style and every section’s layout — tested to score 90+ on phones. Pick one on a project; the AI Builder then writes the content in that look."
      />
      <ul className="grid gap-6 lg:grid-cols-2" aria-label="Design directions">
        {DIRECTIONS.map((key) => {
          const d = DESIGNS[key];
          const n = used[key] ?? 0;
          return (
            <li key={key}>
              <Card className="h-full">
                <DesignPreview url={sampleSiteUrl(key)} name={d.sample.name} className="mb-8" />
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-2xl font-semibold text-brand">{d.name}</h2>
                    <p className="text-sm text-muted">Sample: {d.sample.name} · {d.sample.kind}</p>
                  </div>
                  <Swatches colours={d.swatches} label={`${d.name} colours`} />
                </div>
                <p className="mt-3">{d.feel}</p>
                <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4">
                  <dt className="font-semibold text-brand">Best for</dt><dd className="text-muted">{d.bestFor}</dd>
                  <dt className="font-semibold text-brand">Fonts</dt><dd className="text-muted">{d.fonts}</dd>
                </dl>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Link className="text-sm font-semibold text-primary underline" href={sampleSiteUrl(key)} target="_blank">Open {d.sample.name} ↗</Link>
                  {n > 0 ? <Badge tone="good">Used by {n} {n === 1 ? 'project' : 'projects'}</Badge> : <Badge>Not used yet</Badge>}
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
