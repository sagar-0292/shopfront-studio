import { AppShell } from '@/components/studio/shell';
import { requireAgency } from '@/lib/context';
import { switchAgency } from './actions';

export default async function StudioLayout({ children }: LayoutProps<'/studio'>) {
  const { ctx, agency, isOwner } = await requireAgency();
  const items = [
    { href: '/studio', label: 'Projects' },
    { href: '/studio/team', label: 'Team' },
    { href: '/studio/activity', label: 'Activity' },
    { href: '/studio/settings', label: 'Agency settings' },
    ...(isOwner ? [{ href: '/studio/billing', label: 'Billing' }] : []),
  ];
  const switcher =
    ctx.agencies.length > 1 ? (
      <form action={switchAgency} className="flex gap-2">
        <select name="organisation_id" defaultValue={agency.organisation_id} aria-label="Agency" className="min-w-0 flex-1 rounded-lg border border-line bg-card px-2 py-1.5 text-sm">
          {ctx.agencies.map((a) => (
            <option key={a.organisation_id} value={a.organisation_id}>{a.name}</option>
          ))}
        </select>
        <button className="rounded-lg border border-line px-3 text-sm">Switch</button>
      </form>
    ) : (
      <p className="truncate text-sm font-medium">{agency.name}</p>
    );
  return (
    <AppShell area="Studio" items={items} userLabel={ctx.profile.full_name || ctx.user.email} switcher={switcher}>
      {children}
    </AppShell>
  );
}
