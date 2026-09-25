import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createSupabase } from '@/lib/supabase/server';

export type SessionUser = { id: string; email: string };

/** The logged-in person, verified with the login server. Null if logged out. */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createSupabase();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return { id: data.claims.sub, email: String(data.claims.email ?? '') };
});

export async function requireUser(next?: string): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : '/login');
  return user;
}
