import type { Metadata } from 'next';
import Link from 'next/link';
import { ActionForm } from '@/components/action-form';
import { Field, Input } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { setNewPassword } from '@/app/(auth)/actions';

export const metadata: Metadata = { title: 'Choose a new password' };

export default async function ResetPasswordPage() {
  await requireUser('/auth/reset-password');
  return (
    <main className="mx-auto w-full max-w-sm px-4 py-16">
      <h1 className="font-display text-5xl">Choose a new password</h1>
      <div className="mt-8">
        <ActionForm action={setNewPassword} submitLabel="Save new password" footer={<Link href="/" className="text-sm underline">Continue</Link>}>
          <Field label="New password" htmlFor="password" hint="At least 8 characters, with letters and numbers.">
            <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
          </Field>
          <Field label="Type it again" htmlFor="confirm">
            <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
          </Field>
        </ActionForm>
      </div>
    </main>
  );
}
