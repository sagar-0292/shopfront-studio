import Link from 'next/link';
import type { ReactNode } from 'react';
import { NavLinks, type NavItem } from './nav';

export function Logo({ area }: { area?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-accent font-display text-lg text-brand">S</span>
      <span className="leading-none">
        <span className="font-display block text-lg">Shopfront</span>
        {area && <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">{area}</span>}
      </span>
    </span>
  );
}

export function AppShell({
  area,
  items,
  userLabel,
  switcher,
  children,
}: {
  area: string;
  items: NavItem[];
  userLabel: string;
  switcher?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="relative overflow-hidden bg-brand px-4 pt-4 text-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-64 lg:shrink-0 lg:flex-col lg:p-6">
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-accent/15 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-primary/40 blur-3xl" />
        <div className="relative flex items-center justify-between gap-3 lg:block">
          <Link href="/" className="block"><Logo area={area} /></Link>
          <Link href="/account" className="text-sm text-white/75 underline decoration-white/30 lg:hidden">Account</Link>
        </div>
        {switcher && <div className="relative mt-4 text-white/90">{switcher}</div>}
        <div className="relative py-3 lg:mt-8 lg:flex-1">
          <NavLinks items={items} />
        </div>
        <div className="relative hidden border-t border-white/10 pt-4 text-sm lg:block">
          <Link href="/account" className="flex items-center gap-3 text-white/80 hover:text-white">
            <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-semibold">
              {userLabel.slice(0, 1).toUpperCase()}
            </span>
            <span className="truncate">{userLabel}</span>
          </Link>
          <form action="/auth/signout" method="post">
            <button className="mt-3 text-white/60 underline decoration-white/20 hover:text-white">Log out</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-12 lg:py-12">{children}</main>
    </div>
  );
}
