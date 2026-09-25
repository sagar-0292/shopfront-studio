import type { Metadata } from 'next';
import Link from 'next/link';
import { ActionForm } from '@/components/action-form';
import { ButtonLink, Card, Field, Input, Notice } from '@/components/ui';
import { getContext } from '@/lib/context';
import { withAnon } from '@/lib/db';
import { acceptInvitation } from './actions';

export const metadata: Metadata = { title: 'Invitation' };

type Preview = {
  kind: 'agency' | 'client' | 'seller';
  email: string;
  organisation_name: string;
  client_name: string | null;
  seller_name: string | null;
  invited_by_name: string | null;
  role: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
};

const roleNames: Record<string, string> = {
  owner: 'an owner',
  team: 'a team member',
  client_owner: 'the business owner',
  client_staff: 'a staff member',
  seller: 'a seller',
};

export default async function InvitePage({ params }: PageProps<'/invite/[token]'>) {
  const { token } = await params;
  const invite = /^[0-9a-f]{48}$/.test(token)
    ? await withAnon((db) => db.one<Preview>(`select * from invitation_preview($1)`, [token]))
    : null;
  const ctx = await getContext();
  const here = `/invite/${token}`;

  if (!invite) {
    return (
      <Shell>
        <h1 className="font-display text-5xl text-brand">Invitation not found</h1>
        <p className="mt-3 text-muted">This link isn’t valid. Please check you copied the whole link, or ask for a new invitation.</p>
      </Shell>
    );
  }

  const where =
    invite.kind === 'agency' ? invite.organisation_name
    : invite.kind === 'client' ? `${invite.client_name}’s website admin`
    : `${invite.seller_name} (seller)`;

  return (
    <Shell>
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">Invitation</p>
      <h1 className="mt-2 font-display text-5xl text-brand leading-tight">Join {where}</h1>
      <p className="mt-3 text-muted">
        {invite.invited_by_name ?? 'Someone'} invited <strong className="text-ink">{invite.email}</strong> to join as {roleNames[invite.role] ?? invite.role}.
      </p>

      <Card className="mt-8">
        {invite.status !== 'pending' ? (
          <Notice tone="bad">
            {invite.status === 'accepted' && 'This invitation has already been used. Log in to continue.'}
            {invite.status === 'expired' && 'This invitation has expired. Please ask for a new one.'}
            {invite.status === 'revoked' && 'This invitation was cancelled. Please ask for a new one.'}
          </Notice>
        ) : !ctx ? (
          <div className="space-y-4">
            <p className="text-sm">First, log in or create an account using <strong>{invite.email}</strong>.</p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href={`/signup?next=${encodeURIComponent(here)}&email=${encodeURIComponent(invite.email)}`}>Create account</ButtonLink>
              <ButtonLink variant="ghost" href={`/login?next=${encodeURIComponent(here)}`}>I already have one</ButtonLink>
            </div>
          </div>
        ) : ctx.user.email.toLowerCase() !== invite.email.toLowerCase() ? (
          <div className="space-y-4">
            <Notice tone="bad">
              You’re logged in as {ctx.user.email}, but this invitation is for {invite.email}.
            </Notice>
            <form action="/auth/signout" method="post">
              <button className="text-sm underline">Log out and switch account</button>
            </form>
          </div>
        ) : (
          <ActionForm action={acceptInvitation} submitLabel="Accept invitation" pendingLabel="Joining…" variant="accent">
            <input type="hidden" name="token" value={token} />
            {!ctx.profile.full_name && (
              <Field label="Your name" htmlFor="full_name">
                <Input id="full_name" name="full_name" autoComplete="name" required maxLength={120} />
              </Field>
            )}
          </ActionForm>
        )}
      </Card>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-16">
      <Link href="/" className="mb-10 block text-sm font-medium">Shopfront Studio</Link>
      {children}
    </main>
  );
}
