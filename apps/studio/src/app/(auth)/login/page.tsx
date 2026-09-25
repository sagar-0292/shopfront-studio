import Link from 'next/link';
import type { Metadata } from 'next';
import { ActionForm } from '@/components/action-form';
import { Field, Input, Notice } from '@/components/ui';
import { loginWithPassword, sendLoginLink } from '../actions';
import { safeNext } from '@/lib/urls';

export const metadata: Metadata = { title: 'Log in' };

const linkErrors: Record<string, string> = {
  link: 'That login link has expired or was already used. Please ask for a new one below.',
};

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const error = typeof sp.error === 'string' ? linkErrors[sp.error] ?? linkErrors.link : null;
  const q = next !== '/' ? `?next=${encodeURIComponent(next)}` : '';
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-5xl text-brand">Welcome back</h1>
        <p className="mt-2 text-muted">Log in to your studio or your business admin.</p>
      </div>
      {error && <Notice tone="bad">{error}</Notice>}

      <ActionForm action={loginWithPassword} submitLabel="Log in" pendingLabel="Logging in…">
        <input type="hidden" name="next" value={next} />
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Password" htmlFor="password" hint={<Link className="underline" href="/forgot-password">Forgot your password?</Link>}>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
      </ActionForm>

      <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>

      <ActionForm action={sendLoginLink} submitLabel="Email me a login link" pendingLabel="Sending…" variant="ghost">
        <input type="hidden" name="next" value={next} />
        <Field label="Email" htmlFor="link-email" hint="No password needed — we’ll send a one-time link.">
          <Input id="link-email" name="email" type="email" autoComplete="email" required />
        </Field>
      </ActionForm>

      <p className="text-sm text-muted">
        New here? <Link className="font-medium text-ink underline" href={`/signup${q}`}>Create an account</Link>
      </p>
    </div>
  );
}
