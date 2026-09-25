'use server';

import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { withUser } from '@/lib/db';
import { safe } from '@/lib/action';

const destination = { agency: '/studio', client: '/admin', seller: '/seller' } as const;

export const acceptInvitation = safe(async (form) => {
  const token = String(form.get('token') ?? '');
  const user = await requireUser(`/invite/${token}`);
  const kind = await withUser(user, async (db) => {
    const fullName = String(form.get('full_name') ?? '').trim().slice(0, 120);
    if (fullName) await db.query(`update profiles set full_name = $1 where id = $2 and full_name = ''`, [fullName, user.id]);
    return (await db.one<{ kind: keyof typeof destination }>(`select accept_invitation($1) as kind`, [token]))!.kind;
  });
  redirect(destination[kind]);
});
