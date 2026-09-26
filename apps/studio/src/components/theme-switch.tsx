'use client';

import { useState } from 'react';
import { cx } from '@/components/ui';
import { THEME_COOKIE, type Theme } from '@/lib/theme';

const OPTIONS: { value: Theme; label: string }[] = [
  { value: 'system', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

function applyTheme(t: Theme) {
  document.cookie = `${THEME_COOKIE}=${t}; path=/; max-age=31536000; samesite=lax`;
  const root = document.documentElement;
  if (t === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', t);
}

// Remembered in a cookie so the next page is drawn in the right theme straight away.
export function ThemeSwitch({ initial, onChrome = false }: { initial: Theme; onChrome?: boolean }) {
  const [theme, setTheme] = useState(initial);
  const choose = (t: Theme) => {
    setTheme(t);
    applyTheme(t);
  };
  return (
    <div role="radiogroup" aria-label="Appearance" className={cx('inline-flex rounded-full border p-1', onChrome ? 'border-white/15 bg-white/5' : 'border-line bg-card')}>
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={theme === o.value}
          onClick={() => choose(o.value)}
          className={cx(
            'min-h-9 rounded-full px-3 text-xs font-medium transition-colors',
            theme === o.value
              ? onChrome ? 'bg-white/15 text-white' : 'bg-primary text-on-primary'
              : onChrome ? 'text-white/70 hover:text-white' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
