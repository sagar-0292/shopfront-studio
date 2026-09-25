import type { Metadata } from 'next';
import { Badge, Card, PageHeader } from '@/components/ui';
import { getContext } from '@/lib/context';
import { withUser } from '@/lib/db';
import { SITE_TYPES, label, statusOf } from '@/lib/catalog';
import { CLIENT_AREAS } from '@/lib/invites';

export const metadata: Metadata = { title: 'Your website' };

export default async function AdminHome() {
  const ctx = (await getContext())!;
  const sites = await withUser(ctx.user, (db) =>
    db.query<{ id: string; name: string; status: string; site_types: string[]; primary_domain: string | null; client_id: string; client_name: string; agency: string }>(
      `select s.id, s.name, s.status, s.site_types, s.primary_domain, s.client_id, c.name as client_name, o.name as agency
         from sites s join clients c on c.id = s.client_id join organisations o on o.id = s.organisation_id
        where s.archived_at is null order by c.name, s.name`,
    ),
  );
  const first = ctx.profile.full_name.split(' ')[0];
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader eyebrow="Your business" title={first ? `Namaste, ${first}` : 'Namaste'} description="Manage your website here. More tools (products, orders, bookings, enquiries) are being switched on by your agency." />
      {sites.length === 0 && <Card><p className="text-muted">Your agency hasn’t set up a website for you yet.</p></Card>}
      {sites.map((s) => {
        const membership = ctx.clients.find((c) => c.client_id === s.client_id)!;
        const areas = membership.role === 'client_owner' ? CLIENT_AREAS.map((a) => a.key) : membership.permissions;
        const st = statusOf(s.status);
        return (
          <Card key={s.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-widest text-muted">{s.client_name} · built by {s.agency}</p>
                <h2 className="mt-1 font-display text-4xl">{s.name}</h2>
                <p className="mt-1 text-sm text-muted">{s.site_types.map((t) => label(SITE_TYPES, t)).join(' · ')}{s.primary_domain ? ` · ${s.primary_domain}` : ''}</p>
              </div>
              <Badge tone={st.tone}>{st.label}</Badge>
            </div>
            <div className="mt-6">
              <p className="mb-2 text-sm font-medium">{membership.role === 'client_owner' ? 'You’re the business owner. You can manage:' : 'You can manage:'}</p>
              <ul className="flex flex-wrap gap-2">
                {areas.map((a) => <li key={a}><Badge>{label(CLIENT_AREAS, a)}</Badge></li>)}
              </ul>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
