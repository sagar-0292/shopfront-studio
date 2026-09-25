import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

const buttonStyles = {
  primary: 'bg-primary text-white shadow-sm shadow-primary/25 hover:bg-primary-hover',
  accent: 'bg-accent text-brand font-semibold shadow-sm shadow-accent/40 hover:brightness-105',
  ghost: 'bg-card text-ink border border-line hover:border-primary/40 hover:text-primary',
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
  'w-full rounded-xl border border-line bg-card px-4 min-h-11 text-base sm:text-sm text-ink placeholder:text-muted/70 transition focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none';

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
  return <section className={cx('rounded-2xl border border-line bg-card p-5 shadow-[0_1px_2px_rgba(20,19,46,0.04)] sm:p-6', className)} {...p} />;
}

export function CardTitle({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-brand">{title}</h2>
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
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>}
        <h1 className="font-display mt-2 break-words text-4xl leading-[1.05] text-brand sm:text-5xl">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-muted">{description}</p>}
      </div>
      {action}
    </header>
  );
}

const badgeTones = {
  neutral: ['bg-ink/5 text-ink', 'bg-muted'],
  good: ['bg-good/10 text-good', 'bg-good'],
  warn: ['bg-accent-soft text-warn', 'bg-accent'],
  bad: ['bg-bad/10 text-bad', 'bg-bad'],
  accent: ['bg-primary/10 text-primary', 'bg-primary'],
} as const;
export function Badge({ tone = 'neutral', dot = true, children }: { tone?: keyof typeof badgeTones; dot?: boolean; children: ReactNode }) {
  const [box, bullet] = badgeTones[tone];
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', box)}>
      {dot && <span aria-hidden className={cx('size-1.5 rounded-full', bullet)} />}
      {children}
    </span>
  );
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
    <div className="rounded-2xl border border-dashed border-primary/25 bg-card/60 px-6 py-14 text-center">
      <p className="font-display text-3xl text-brand">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-muted">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
