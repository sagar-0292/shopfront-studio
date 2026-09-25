import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ActionForm } from '@/components/action-form';
import { Card, CardTitle, PageHeader } from '@/components/ui';
import { InviteClientForm } from '@/components/studio/invite-client-form';
import { getContext } from '@/lib/context';
import { withUser } from '@/lib/db';
import { label } from '@/lib/catalog';
import { CLIENT_AREAS } from '@/lib/invites';
import { inviteStaff, removeStaff } from './actions';

export const metadata: Metadata = { title: 'Staff' };

export default async function StaffPage() {
  const ctx = (await getContext())!;
  const owned = ctx.clients.filter((c) => c.role === 'client_owner');
  if (!owned.length) redirect('/admin');
  const staff = await withUser(ctx.user, (db) =>
    db.query<{ client_id: string; user_id: string; permissions: string[]; full_name: string; email: string }>(
      `select m.client_id, m.user_id, m.permissions, p.full_name, p.email from client_members m join profiles p on p.id = m.user_id
        where m.role = 'client_staff' and m.client_id = any($1::uuid[]) order by p.full_name`,
      [owned.map((c) => c.client_id)],
    ),
  );
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader eyebrow="Your business" title="Staff" description="Give your staff their own login, with access only to what they need — for example, orders only." />
      {owned.map((c) => (
        <Card key={c.client_id}>
          <CardTitle title={c.client_name} />
          <ul className="mb-6 divide-y divide-line rounded-xl border border-line" aria-label="Staff logins">
            {staff.filter((s) => s.client_id === c.client_id).map((s) => (
              <li key={s.user_id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{s.full_name || s.email}</p>
                  <p className="truncate text-sm text-muted">{s.email} · {s.permissions.map((k) => label(CLIENT_AREAS, k)).join(', ')}</p>
                </div>
                <ActionForm action={removeStaff} submitLabel="Remove" variant="ghost" className="flex items-center gap-2" confirm={`Remove ${s.email}?`}>
                  <input type="hidden" name="client_id" value={c.client_id} />
                  <input type="hidden" name="user_id" value={s.user_id} />
                </ActionForm>
              </li>
            ))}
            {!staff.some((s) => s.client_id === c.client_id) && <li className="p-4 text-sm text-muted">No staff logins yet.</li>}
          </ul>
          <h3 className="mb-3 text-sm font-medium">Invite a staff member</h3>
          <InviteClientForm action={inviteStaff} clientId={c.client_id} areas={CLIENT_AREAS} allowOwner={false} />
        </Card>
      ))}
    </div>
  );
}
