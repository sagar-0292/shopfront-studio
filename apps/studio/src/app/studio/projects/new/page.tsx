import type { Metadata } from 'next';
import Link from 'next/link';
import { ActionForm } from '@/components/action-form';
import { Card, PageHeader } from '@/components/ui';
import { ClientFields, ProjectFields } from '@/components/studio/project-fields';
import { ClientPicker } from '@/components/studio/client-picker';
import { requireAgency } from '@/lib/context';
import { withUser } from '@/lib/db';
import { createProject } from '../actions';

export const metadata: Metadata = { title: 'New project' };

export default async function NewProjectPage() {
  const { ctx, agency } = await requireAgency();
  const clients = await withUser(ctx.user, (db) =>
    db.query<{ id: string; name: string }>(`select id, name from clients where organisation_id = $1 order by name`, [agency.organisation_id]),
  );
  return (
    <div className="max-w-3xl">
      <p className="mb-4 text-sm"><Link className="text-muted underline" href="/studio">← Projects</Link></p>
      <PageHeader title="New project" description="Start with the basics. The brief, brand and AI build come in the next steps." />
      <ActionForm action={createProject} submitLabel="Create project" pendingLabel="Creating…" variant="accent">
        <Card>
          <h2 className="mb-5 text-lg font-semibold">Client</h2>
          <ClientPicker clients={clients} newClientFields={<ClientFields />} />
        </Card>
        <Card>
          <h2 className="mb-5 text-lg font-semibold">Website</h2>
          <ProjectFields />
        </Card>
      </ActionForm>
    </div>
  );
}
