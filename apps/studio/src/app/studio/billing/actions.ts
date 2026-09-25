'use server';

import { revalidatePath } from 'next/cache';
import { requireAgency } from '@/lib/context';
import { withUser } from '@/lib/db';
import { optional, safe, text, UserError } from '@/lib/action';
import { normaliseGstin } from '@/lib/phone';
import { cleanEmail } from '@/lib/invites';

export const updateBilling = safe(async (form) => {
  const { ctx, agency } = await requireAgency();
  const gstin = normaliseGstin(optional(form, 'gstin', { max: 20 }));
  const email = optional(form, 'billing_email', { max: 200 });
  const r = await withUser(ctx.user, (db) =>
    db.query(
      `update organisation_billing set legal_name = $2, gstin = $3, billing_email = $4, address = $5, state_code = $6
       where organisation_id = $1 returning organisation_id`,
      [agency.organisation_id, text(form, 'legal_name', { label: 'legal name', max: 200 }), gstin,
       email ? cleanEmail(email) : null, text(form, 'address', { label: 'address', max: 500 }), gstin ? gstin.slice(0, 2) : null],
    ),
  );
  if (!r.length) throw new UserError('Only an agency owner can change billing details.');
  revalidatePath('/studio/billing');
  return { ok: true, message: 'Billing details saved.' };
});
