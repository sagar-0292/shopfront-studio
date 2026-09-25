import type { Metadata } from 'next';
import { EmptyState, PageHeader } from '@/components/ui';
import { requireAgency } from '@/lib/context';
import { withUser } from '@/lib/db';
import { formatDate } from '@/lib/catalog';

export const metadata: Metadata = { title: 'Activity' };

const things: Record<string, string> = {
  organisations: 'agency settings', organisation_members: 'team', organisation_billing: 'billing details', clients: 'client',
  client_members: 'client login', sites: 'project', site_assignees: 'project team', sellers: 'seller', seller_members: 'seller login',
  categories: 'category', products: 'product', orders: 'order', leads: 'enquiry', invitations: 'invitation',
  site_references: 'reference website', site_payment_settings: 'payment options', site_payment_secrets: 'payment gateway keys',
};
const verbs: Record<string, string> = { insert: 'added', update: 'changed', delete: 'removed' };
const hidden = new Set(['id', 'organisation_id', 'site_id', 'client_id', 'created_at', 'updated_at', 'created_by', 'user_id', 'invited_by']);

function describe(r: Row) {
  const data = r.new_data ?? r.old_data ?? {};
  const name = data.name ?? data.email ?? data.customer_name ?? data.legal_name ?? data.url ?? data.provider ?? '';
  let changed = '';
  if (r.action === 'update' && r.old_data && r.new_data) {
    const keys = Object.keys(r.new_data).filter((k) => !hidden.has(k) && JSON.stringify(r.new_data![k]) !== JSON.stringify(r.old_data![k]));
    if (keys.length) changed = ` (${keys.map((k) => k.replace(/_/g, ' ')).join(', ')})`;
  }
  return `${verbs[r.action]} ${things[r.table_name] ?? r.table_name}${name ? ` “${name}”` : ''}${changed}`;
}

type Row = {
  id: number; created_at: string; actor: string | null; table_name: string; action: string;
  old_data: Record<string, unknown> | null; new_data: Record<string, unknown> | null; site_name: string | null;
};

export default async function ActivityPage() {
  const { ctx, agency } = await requireAgency();
  const rows = await withUser(ctx.user, (db) =>
    db.query<Row>(
      `select a.id, a.created_at, coalesce(nullif(p.full_name, ''), a.actor_email) as actor, a.table_name, a.action, a.old_data, a.new_data, s.name as site_name
         from audit_log a left join profiles p on p.id = a.actor_id left join sites s on s.id = a.site_id
        where a.organisation_id = $1 order by a.id desc limit 200`,
      [agency.organisation_id],
    ),
  );
  return (
    <div className="max-w-4xl">
      <PageHeader eyebrow={agency.name} title="Activity" description="Every change made by anyone — your team, your clients, or their staff. Entries can’t be edited or deleted." />
      {rows.length === 0 ? (
        <EmptyState title="Nothing yet" />
      ) : (
        <ol className="divide-y divide-line rounded-2xl border border-line bg-card" aria-label="Activity log">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-baseline sm:justify-between">
              <p className="min-w-0 text-sm">
                <span className="font-medium">{r.actor ?? 'System'}</span> {describe(r)}
                {r.site_name && <span className="text-muted"> · {r.site_name}</span>}
              </p>
              <time className="shrink-0 text-xs text-muted" dateTime={r.created_at}>{formatDate(r.created_at, true)}</time>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
