import type { Metadata } from 'next';
import { ActionForm } from '@/components/action-form';
import { Card, CardTitle, Field, Input, PageHeader } from '@/components/ui';
import { requireAgency } from '@/lib/context';
import { updateAgency } from './actions';

export const metadata: Metadata = { title: 'Agency settings' };

export default async function SettingsPage() {
  const { agency, isOwner } = await requireAgency();
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader eyebrow={agency.name} title="Agency settings" />
      <Card>
        <CardTitle title="Agency" description={isOwner ? undefined : 'Only an agency owner can change these.'} />
        {isOwner ? (
          <ActionForm action={updateAgency}>
            <Field label="Agency name" htmlFor="name">
              <Input id="name" name="name" defaultValue={agency.name} required minLength={2} maxLength={120} />
            </Field>
          </ActionForm>
        ) : (
          <p className="text-lg">{agency.name}</p>
        )}
      </Card>
      <Card>
        <CardTitle title="Coming in later phases" />
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          <li>Studio features (standard features added to every new site)</li>
          <li>House-style library, saved prompt snippets and per-industry rules</li>
          <li>Integrations: Razorpay, WhatsApp, Cloudflare, Shiprocket, Resend</li>
        </ul>
      </Card>
    </div>
  );
}
