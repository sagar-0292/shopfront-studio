import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, ButtonLink, EmptyState, Input, PageHeader, Select, cx } from '@/components/ui';
import { requireAgency } from '@/lib/context';
import { withUser } from '@/lib/db';
import { SITE_STATUSES, SITE_TYPES, formatDate, label, statusOf } from '@/lib/catalog';

export const metadata: Metadata = { title: 'Projects' };

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

      <form className="mb-6 flex flex-col gap-3 sm:flex-row" role="search">
        <Input name="q" defaultValue={q} placeholder="Search by project, client, city or business…" aria-label="Search projects" className="sm:max-w-md" />
        <Select name="status" defaultValue={status} aria-label="Filter by status" className="sm:w-56">
          <option value="">All active</option>
          {SITE_STATUSES.filter((s) => s.key !== 'archived').map((s) => (
            <option key={s.key} value={s.key}>{s.label} ({counts.find((c) => c.status === s.key)?.n ?? 0})</option>
          ))}
          <option value="archived">Archived</option>
        </Select>
        <button className="min-h-11 rounded-full border border-line px-5 text-sm">Search</button>
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
                  className={cx('group block h-full rounded-2xl border border-line bg-card p-5 transition hover:-translate-y-0.5 hover:border-ink/40 hover:shadow-sm')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs uppercase tracking-widest text-muted">{r.client_name}{r.city ? ` · ${r.city}` : ''}</p>
                      <h2 className="mt-1 truncate font-display text-3xl leading-tight">{r.name}</h2>
                    </div>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </div>
                  <p className="mt-3 line-clamp-1 text-sm text-muted">
                    {[r.business_kind, ...r.site_types.map((t) => label(SITE_TYPES, t))].filter(Boolean).join(' · ')}
                  </p>
                  <div className="mt-4 flex items-center justify-between text-xs text-muted">
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
