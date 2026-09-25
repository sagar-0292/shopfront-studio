'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cx } from '@/components/ui';

export type NavItem = { href: string; label: string };

export function NavLinks({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="-mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
      {items.map((item) => {
        const active = item.href === path || (item.href !== '/studio' && item.href !== '/admin' && path.startsWith(item.href + '/')) ||
          (item.href === '/studio' && path.startsWith('/studio/projects'));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cx(
              'whitespace-nowrap rounded-full px-4 py-2 text-sm transition-colors lg:rounded-xl',
              active ? 'bg-ink text-paper' : 'text-muted hover:bg-ink/5 hover:text-ink',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
