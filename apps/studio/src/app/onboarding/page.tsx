import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ActionForm } from '@/components/action-form';
import { Card, Field, Input } from '@/components/ui';
import { getContext, homeFor } from '@/lib/context';
import { withUser } from '@/lib/db';
import { createAgency } from './actions';

export const metadata: Metadata = { title: 'Welcome' };

export default async function OnboardingPage() {
  const ctx = await getContext();
  if (!ctx) redirect('/login');
  const home = homeFor(ctx);
  if (home !== '/onboarding') redirect(home);
  const open = await withUser(ctx.user, async (db) => (await db.one<{ open: boolean }>(`select agency_signup_open() as open`))?.open);

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-16">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">Shopfront Studio</p>
      <h1 className="mt-2 font-display text-5xl text-brand">Welcome{ctx.profile.full_name ? `, ${ctx.profile.full_name.split(' ')[0]}` : ''}</h1>
      {open ? (
        <Card className="mt-8">
          <h2 className="text-lg font-semibold">Set up your agency workspace</h2>
          <p className="mt-1 mb-6 text-sm text-muted">You’ll be its owner. You can invite your team afterwards.</p>
          <ActionForm action={createAgency} submitLabel="Create workspace" pendingLabel="Creating…">
            <Field label="Your name" htmlFor="full_name">
              <Input id="full_name" name="full_name" defaultValue={ctx.profile.full_name} autoComplete="name" maxLength={120} />
            </Field>
            <Field label="Agency name" htmlFor="name" hint="For example: Mumbai Web Studio">
              <Input id="name" name="name" required minLength={2} maxLength={120} />
            </Field>
          </ActionForm>
        </Card>
      ) : (
        <Card className="mt-8">
          <h2 className="text-lg font-semibold">You don’t have access to anything yet</h2>
          <p className="mt-2 text-sm text-muted">
            You’re logged in as <strong>{ctx.user.email}</strong>. To get started, ask your agency (or the business
            owner) to send you an invitation to this email address, then open the link in it.
          </p>
          <form action="/auth/signout" method="post" className="mt-6">
            <button className="text-sm underline">Log out and use a different email</button>
          </form>
        </Card>
      )}
    </main>
  );
}
