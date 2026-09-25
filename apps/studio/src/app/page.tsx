import { redirect } from 'next/navigation';
import { getContext, homeFor } from '@/lib/context';

export default async function Home() {
  const ctx = await getContext();
  redirect(ctx ? homeFor(ctx) : '/login');
}
