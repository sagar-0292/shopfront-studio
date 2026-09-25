import type { Metadata } from 'next';
import { ActionForm } from '@/components/action-form';
import { Badge, Card, CardTitle, Field, Input, PageHeader, Select } from '@/components/ui';
import { requireAgency } from '@/lib/context';
import { withUser } from '@/lib/db';
import { formatDate } from '@/lib/catalog';
import { revokeInvitation } from '../projects/actions';
import { changeRole, inviteTeamMember, removeMember } from './actions';

export const metadata: Metadata = { title: 'Team' };

export default async function TeamPage() {
  const { ctx, agency, isOwner } = await requireAgency();
  const { members, invites } = await withUser(ctx.user, async (db) => ({
    members: await db.query<{ user_id: string; role: string; full_name: string; email: string; created_at: string }>(
      `select m.user_id, m.role, p.full_name, p.email, m.created_at from organisation_members m join profiles p on p.id = m.user_id
       where m.organisation_id = $1 order by m.role, p.full_name`, [agency.organisation_id]),
    invites: await db.query<{ id: string; email: string; agency_role: string; expires_at: string }>(
      `select id, email, agency_role, expires_at from invitations where organisation_id = $1 and kind = 'agency'
       and accepted_at is null and revoked_at is null and expires_at > now() order by created_at desc`, [agency.organisation_id]),
  }));

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader eyebrow={agency.name} title="Team" description="Owners can do everything, including billing. Team members create and edit client projects but can’t see billing." />
      <Card>
        <CardTitle title={`People (${members.length})`} />
        <ul className="divide-y divide-line rounded-xl border border-line" aria-label="Team members">
          {members.map((m) => (
            <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {m.full_name || m.email} {m.user_id === ctx.user.id && <span className="text-muted">(you)</span>}
                </p>
                <p className="truncate text-sm text-muted">{m.email} · joined {formatDate(m.created_at)}</p>
              </div>
              {isOwner && m.user_id !== ctx.user.id ? (
                <div className="flex flex-wrap items-center gap-2">
                  <ActionForm action={changeRole} submitLabel="Change" variant="ghost" className="flex items-center gap-2">
                    <input type="hidden" name="user_id" value={m.user_id} />
                    <Select name="role" defaultValue={m.role} aria-label={`Role for ${m.email}`} className="w-32">
                      <option value="team">Team</option>
                      <option value="owner">Owner</option>
                    </Select>
                  </ActionForm>
                  <ActionForm action={removeMember} submitLabel="Remove" variant="ghost" className="flex items-center gap-2" confirm={`Remove ${m.email} from ${agency.name}?`}>
                    <input type="hidden" name="user_id" value={m.user_id} />
                  </ActionForm>
                </div>
              ) : (
                <Badge tone={m.role === 'owner' ? 'accent' : 'neutral'}>{m.role === 'owner' ? 'Owner' : 'Team'}</Badge>
              )}
            </li>
          ))}
        </ul>
      </Card>

      {isOwner ? (
        <Card>
          <CardTitle title="Invite to your agency" />
          {invites.length > 0 && (
            <ul className="mb-6 divide-y divide-line rounded-xl border border-line" aria-label="Pending invitations">
              {invites.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <p className="min-w-0 truncate text-sm"><span className="font-medium">{i.email}</span> <span className="text-muted">· {i.agency_role === 'owner' ? 'Owner' : 'Team'} · expires {formatDate(i.expires_at)}</span></p>
                  <ActionForm action={revokeInvitation} submitLabel="Cancel invite" variant="ghost" className="flex items-center gap-2">
                    <input type="hidden" name="id" value={i.id} />
                  </ActionForm>
                </li>
              ))}
            </ul>
          )}
          <ActionForm action={inviteTeamMember} submitLabel="Create invitation" pendingLabel="Inviting…" resetOnSuccess>
            <div className="grid gap-5 sm:grid-cols-[1fr_12rem]">
              <Field label="Email address" htmlFor="invite-email">
                <Input id="invite-email" name="email" type="email" required autoComplete="off" />
              </Field>
              <Field label="Role" htmlFor="invite-role">
                <Select id="invite-role" name="role" defaultValue="team">
                  <option value="team">Team member</option>
                  <option value="owner">Owner</option>
                </Select>
              </Field>
            </div>
          </ActionForm>
        </Card>
      ) : (
        <p className="text-sm text-muted">Only an agency owner can invite or remove people.</p>
      )}
    </div>
  );
}
