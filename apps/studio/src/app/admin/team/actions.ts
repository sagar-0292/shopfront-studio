'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { getContext } from '@/lib/context';
import { withUser } from '@/lib/db';
import { safe, UserError } from '@/lib/action';
import { cleanEmail, createInvite } from '@/lib/invites';

async function ownerOf(clientId: string) {
  await requireUser('/admin/team');
  const ctx = (await getContext())!;
  const m = ctx.clients.find((c) => c.client_id === clientId && c.role === 'client_owner');
  if (!m) throw new UserError('Only the business owner can manage staff logins.');
  return { ctx, m };
}

export const inviteStaff = safe(async (form) => {
  const clientId = String(form.get('client_id'));
  const { ctx, m } = await ownerOf(clientId);
  const permissions = form.getAll('permissions').map(String);
  if (!permissions.length) throw new UserError('Pick at least one area this staff member can manage.');
  const email = cleanEmail(form.get('email'));
  return withUser(ctx.user, (db) =>
    createInvite(db, {
      organisationId: m.organisation_id, kind: 'client', email, clientId, clientRole: 'client_staff', permissions,
      inviterName: ctx.profile.full_name || ctx.user.email, placeName: `${m.client_name}’s website admin`,
    }),
  );
});

export const removeStaff = safe(async (form) => {
  const clientId = String(form.get('client_id'));
  const { ctx } = await ownerOf(clientId);
  await withUser(ctx.user, (db) => db.query(`delete from client_members where client_id = $1 and user_id = $2 and role = 'client_staff'`, [clientId, form.get('user_id')]));
  revalidatePath('/admin/team');
  return { ok: true, message: 'Staff login removed.' };
});
