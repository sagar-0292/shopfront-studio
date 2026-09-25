import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4">
      <p className="font-display text-7xl">Not here</p>
      <p className="mt-4 text-muted">This page doesn’t exist, or you don’t have access to it.</p>
      <Link href="/" className="mt-8 underline">Go to your home page</Link>
    </main>
  );
}
