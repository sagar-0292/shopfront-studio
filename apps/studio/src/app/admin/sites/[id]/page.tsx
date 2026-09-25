import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/ui';
import { getContext } from '@/lib/context';
import { withUser } from '@/lib/db';
import { loadReferences, ReferencesCard } from '@/components/site/references-card';
import { loadPayments, PaymentsCard } from '@/components/site/payments-card';
import { razorpayConnectConfig } from '@/lib/razorpay-connect';

export const metadata: Metadata = { title: 'Website settings' };

// The business owner's own settings for their website: reference links and payments.
export default async function AdminSitePage({ params, searchParams }: PageProps<'/admin/sites/[id]'>) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const ctx = (await getContext())!;
  const data = await withUser(ctx.user, async (db) => {
    const site = await db.one<{ id: string; name: string; client_id: string }>(`select id, name, client_id from sites where id = $1`, [id]);
    if (!site || !ctx.clients.some((c) => c.client_id === site.client_id && c.role === 'client_owner')) return null;
    const [refs, payments] = await Promise.all([loadReferences(db, id, ctx.user.id), loadPayments(db, id)]);
    return { site, refs, payments };
  });
  if (!data) notFound();
  const notice = sp.payments === 'connected' ? { ok: true, text: 'Razorpay connected. The tokens are stored encrypted.' }
    : typeof sp.payments_error === 'string' ? { ok: false, text: sp.payments_error.slice(0, 200) } : null;
  return (
    <div className="max-w-4xl space-y-6">
      <p className="text-sm"><Link className="text-muted underline" href="/admin">← Overview</Link></p>
      <PageHeader eyebrow="Your website" title={data.site.name} description="Websites you like, your competitors, and how your customers pay." />
      <ReferencesCard siteId={id} refs={data.refs} canRemoveAll={false} audience="client" />
      <div id="payments">
        <PaymentsCard siteId={id} data={data.payments} back={`/admin/sites/${id}#payments`} connectAvailable={!!razorpayConnectConfig()} notice={notice} />
      </div>
    </div>
  );
}
