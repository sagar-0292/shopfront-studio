import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

const buttonStyles = {
  primary: 'bg-ink text-paper hover:bg-ink/85',
  accent: 'bg-accent text-accent-ink hover:bg-accent/90',
  ghost: 'bg-transparent text-ink hover:bg-ink/5 border border-line',
  danger: 'bg-bad text-white hover:bg-bad/90',
};
export type ButtonVariant = keyof typeof buttonStyles;

export function buttonClass(variant: ButtonVariant = 'primary', extra?: string) {
  return cx(
    'inline-flex items-center justify-center gap-2 rounded-full px-5 min-h-11 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap',
    buttonStyles[variant],
    extra,
  );
}

export function Button({ variant = 'primary', className, ...p }: ComponentProps<'button'> & { variant?: ButtonVariant }) {
  return <button className={buttonClass(variant, className)} {...p} />;
}

export function ButtonLink({ variant = 'primary', className, ...p }: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={buttonClass(variant, className)} {...p} />;
}

const inputClass =
  'w-full rounded-xl border border-line bg-card px-4 min-h-11 text-base sm:text-sm text-ink placeholder:text-muted/70 focus:border-ink focus:outline-none';

export function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Input({ className, ...p }: ComponentProps<'input'>) {
  return <input className={cx(inputClass, className)} {...p} />;
}

export function Select({ className, ...p }: ComponentProps<'select'>) {
  return <select className={cx(inputClass, 'appearance-none pr-10', className)} {...p} />;
}

export function Textarea({ className, ...p }: ComponentProps<'textarea'>) {
  return <textarea className={cx(inputClass, 'py-3 min-h-24', className)} {...p} />;
}

export function Card({ className, ...p }: ComponentProps<'section'>) {
  return <section className={cx('rounded-2xl border border-line bg-card p-5 sm:p-6', className)} {...p} />;
}

export function CardTitle({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">{eyebrow}</p>}
        <h1 className="font-display text-4xl leading-none sm:text-5xl mt-2 break-words">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-muted">{description}</p>}
      </div>
      {action}
    </header>
  );
}

const badgeTones = {
  neutral: 'bg-ink/5 text-ink',
  good: 'bg-good/10 text-good',
  warn: 'bg-warn/10 text-warn',
  bad: 'bg-bad/10 text-bad',
  accent: 'bg-accent/10 text-accent',
};
export function Badge({ tone = 'neutral', children }: { tone?: keyof typeof badgeTones; children: ReactNode }) {
  return <span className={cx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', badgeTones[tone])}>{children}</span>;
}

export function Notice({ tone = 'neutral', children, role }: { tone?: 'neutral' | 'good' | 'bad'; children: ReactNode; role?: string }) {
  const styles = { neutral: 'border-line bg-card', good: 'border-good/30 bg-good/5 text-good', bad: 'border-bad/30 bg-bad/5 text-bad' };
  return (
    <div role={role ?? (tone === 'bad' ? 'alert' : 'status')} className={cx('rounded-xl border px-4 py-3 text-sm', styles[tone])}>
      {children}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center">
      <p className="font-display text-3xl">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-muted">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
