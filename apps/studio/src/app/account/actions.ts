'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { withUser } from '@/lib/db';
import { safe, text } from '@/lib/action';
import { normaliseIndianPhone } from '@/lib/phone';

export const updateProfile = safe(async (form) => {
  const user = await requireUser('/account');
  const fullName = text(form, 'full_name', { required: true, label: 'your name', max: 120 });
  const phone = normaliseIndianPhone(text(form, 'phone', { label: 'phone', max: 30 }));
  await withUser(user, (db) => db.query(`update profiles set full_name = $2, phone = $3 where id = $1`, [user.id, fullName, phone]));
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Your details were saved.' };
});
