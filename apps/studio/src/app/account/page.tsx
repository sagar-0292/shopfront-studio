import type { Metadata } from 'next';
import Link from 'next/link';
import { ActionForm } from '@/components/action-form';
import { Card, CardTitle, Field, Input, PageHeader } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { getContext, homeFor } from '@/lib/context';
import { setNewPassword } from '@/app/(auth)/actions';
import { updateProfile } from './actions';

export const metadata: Metadata = { title: 'Your account' };

export default async function AccountPage() {
  await requireUser('/account');
  const ctx = (await getContext())!;
  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-10">
      <p className="text-sm"><Link className="text-muted underline" href={homeFor(ctx)}>← Back</Link></p>
      <PageHeader title="Your account" description={ctx.user.email} />
      <Card>
        <CardTitle title="Your details" />
        <ActionForm action={updateProfile}>
          <Field label="Name" htmlFor="full_name">
            <Input id="full_name" name="full_name" defaultValue={ctx.profile.full_name} required maxLength={120} autoComplete="name" />
          </Field>
          <Field label="Mobile number" htmlFor="phone">
            <Input id="phone" name="phone" type="tel" defaultValue={ctx.profile.phone ?? ''} maxLength={30} autoComplete="tel" />
          </Field>
        </ActionForm>
      </Card>
      <Card>
        <CardTitle title="Change password" />
        <ActionForm action={setNewPassword} submitLabel="Change password" resetOnSuccess>
          <Field label="New password" htmlFor="password" hint="At least 8 characters, with letters and numbers.">
            <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
          </Field>
          <Field label="Type it again" htmlFor="confirm">
            <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
          </Field>
        </ActionForm>
      </Card>
      <form action="/auth/signout" method="post">
        <button className="text-sm underline">Log out</button>
      </form>
    </main>
  );
}
