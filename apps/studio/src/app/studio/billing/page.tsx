import type { Metadata } from 'next';
import { ActionForm } from '@/components/action-form';
import { Card, CardTitle, EmptyState, Field, Input, PageHeader, Textarea } from '@/components/ui';
import { requireAgency } from '@/lib/context';
import { withUser } from '@/lib/db';
import { updateBilling } from './actions';

export const metadata: Metadata = { title: 'Billing' };

export default async function BillingPage() {
  const { ctx, agency, isOwner } = await requireAgency();
  if (!isOwner) {
    return (
      <EmptyState title="Billing is for owners">
        Only an agency owner can see billing. If you need something changed, ask the owner of {agency.name}.
      </EmptyState>
    );
  }
  const billing = await withUser(ctx.user, (db) =>
    db.one<{ legal_name: string; gstin: string | null; billing_email: string | null; address: string; plan: string }>(
      `select legal_name, gstin, billing_email, address, plan from organisation_billing where organisation_id = $1`, [agency.organisation_id]),
  );
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader eyebrow={agency.name} title="Billing" description="Only owners can see this page." />
      <Card>
        <CardTitle title="Invoice details" description="These appear on the invoices you send your clients. Subscriptions and automatic invoices arrive in a later phase." />
        <ActionForm action={updateBilling}>
          <Field label="Legal business name" htmlFor="legal_name">
            <Input id="legal_name" name="legal_name" defaultValue={billing?.legal_name} maxLength={200} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="GSTIN" htmlFor="gstin" hint="Your state is worked out from it.">
              <Input id="gstin" name="gstin" defaultValue={billing?.gstin ?? ''} maxLength={20} className="uppercase" />
            </Field>
            <Field label="Billing email" htmlFor="billing_email">
              <Input id="billing_email" name="billing_email" type="email" defaultValue={billing?.billing_email ?? ''} maxLength={200} />
            </Field>
          </div>
          <Field label="Registered address" htmlFor="address">
            <Textarea id="address" name="address" defaultValue={billing?.address} maxLength={500} />
          </Field>
        </ActionForm>
      </Card>
    </div>
  );
}
