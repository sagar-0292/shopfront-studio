'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cx } from '@/components/ui';

export type NavItem = { href: string; label: string };

function isActive(href: string, path: string) {
  if (href === path) return true;
  if (href === '/studio') return path.startsWith('/studio/projects');
  if (href === '/admin' || href === '/seller') return false;
  return path.startsWith(href + '/');
}

export function NavLinks({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
      {items.map((item) => {
        const active = isActive(item.href, path);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cx(
              'whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors lg:rounded-xl',
              active ? 'bg-accent text-brand shadow-sm shadow-black/20' : 'text-white/70 hover:bg-white/10 hover:text-white',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
