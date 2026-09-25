'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAgency } from '@/lib/context';
import { withUser, type Db } from '@/lib/db';
import { optional, safe, text, UserError } from '@/lib/action';
import { slugify } from '@/lib/slug';
import { LANGUAGES, SITE_STATUSES, SITE_TYPES } from '@/lib/catalog';
import { normaliseGstin, normaliseIndianPhone } from '@/lib/phone';
import { cleanEmail, createInvite } from '@/lib/invites';

function siteTypes(form: FormData) {
  const types = form.getAll('site_types').map(String).filter((t) => SITE_TYPES.some((s) => s.key === t));
  if (!types.length) throw new UserError('Please pick at least one website type.');
  return types;
}
function languages(form: FormData) {
  const langs = form.getAll('languages').map(String).filter((l) => LANGUAGES.some((x) => x.key === l));
  return langs.length ? langs : ['en'];
}
function optionalEmail(form: FormData, key: string) {
  const v = optional(form, key, { max: 200 });
  return v ? cleanEmail(v) : null;
}

async function uniqueSlug(db: Db, orgId: string, base: string, exceptId?: string) {
  const root = base || 'project';
  for (let i = 0; i < 50; i++) {
    const slug = i === 0 ? root : `${root}-${i + 1}`;
    const taken = await db.one(`select 1 from sites where organisation_id = $1 and slug = $2 and ($3::uuid is null or id <> $3)`, [orgId, slug, exceptId ?? null]);
    if (!taken) return slug;
  }
  throw new UserError('Please choose a more distinctive project name.');
}

function clientFields(form: FormData) {
  return {
    name: text(form, 'client_name', { required: true, label: 'the business name', max: 160 }),
    contact_name: text(form, 'contact_name', { label: 'contact name', max: 120 }),
    phone: normaliseIndianPhone(optional(form, 'phone', { max: 30 })),
    whatsapp: normaliseIndianPhone(optional(form, 'whatsapp', { max: 30 })),
    email: optionalEmail(form, 'email'),
    city: text(form, 'city', { label: 'city', max: 80 }),
    state: text(form, 'state', { label: 'state', max: 80 }),
    gstin: normaliseGstin(optional(form, 'gstin', { max: 20 })),
  };
}

export const createProject = safe(async (form) => {
  const { ctx, agency } = await requireAgency();
  const name = text(form, 'name', { required: true, label: 'the project name', max: 160 });
  const types = siteTypes(form);
  const langs = languages(form);
  const businessKind = text(form, 'business_kind', { label: 'the kind of business', max: 160 });
  const existingClient = String(form.get('client_id') ?? '');

  const siteId = await withUser(ctx.user, async (db) => {
    let clientId = existingClient;
    if (!clientId || clientId === 'new') {
      const c = clientFields(form);
      const row = await db.one<{ id: string }>(
        `insert into clients (organisation_id, name, contact_name, phone, whatsapp, email, city, state, gstin, created_by)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning id`,
        [agency.organisation_id, c.name, c.contact_name, c.phone, c.whatsapp, c.email, c.city, c.state, c.gstin, ctx.user.id],
      );
      clientId = row!.id;
    }
    const slug = await uniqueSlug(db, agency.organisation_id, slugify(name));
    const site = await db.one<{ id: string }>(
      `insert into sites (client_id, name, slug, site_types, business_kind, languages, created_by)
       values ($1, $2, $3, $4, $5, $6, $7) returning id`,
      [clientId, name, slug, types, businessKind, langs, ctx.user.id],
    );
    await db.query(`insert into site_assignees (site_id, user_id) values ($1, $2)`, [site!.id, ctx.user.id]);
    return site!.id;
  });
  redirect(`/studio/projects/${siteId}?created=1`);
});

export const updateProject = safe(async (form) => {
  const { ctx, agency } = await requireAgency();
  const id = String(form.get('id'));
  const name = text(form, 'name', { required: true, label: 'the project name', max: 160 });
  const status = String(form.get('status'));
  if (!SITE_STATUSES.some((s) => s.key === status) || status === 'archived') throw new UserError('Please pick a status.');
  const domainRaw = text(form, 'primary_domain', { label: 'domain', max: 200 }).toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (domainRaw && !/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(domainRaw)) throw new UserError('The domain should look like mithaimarket.in (no https:// or slashes).');
  const slugInput = slugify(text(form, 'slug', { label: 'web address', max: 60 }) || name);

  await withUser(ctx.user, async (db) => {
    const slug = await uniqueSlug(db, agency.organisation_id, slugInput, id);
    const updated = await db.query(
      `update sites set name = $2, slug = $3, status = $4, site_types = $5, business_kind = $6, languages = $7, primary_domain = $8
       where id = $1 returning id`,
      [id, name, slug, status, siteTypes(form), text(form, 'business_kind', { label: 'kind of business', max: 160 }), languages(form), domainRaw || null],
    );
    if (!updated.length) throw new UserError('This project could not be found, or you no longer have access to it.');
  });
  revalidatePath(`/studio/projects/${id}`);
  return { ok: true, message: 'Project settings saved.' };
});

export const updateClient = safe(async (form) => {
  const { ctx } = await requireAgency();
  const id = String(form.get('client_id'));
  const c = clientFields(form);
  await withUser(ctx.user, async (db) => {
    const r = await db.query(
      `update clients set name = $2, contact_name = $3, phone = $4, whatsapp = $5, email = $6, city = $7, state = $8, gstin = $9
       where id = $1 returning id`,
      [id, c.name, c.contact_name, c.phone, c.whatsapp, c.email, c.city, c.state, c.gstin],
    );
    if (!r.length) throw new UserError('This client could not be found, or you no longer have access to it.');
  });
  revalidatePath('/studio/projects/[id]', 'page');
  return { ok: true, message: 'Client details saved.' };
});

export const setArchived = safe(async (form) => {
  const { ctx } = await requireAgency();
  const id = String(form.get('id'));
  const archive = form.get('archive') === '1';
  await withUser(ctx.user, (db) =>
    db.query(`update sites set archived_at = case when $2 then now() else null end, status = case when $2 then 'archived'::site_status else 'draft'::site_status end where id = $1`, [id, archive]),
  );
  revalidatePath(`/studio/projects/${id}`);
  return { ok: true, message: archive ? 'Project archived. It’s hidden from the dashboard and its site is offline.' : 'Project restored as a draft.' };
});

export const inviteClientUser = safe(async (form) => {
  const { ctx, agency } = await requireAgency();
  const clientId = String(form.get('client_id'));
  const role = form.get('role') === 'client_staff' ? 'client_staff' : 'client_owner';
  const permissions = role === 'client_staff' ? form.getAll('permissions').map(String) : [];
  if (role === 'client_staff' && !permissions.length) throw new UserError('Pick at least one area this staff member can manage.');
  const email = cleanEmail(form.get('email'));
  return withUser(ctx.user, async (db) => {
    const client = await db.one<{ name: string }>(`select name from clients where id = $1`, [clientId]);
    if (!client) throw new UserError('This client could not be found.');
    return createInvite(db, {
      organisationId: agency.organisation_id, kind: 'client', email, clientId, clientRole: role, permissions,
      inviterName: ctx.profile.full_name || agency.name, placeName: `${client.name}’s website admin`,
    });
  });
});

export const removeClientUser = safe(async (form) => {
  const { ctx } = await requireAgency();
  await withUser(ctx.user, (db) => db.query(`delete from client_members where client_id = $1 and user_id = $2`, [form.get('client_id'), form.get('user_id')]));
  revalidatePath('/studio/projects/[id]', 'page');
  return { ok: true, message: 'Login removed.' };
});

export const setAssignees = safe(async (form) => {
  const { ctx } = await requireAgency();
  const id = String(form.get('id'));
  const wanted = form.getAll('assignees').map(String);
  await withUser(ctx.user, async (db) => {
    await db.query(`delete from site_assignees where site_id = $1 and not (user_id = any($2::uuid[]))`, [id, wanted]);
    for (const u of wanted) {
      await db.query(`insert into site_assignees (site_id, user_id) values ($1, $2) on conflict do nothing`, [id, u]);
    }
  });
  revalidatePath(`/studio/projects/${id}`);
  return { ok: true, message: 'Team for this project updated.' };
});

export const revokeInvitation = safe(async (form) => {
  const { ctx } = await requireAgency();
  await withUser(ctx.user, (db) => db.query(`update invitations set revoked_at = now() where id = $1 and accepted_at is null`, [form.get('id')]));
  revalidatePath('/studio', 'layout');
  return { ok: true, message: 'Invitation cancelled.' };
});
