import type { Metadata } from 'next';
import { Badge, Card, EmptyState, PageHeader } from '@/components/ui';
import { getContext } from '@/lib/context';
import { withUser } from '@/lib/db';
import { formatINR } from '@/lib/money';

export const metadata: Metadata = { title: 'My products' };

const statusTone = { active: 'good', draft: 'neutral', hidden: 'warn', sold_out: 'bad' } as const;
const statusLabel = { active: 'On sale', draft: 'Draft', hidden: 'Hidden', sold_out: 'Sold out' } as const;

export default async function SellerHome() {
  const ctx = (await getContext())!;
  const products = await withUser(ctx.user, (db) =>
    db.query<{ id: string; name: string; price_paise: string; mrp_paise: string | null; status: keyof typeof statusTone; seller_id: string }>(
      `select id, name, price_paise, mrp_paise, status, seller_id from products
        where seller_id = any($1::uuid[]) order by created_at desc`,
      [ctx.sellers.map((s) => s.seller_id)],
    ),
  );
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader eyebrow="Seller" title="My products" description="Adding and editing products from here arrives with the marketplace tools." />
      {ctx.sellers.map((s) => {
        const mine = products.filter((p) => p.seller_id === s.seller_id);
        return (
          <Card key={s.seller_id}>
            <h2 className="text-lg font-semibold">{s.seller_name}</h2>
            <p className="mb-4 text-sm text-muted">Selling on {s.site_name}</p>
            {mine.length === 0 ? (
              <EmptyState title="No products yet" />
            ) : (
              <ul className="divide-y divide-line rounded-xl border border-line" aria-label="Products">
                {mine.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 p-4">
                    <span className="min-w-0 truncate font-medium">{p.name}</span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="text-sm">
                        {formatINR(p.price_paise)}
                        {p.mrp_paise && Number(p.mrp_paise) > Number(p.price_paise) && <s className="ml-2 text-muted">{formatINR(p.mrp_paise)}</s>}
                      </span>
                      <Badge tone={statusTone[p.status]}>{statusLabel[p.status]}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );
      })}
    </div>
  );
}
