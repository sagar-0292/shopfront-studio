'use server';

import { revalidatePath } from 'next/cache';
import { requireAgency } from '@/lib/context';
import { withUser } from '@/lib/db';
import { safe, text, UserError } from '@/lib/action';

export const updateAgency = safe(async (form) => {
  const { ctx, agency } = await requireAgency();
  const name = text(form, 'name', { required: true, label: 'the agency name', max: 120 });
  if (name.length < 2) throw new UserError('The agency name needs at least 2 characters.');
  const r = await withUser(ctx.user, (db) => db.query(`update organisations set name = $2 where id = $1 returning id`, [agency.organisation_id, name]));
  if (!r.length) throw new UserError('Only an agency owner can change these settings.');
  revalidatePath('/studio', 'layout');
  return { ok: true, message: 'Agency settings saved.' };
});
