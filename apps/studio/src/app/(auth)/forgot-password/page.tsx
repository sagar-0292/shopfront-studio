import Link from 'next/link';
import type { Metadata } from 'next';
import { ActionForm } from '@/components/action-form';
import { Field, Input } from '@/components/ui';
import { sendPasswordReset } from '../actions';

export const metadata: Metadata = { title: 'Reset password' };

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-5xl text-brand">Forgot password?</h1>
        <p className="mt-2 text-muted">Enter your email and we’ll send you a link to choose a new one.</p>
      </div>
      <ActionForm action={sendPasswordReset} submitLabel="Send reset link" pendingLabel="Sending…">
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
      </ActionForm>
      <p className="text-sm"><Link className="underline" href="/login">Back to log in</Link></p>
    </div>
  );
}
