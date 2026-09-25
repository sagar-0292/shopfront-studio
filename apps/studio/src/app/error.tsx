'use client';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4">
      <p className="font-display text-6xl text-brand">Something went wrong</p>
      <p className="mt-4 text-muted">Sorry — this page couldn’t load. Please try again. If it keeps happening, tell your agency.</p>
      <button onClick={reset} className="mt-8 self-start rounded-full bg-primary px-5 py-3 text-sm text-white">Try again</button>
    </main>
  );
}
