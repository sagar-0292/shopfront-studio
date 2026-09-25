import type { Metadata, Viewport } from 'next';
import { Inter, Instrument_Serif } from 'next/font/google';
import './globals.css';
import { Hydrated } from '@/components/hydrated';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });
const display = Instrument_Serif({ variable: '--font-display-serif', subsets: ['latin'], weight: '400' });

export const metadata: Metadata = {
  title: { default: 'Shopfront Studio', template: '%s · Shopfront Studio' },
  description: 'Create, launch and run premium websites for Indian businesses.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: '#f7f4ee', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en-IN" className={`${inter.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <Hydrated />
      </body>
    </html>
  );
}
