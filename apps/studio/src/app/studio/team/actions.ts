'use server';

import { revalidatePath } from 'next/cache';
import { requireAgency } from '@/lib/context';
import { withUser } from '@/lib/db';
import { safe, UserError } from '@/lib/action';
import { cleanEmail, createInvite } from '@/lib/invites';

export const inviteTeamMember = safe(async (form) => {
  const { ctx, agency } = await requireAgency();
  const role = form.get('role') === 'owner' ? 'owner' : 'team';
  const email = cleanEmail(form.get('email'));
  const result = await withUser(ctx.user, (db) =>
    createInvite(db, {
      organisationId: agency.organisation_id, kind: 'agency', email, agencyRole: role,
      inviterName: ctx.profile.full_name || ctx.user.email, placeName: agency.name,
    }),
  );
  revalidatePath('/studio/team');
  return result;
});

export const changeRole = safe(async (form) => {
  const { ctx, agency } = await requireAgency();
  const role = form.get('role') === 'owner' ? 'owner' : 'team';
  const r = await withUser(ctx.user, (db) =>
    db.query(`update organisation_members set role = $3 where organisation_id = $1 and user_id = $2 returning user_id`,
      [agency.organisation_id, form.get('user_id'), role]),
  );
  if (!r.length) throw new UserError('Only an agency owner can change roles.');
  revalidatePath('/studio', 'layout');
  return { ok: true, message: 'Role updated.' };
});

export const removeMember = safe(async (form) => {
  const { ctx, agency } = await requireAgency();
  const r = await withUser(ctx.user, (db) =>
    db.query(`delete from organisation_members where organisation_id = $1 and user_id = $2 returning user_id`, [agency.organisation_id, form.get('user_id')]),
  );
  if (!r.length) throw new UserError('Only an agency owner can remove people.');
  revalidatePath('/studio/team');
  return { ok: true, message: 'Removed from your agency.' };
});
