'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ORG_COOKIE, getContext } from '@/lib/context';

export async function switchAgency(form: FormData) {
  const ctx = await getContext();
  const id = String(form.get('organisation_id') ?? '');
  if (ctx?.agencies.some((a) => a.organisation_id === id)) {
    (await cookies()).set(ORG_COOKIE, id, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
  }
  redirect('/studio');
}
