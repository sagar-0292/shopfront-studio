import type { Metadata, Viewport } from 'next';
import { Inter, Bricolage_Grotesque } from 'next/font/google';
import './globals.css';
import { cookies } from 'next/headers';
import { Hydrated } from '@/components/hydrated';
import { readTheme, THEME_COOKIE } from '@/lib/theme';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });
const display = Bricolage_Grotesque({ variable: '--font-bricolage', subsets: ['latin'] });

export const metadata: Metadata = {
  title: { default: 'Shopfront Studio', template: '%s · Shopfront Studio' },
  description: 'Create, launch and run premium websites for Indian businesses.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [{ media: '(prefers-color-scheme: light)', color: '#1e1b4b' }, { media: '(prefers-color-scheme: dark)', color: '#121033' }],
  width: 'device-width', initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const theme = readTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html lang="en-IN" data-theme={theme === 'system' ? undefined : theme} className={`${inter.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <Hydrated />
      </body>
    </html>
  );
}
