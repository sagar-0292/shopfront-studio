'use server';

import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { withUser } from '@/lib/db';
import { safe, text, UserError } from '@/lib/action';
import { slugify } from '@/lib/slug';

export const createAgency = safe(async (form) => {
  const user = await requireUser();
  const name = text(form, 'name', { required: true, label: 'your agency name', max: 120 });
  const fullName = text(form, 'full_name', { label: 'your name', max: 120 });
  const slug = slugify(name);
  if (slug.length < 2) throw new UserError('Please use a name with at least two letters or numbers.');
  await withUser(user, async (db) => {
    if (fullName) await db.query(`update profiles set full_name = $1 where id = $2`, [fullName, user.id]);
    await db.query(`select create_agency($1, $2)`, [name, slug]);
  });
  redirect('/studio');
});
