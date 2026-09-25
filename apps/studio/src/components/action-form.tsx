'use client';

import { useActionState, useEffect, useRef, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { Button, Notice, type ButtonVariant } from '@/components/ui';
import type { ActionState } from '@/lib/action';

type Props = {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  children: ReactNode;
  submitLabel?: string;
  pendingLabel?: string;
  variant?: ButtonVariant;
  className?: string;
  resetOnSuccess?: boolean;
  confirm?: string;
  footer?: ReactNode;
};

export function SubmitButton({ label, pendingLabel, variant }: { label: string; pendingLabel?: string; variant?: ButtonVariant }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending} aria-busy={pending}>
      {pending ? (pendingLabel ?? 'Saving…') : label}
    </Button>
  );
}

/** A form that runs a server action and shows its result in plain words. */
export function ActionForm({ action, children, submitLabel = 'Save', pendingLabel, variant, className, resetOnSuccess, confirm, footer }: Props) {
  const [state, formAction] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form
      ref={ref}
      action={formAction}
      className={className ?? 'space-y-5'}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      {state.error && <Notice tone="bad">{state.error}</Notice>}
      {state.ok && state.message && <Notice tone="good">{state.message}</Notice>}
      {state.ok && state.link && <InviteLink link={state.link} email={state.email} />}
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton label={submitLabel} pendingLabel={pendingLabel} variant={variant} />
        {footer}
      </div>
    </form>
  );
}

export function InviteLink({ link, email }: { link: string; email?: string }) {
  const text = `You're invited to Shopfront Studio. Open this link to join: ${link}`;
  return (
    <div className="space-y-2 rounded-xl border border-line bg-accent-soft/60 p-4 text-sm">
      <p className="font-medium">Invitation link{email ? ` for ${email}` : ''}</p>
      <input readOnly value={link} aria-label="Invitation link" className="w-full rounded-lg border border-line bg-card px-3 py-2 text-xs" onFocus={(e) => e.currentTarget.select()} />
      <div className="flex flex-wrap gap-2">
        <button type="button" className="rounded-full border border-line bg-card px-3 py-1.5 text-xs font-medium hover:border-primary/40" onClick={() => navigator.clipboard?.writeText(link)}>
          Copy link
        </button>
        <a className="rounded-full border border-line bg-card px-3 py-1.5 text-xs font-medium hover:border-primary/40" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(text)}`}>
          Share on WhatsApp
        </a>
      </div>
      <p className="text-xs text-muted">The link works once and expires in 7 days.</p>
    </div>
  );
}
