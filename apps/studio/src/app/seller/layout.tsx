import { redirect } from 'next/navigation';
import { AppShell } from '@/components/studio/shell';
import { requireUser } from '@/lib/auth';
import { getContext, homeFor } from '@/lib/context';

export default async function SellerLayout({ children }: LayoutProps<'/seller'>) {
  await requireUser('/seller');
  const ctx = (await getContext())!;
  if (!ctx.sellers.length) redirect(homeFor(ctx));
  return (
    <AppShell area="Seller" items={[{ href: '/seller', label: 'My products' }]} userLabel={ctx.profile.full_name || ctx.user.email}>
      {children}
    </AppShell>
  );
}
