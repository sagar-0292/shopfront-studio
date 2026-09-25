import Link from 'next/link';
import type { ReactNode } from 'react';
import { NavLinks, type NavItem } from './nav';

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
      <aside className="border-b border-line bg-paper px-4 pt-4 lg:sticky lg:top-0 lg:h-dvh lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r lg:p-6 lg:flex lg:flex-col">
        <div className="flex items-center justify-between gap-3 lg:block">
          <Link href="/" className="block">
            <span className="font-display text-2xl leading-none">Shopfront</span>
            <span className="ml-1 text-xs uppercase tracking-[0.2em] text-muted">{area}</span>
          </Link>
          <div className="lg:hidden">
            <Link href="/account" className="text-sm text-muted underline">Account</Link>
          </div>
        </div>
        {switcher && <div className="mt-4">{switcher}</div>}
        <div className="py-3 lg:mt-8 lg:flex-1">
          <NavLinks items={items} />
        </div>
        <div className="hidden border-t border-line pt-4 text-sm lg:block">
          <Link href="/account" className="block truncate text-muted hover:text-ink">{userLabel}</Link>
          <form action="/auth/signout" method="post">
            <button className="mt-2 text-muted underline hover:text-ink">Log out</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-12 lg:py-12">{children}</main>
    </div>
  );
}
