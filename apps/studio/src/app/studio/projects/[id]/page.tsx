import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionForm } from '@/components/action-form';
import { Badge, Card, CardTitle, Field, Input, Notice, PageHeader, Select } from '@/components/ui';
import { ClientFields, ProjectFields, type ClientDefaults } from '@/components/studio/project-fields';
import { InviteClientForm } from '@/components/studio/invite-client-form';
import { requireAgency } from '@/lib/context';
import { withUser } from '@/lib/db';
import { SITE_STATUSES, formatDate, label, statusOf } from '@/lib/catalog';
import { CLIENT_AREAS } from '@/lib/invites';
import { compareVersions, KIT_LABELS, KIT_NAMES, manifest } from '@/lib/kits';
import { loadReferences, ReferencesCard } from '@/components/site/references-card';
import { loadPayments, PaymentsCard } from '@/components/site/payments-card';
import { razorpayConnectConfig } from '@/lib/razorpay-connect';
import {
  inviteClientUser, removeClientUser, revokeInvitation, setArchived, setAssignees, updateClient, updateProject,
} from '../actions';

export const metadata: Metadata = { title: 'Project settings' };

type Site = {
  motion_kit_version: string; commerce_kit_version: string;
  id: string; name: string; slug: string; status: string; site_types: string[]; business_kind: string; languages: string[];
  primary_domain: string | null; archived_at: string | null; created_at: string; client_id: string;
};

export default async function ProjectPage({ params, searchParams }: PageProps<'/studio/projects/[id]'>) {
  const { id } = await params;
  const sp = await searchParams;
  const created = sp.created === '1';
  const kitUpdated = typeof sp['kit-updated'] === 'string' ? sp['kit-updated'] : null;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { ctx, agency } = await requireAgency();

  const data = await withUser(ctx.user, async (db) => {
    const site = await db.one<Site>(`select * from sites where id = $1 and organisation_id = $2`, [id, agency.organisation_id]);
    if (!site) return null;
    const [client, members, invites, team, assigned, refs, payments] = await Promise.all([
      db.one<ClientDefaults & { id: string; name: string; city: string }>(`select * from clients where id = $1`, [site.client_id]),
      db.query<{ user_id: string; role: string; permissions: string[]; full_name: string; email: string }>(
        `select m.user_id, m.role, m.permissions, p.full_name, p.email from client_members m join profiles p on p.id = m.user_id
         where m.client_id = $1 order by m.role, p.full_name`, [site.client_id]),
      db.query<{ id: string; email: string; client_role: string; permissions: string[]; expires_at: string }>(
        `select id, email, client_role, permissions, expires_at from invitations
         where client_id = $1 and accepted_at is null and revoked_at is null and expires_at > now() order by created_at desc`, [site.client_id]),
      db.query<{ user_id: string; name: string }>(
        `select m.user_id, coalesce(nullif(p.full_name, ''), p.email) as name from organisation_members m
         join profiles p on p.id = m.user_id where m.organisation_id = $1 order by name`, [agency.organisation_id]),
      db.query<{ user_id: string }>(`select user_id from site_assignees where site_id = $1`, [id]),
      loadReferences(db, id, ctx.user.id),
      loadPayments(db, id),
    ]);
    if (!client) return null;
    return { site, client, members, invites, team, assigned: assigned.map((a) => a.user_id), refs, payments };
  });
  if (!data) notFound();
  const { site, client, members, invites, team, assigned, refs, payments } = data;
  const paymentsNotice = sp.payments === 'connected' ? { ok: true, text: 'Razorpay connected. The tokens are stored encrypted.' }
    : typeof sp.payments_error === 'string' ? { ok: false, text: sp.payments_error.slice(0, 200) } : null;
  const st = statusOf(site.status);
  const kits = manifest();
  const areaLabel = (keys: string[]) => keys.map((k) => label(CLIENT_AREAS, k)).join(', ');

  return (
    <div className="max-w-4xl space-y-6">
      <p className="text-sm"><Link className="text-muted underline" href="/studio">← Projects</Link></p>
      <PageHeader
        eyebrow={`${client.name}${client.city ? ` · ${client.city}` : ''}`}
        title={site.name}
        description={`Created ${formatDate(site.created_at)}`}
        action={<Badge tone={st.tone}>{st.label}</Badge>}
      />
      {created && <Notice tone="good">Project created. Next, invite the business owner so they can log in to their admin.</Notice>}
      {kitUpdated && <Notice tone="good">Kit version updated. The website uses it from its next publish.</Notice>}
      {site.archived_at && <Notice>This project is archived. Restore it at the bottom of this page.</Notice>}

      <Card>
        <CardTitle title="Website settings" />
        <ActionForm action={updateProject} submitLabel="Save settings">
          <input type="hidden" name="id" value={site.id} />
          <ProjectFields defaults={site} />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Status" htmlFor="status">
              <Select id="status" name="status" defaultValue={site.archived_at ? 'draft' : site.status}>
                {SITE_STATUSES.filter((s) => s.key !== 'archived').map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </Select>
            </Field>
            <Field label="Short name" htmlFor="slug" hint="Used in preview links. Lowercase letters, numbers and dashes.">
              <Input id="slug" name="slug" defaultValue={site.slug} maxLength={60} pattern="[a-z0-9\-]+" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Domain" htmlFor="primary_domain" hint="The client’s own web address, e.g. mithaimarket.in. Connecting it comes with the launch tools.">
                <Input id="primary_domain" name="primary_domain" defaultValue={site.primary_domain ?? ''} placeholder="example.in" maxLength={200} />
              </Field>
            </div>
          </div>
        </ActionForm>
      </Card>

      <ReferencesCard siteId={site.id} refs={refs} canRemoveAll audience="agency" />

      <div id="payments">
        <PaymentsCard siteId={site.id} data={payments} back={`/studio/projects/${site.id}#payments`} connectAvailable={!!razorpayConnectConfig()} notice={paymentsNotice} />
      </div>

      <Card>
        <CardTitle title="Kits" description="The motion and commerce libraries this website is built on. It stays on these versions until the agency owner upgrades it." />
        <ul className="grid gap-3 sm:grid-cols-2" aria-label="Kit versions">
          {KIT_NAMES.map((k) => {
            const current = k === 'motion' ? site.motion_kit_version : site.commerce_kit_version;
            const latest = kits[k].latest;
            const behind = compareVersions(latest, current) > 0;
            return (
              <li key={k} className="rounded-xl border border-line p-4">
                <p className="text-sm text-muted">{KIT_LABELS[k]}</p>
                <p className="font-display text-2xl text-brand">{current}</p>
                {behind ? (
                  <Link className="mt-2 inline-block text-sm font-semibold text-primary underline" href={`/studio/projects/${site.id}/kits?kit=${k}&to=${latest}`}>{latest} available — compare & upgrade</Link>
                ) : (
                  <p className="mt-2 flex flex-wrap gap-x-3 text-sm"><span className="text-good">Up to date</span><Link className="text-primary underline" href={`/studio/projects/${site.id}/kits?kit=${k}`}>Compare versions</Link></p>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <CardTitle title="Client details" description="Shared by all of this client’s projects." />
        <ActionForm action={updateClient} submitLabel="Save client details">
          <input type="hidden" name="client_id" value={client.id} />
          <ClientFields defaults={client} />
        </ActionForm>
      </Card>

      <Card>
        <CardTitle title="Client logins" description="People from the business who can log in to their own admin panel. They only ever see this client’s websites." />
        {members.length > 0 ? (
          <ul className="mb-6 divide-y divide-line rounded-xl border border-line" aria-label="Client logins">
            {members.map((m) => (
              <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{m.full_name || m.email}</p>
                  <p className="truncate text-sm text-muted">{m.email} · {m.role === 'client_owner' ? 'Business owner' : `Staff: ${areaLabel(m.permissions)}`}</p>
                </div>
                <ActionForm action={removeClientUser} submitLabel="Remove" variant="ghost" className="flex items-center gap-2" confirm={`Remove ${m.email}'s login?`}>
                  <input type="hidden" name="client_id" value={client.id} />
                  <input type="hidden" name="user_id" value={m.user_id} />
                </ActionForm>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-6 text-sm text-muted">No one from the business can log in yet.</p>
        )}
        {invites.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-2 text-sm font-medium">Waiting to be accepted</h3>
            <ul className="divide-y divide-line rounded-xl border border-line">
              {invites.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{i.email}</p>
                    <p className="text-xs text-muted">{i.client_role === 'client_owner' ? 'Business owner' : `Staff: ${areaLabel(i.permissions)}`} · expires {formatDate(i.expires_at)}</p>
                  </div>
                  <ActionForm action={revokeInvitation} submitLabel="Cancel invite" variant="ghost" className="flex items-center gap-2">
                    <input type="hidden" name="id" value={i.id} />
                  </ActionForm>
                </li>
              ))}
            </ul>
          </div>
        )}
        <h3 className="mb-3 text-sm font-medium">Invite someone</h3>
        <InviteClientForm action={inviteClientUser} clientId={client.id} areas={CLIENT_AREAS} />
      </Card>

      <Card>
        <CardTitle title="Project team" description="Who in your agency is working on this. Everyone in your agency can still open it." />
        <ActionForm action={setAssignees} submitLabel="Save team">
          <input type="hidden" name="id" value={site.id} />
          <div className="grid gap-2 sm:grid-cols-2">
            {team.map((t) => (
              <label key={t.user_id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="assignees" value={t.user_id} defaultChecked={assigned.includes(t.user_id)} /> {t.name}
              </label>
            ))}
          </div>
        </ActionForm>
      </Card>

      <Card className="border-bad/30">
        <CardTitle
          title={site.archived_at ? 'Restore project' : 'Archive project'}
          description={site.archived_at
            ? 'Brings the project back to the dashboard as a draft.'
            : 'Hides the project from the dashboard and takes its website offline. Nothing is deleted, and you can restore it any time.'}
        />
        <ActionForm
          action={setArchived}
          submitLabel={site.archived_at ? 'Restore project' : 'Archive project'}
          variant={site.archived_at ? 'primary' : 'danger'}
          confirm={site.archived_at ? undefined : `Archive ${site.name}? Its website will go offline.`}
        >
          <input type="hidden" name="id" value={site.id} />
          <input type="hidden" name="archive" value={site.archived_at ? '0' : '1'} />
        </ActionForm>
      </Card>
    </div>
  );
}
