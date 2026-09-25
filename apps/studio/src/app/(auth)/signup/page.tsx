import Link from 'next/link';
import type { Metadata } from 'next';
import { ActionForm } from '@/components/action-form';
import { Field, Input } from '@/components/ui';
import { signUp } from '../actions';
import { safeNext } from '@/lib/urls';

export const metadata: Metadata = { title: 'Create account' };

export default async function SignupPage({ searchParams }: PageProps<'/signup'>) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const email = typeof sp.email === 'string' ? sp.email : '';
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-5xl text-brand">Create your account</h1>
        <p className="mt-2 text-muted">Joining through an invitation? Use the email address the invitation was sent to.</p>
      </div>
      <ActionForm action={signUp} submitLabel="Create account" pendingLabel="Creating…">
        <input type="hidden" name="next" value={next} />
        <Field label="Your name" htmlFor="full_name">
          <Input id="full_name" name="full_name" autoComplete="name" required maxLength={120} />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" defaultValue={email} required />
        </Field>
        <Field label="Password" htmlFor="password" hint="At least 8 characters, with letters and numbers.">
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
      </ActionForm>
      <p className="text-sm text-muted">
        Already have an account? <Link className="font-medium text-ink underline" href={`/login${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`}>Log in</Link>
      </p>
    </div>
  );
}
