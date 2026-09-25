import Link from 'next/link';
import { Logo } from '@/components/studio/shell';

export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-brand p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="pointer-events-none absolute -right-32 -top-32 size-[30rem] rounded-full bg-primary/60 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-24 size-[28rem] rounded-full bg-accent/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute bottom-1/3 right-1/4 size-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <Link href="/" className="relative"><Logo area="Studio" /></Link>
        <div className="relative">
          <p className="font-display text-6xl leading-[0.98] xl:text-7xl">
            Award-winning websites <span className="text-accent">for every</span> Indian shop.
          </p>
          <p className="mt-6 max-w-md text-lg text-white/70">
            AI agents do the heavy lifting. Your team approves. Every client gets a simple admin for products, orders and bookings.
          </p>
        </div>
        <p className="relative flex gap-4 text-xs text-white/60">
          <span>● Data stored in India</span><span>● DPDP-ready</span><span>● Made in Mumbai</span>
        </p>
      </section>
      <section className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-10 inline-block rounded-xl bg-brand px-3 py-2 text-white lg:hidden"><Logo /></Link>
          {children}
        </div>
      </section>
    </main>
  );
}
