import Link from 'next/link';

export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-ink p-12 text-paper lg:flex lg:flex-col lg:justify-between">
        <Link href="/" className="text-sm font-medium tracking-wide">Shopfront Studio</Link>
        <div>
          <p className="font-display text-7xl leading-[0.95]">
            Award-winning websites
            <br />
            <em className="text-accent">for every</em> Indian shop.
          </p>
          <p className="mt-6 max-w-md text-paper/60">
            AI agents do the heavy lifting. Your team approves. Every client gets a simple admin for products, orders and bookings.
          </p>
        </div>
        <p className="text-xs text-paper/40">Data stored in India · DPDP-ready</p>
        <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 size-[34rem] rounded-full bg-accent/25 blur-3xl" />
      </section>
      <section className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-10 block text-sm font-medium lg:hidden">Shopfront Studio</Link>
          {children}
        </div>
      </section>
    </main>
  );
}
