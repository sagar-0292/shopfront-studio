import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getUser, requireUser, type SessionUser } from '@/lib/auth';
import { withUser } from '@/lib/db';

export type AgencyMembership = { organisation_id: string; name: string; slug: string; role: 'owner' | 'team' };
export type ClientMembership = { client_id: string; client_name: string; organisation_id: string; role: 'client_owner' | 'client_staff'; permissions: string[] };
export type SellerMembership = { seller_id: string; seller_name: string; site_id: string; site_name: string };

export type Context = {
  user: SessionUser;
  profile: { full_name: string; email: string; phone: string | null };
  agencies: AgencyMembership[];
  clients: ClientMembership[];
  sellers: SellerMembership[];
};

export const ORG_COOKIE = 'sf_org';

/** Everything the logged-in person belongs to. */
export const getContext = cache(async (): Promise<Context | null> => {
  const user = await getUser();
  if (!user) return null;
  return withUser(user, async (db) => {
    const [profile, agencies, clients, sellers] = await Promise.all([
      db.one<Context['profile']>(`select full_name, email, phone from profiles where id = $1`, [user.id]),
      db.query<AgencyMembership>(
        `select m.organisation_id, o.name, o.slug, m.role from organisation_members m
         join organisations o on o.id = m.organisation_id where m.user_id = $1 order by o.name`,
        [user.id],
      ),
      db.query<ClientMembership>(
        `select m.client_id, c.name as client_name, m.organisation_id, m.role, m.permissions from client_members m
         join clients c on c.id = m.client_id where m.user_id = $1 order by c.name`,
        [user.id],
      ),
      db.query<SellerMembership>(
        `select m.seller_id, s.name as seller_name, m.site_id, st.name as site_name from seller_members m
         join sellers s on s.id = m.seller_id join sites st on st.id = m.site_id where m.user_id = $1 order by s.name`,
        [user.id],
      ),
    ]);
    return {
      user,
      profile: profile ?? { full_name: '', email: user.email, phone: null },
      agencies,
      clients,
      sellers,
    };
  });
});

/** Where should this person land after logging in? */
export function homeFor(ctx: Context): string {
  if (ctx.agencies.length) return '/studio';
  if (ctx.clients.length) return '/admin';
  if (ctx.sellers.length) return '/seller';
  return '/onboarding';
}

/** The agency the person is working in right now (for agency pages). */
export const requireAgency = cache(async () => {
  await requireUser('/studio');
  const ctx = (await getContext())!;
  if (!ctx.agencies.length) redirect(homeFor(ctx));
  const chosen = (await cookies()).get(ORG_COOKIE)?.value;
  const agency = ctx.agencies.find((a) => a.organisation_id === chosen) ?? ctx.agencies[0];
  return { ctx, agency, isOwner: agency.role === 'owner' };
});

export async function requireAgencyOwner() {
  const a = await requireAgency();
  if (!a.isOwner) notFound();
  return a;
}
