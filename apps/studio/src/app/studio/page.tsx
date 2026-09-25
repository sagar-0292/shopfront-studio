import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, ButtonLink, EmptyState, Input, PageHeader, Select, cx } from '@/components/ui';
import { requireAgency } from '@/lib/context';
import { withUser } from '@/lib/db';
import { SITE_STATUSES, SITE_TYPES, formatDate, label, statusOf } from '@/lib/catalog';

export const metadata: Metadata = { title: 'Projects' };

const GRADIENTS = [
  'from-indigo-500 to-violet-600',
  'from-amber-400 to-orange-500',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-sky-500 to-indigo-600',
  'from-fuchsia-500 to-purple-600',
];
function gradientFor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}
function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');
}

type Row = {
  id: string; name: string; slug: string; status: string; site_types: string[]; business_kind: string;
  updated_at: string; client_name: string; city: string; archived_at: string | null; assignees: string[] | null;
};

export default async function ProjectsPage({ searchParams }: PageProps<'/studio'>) {
  const { ctx, agency } = await requireAgency();
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q.trim().slice(0, 100) : '';
  const status = typeof sp.status === 'string' ? sp.status : '';
  const showArchived = status === 'archived';

  const { rows, counts } = await withUser(ctx.user, async (db) => {
    const rows = await db.query<Row>(
      `select s.id, s.name, s.slug, s.status, s.site_types, s.business_kind, s.updated_at, s.archived_at,
              c.name as client_name, c.city,
              (select array_agg(coalesce(nullif(p.full_name, ''), p.email) order by p.full_name)
                 from site_assignees a join profiles p on p.id = a.user_id where a.site_id = s.id) as assignees
         from sites s join clients c on c.id = s.client_id
        where s.organisation_id = $1
          and ($2 = '' or s.name ilike '%' || $2 || '%' or c.name ilike '%' || $2 || '%'
               or s.business_kind ilike '%' || $2 || '%' or c.city ilike '%' || $2 || '%')
          and (case when $3 = 'archived' then s.archived_at is not null
                    else s.archived_at is null and ($3 = '' or s.status::text = $3) end)
        order by s.updated_at desc
        limit 200`,
      [agency.organisation_id, q, status],
    );
    const counts = await db.query<{ status: string; n: number }>(
      `select status::text, count(*)::int as n from sites where organisation_id = $1 and archived_at is null group by status`,
      [agency.organisation_id],
    );
    return { rows, counts };
  });
  const total = counts.reduce((a, c) => a + c.n, 0);

  return (
    <>
      <PageHeader
        eyebrow={agency.name}
        title="Projects"
        description={total ? `${total} active ${total === 1 ? 'website' : 'websites'} across your clients.` : undefined}
        action={<ButtonLink href="/studio/projects/new" variant="accent">+ New project</ButtonLink>}
      />

      {total > 0 && (
        <dl className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { k: 'Active projects', v: total, cls: 'bg-brand text-white', sub: 'text-white/70' },
            { k: 'Live', v: counts.find((c) => c.status === 'live')?.n ?? 0, cls: 'bg-card border border-line', sub: 'text-muted' },
            { k: 'With clients for review', v: counts.find((c) => c.status === 'in_review')?.n ?? 0, cls: 'bg-accent-soft border border-accent/30', sub: 'text-warn' },
            { k: 'Drafts & building', v: (counts.find((c) => c.status === 'draft')?.n ?? 0) + (counts.find((c) => c.status === 'building')?.n ?? 0), cls: 'bg-card border border-line', sub: 'text-muted' },
          ].map((t) => (
            <div key={t.k} className={cx('rounded-2xl p-4', t.cls)}>
              <dt className={cx('text-xs font-medium', t.sub)}>{t.k}</dt>
              <dd className="font-display mt-1 text-3xl">{t.v}</dd>
            </div>
          ))}
        </dl>
      )}

      <form className="mb-6 flex flex-col gap-3 sm:flex-row" role="search">
        <Input name="q" defaultValue={q} placeholder="Search by project, client, city or business…" aria-label="Search projects" className="sm:max-w-md" />
        <Select name="status" defaultValue={status} aria-label="Filter by status" className="sm:w-56">
          <option value="">All active</option>
          {SITE_STATUSES.filter((s) => s.key !== 'archived').map((s) => (
            <option key={s.key} value={s.key}>{s.label} ({counts.find((c) => c.status === s.key)?.n ?? 0})</option>
          ))}
          <option value="archived">Archived</option>
        </Select>
        <button className="min-h-11 rounded-full bg-primary px-6 text-sm font-medium text-white hover:bg-primary-hover">Search</button>
      </form>

      {rows.length === 0 ? (
        q || status ? (
          <EmptyState title="No matches">Try a different search, or <Link className="underline" href="/studio">clear the filters</Link>.</EmptyState>
        ) : (
          <EmptyState title="Your first project starts here" action={<ButtonLink href="/studio/projects/new" variant="accent">Create a project</ButtonLink>}>
            Add a client and their website. You can invite the business owner to their admin panel from the project’s settings.
          </EmptyState>
        )
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {rows.map((r) => {
            const st = statusOf(showArchived ? 'archived' : r.status);
            return (
              <li key={r.id}>
                <Link
                  href={`/studio/projects/${r.id}`}
                  className="group relative block h-full overflow-hidden rounded-2xl border border-line bg-card p-5 shadow-[0_1px_2px_rgba(20,19,46,0.04)] transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                >
                  <span aria-hidden className={cx('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', gradientFor(r.name))} />
                  <div className="flex items-start gap-4">
                    <span aria-hidden className={cx('grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br font-display text-xl text-white shadow-sm', gradientFor(r.name))}>
                      {initials(r.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="truncate text-xs font-semibold uppercase tracking-wider text-muted">{r.client_name}{r.city ? ` · ${r.city}` : ''}</p>
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </div>
                      <h2 className="font-display mt-1 truncate text-2xl text-brand group-hover:text-primary">{r.name}</h2>
                    </div>
                  </div>
                  <p className="mt-4 line-clamp-1 text-sm text-muted">
                    {[r.business_kind, ...r.site_types.map((t) => label(SITE_TYPES, t))].filter(Boolean).join(' · ')}
                  </p>
                  <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs text-muted">
                    <span>Updated {formatDate(r.updated_at)}</span>
                    {r.assignees?.length ? <span className="truncate">{r.assignees.join(', ')}</span> : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
