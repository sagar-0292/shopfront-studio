import { redirect } from 'next/navigation';
import { AppShell } from '@/components/studio/shell';
import { requireUser } from '@/lib/auth';
import { getContext, homeFor } from '@/lib/context';

export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  await requireUser('/admin');
  const ctx = (await getContext())!;
  if (!ctx.clients.length) redirect(homeFor(ctx));
  const isOwner = ctx.clients.some((c) => c.role === 'client_owner');
  const items = [{ href: '/admin', label: 'Overview' }, ...(isOwner ? [{ href: '/admin/team', label: 'Staff' }] : [])];
  return (
    <AppShell area="Admin" items={items} userLabel={ctx.profile.full_name || ctx.user.email}>
      {children}
    </AppShell>
  );
}
