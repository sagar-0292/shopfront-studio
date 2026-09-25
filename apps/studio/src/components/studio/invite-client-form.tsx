'use client';

import { useState } from 'react';
import { ActionForm } from '@/components/action-form';
import { Field, Input } from '@/components/ui';
import type { ActionState } from '@/lib/action';

type Area = { key: string; label: string };

export function InviteClientForm({
  action, clientId, areas, allowOwner = true,
}: {
  action: (p: ActionState, f: FormData) => Promise<ActionState>;
  clientId: string;
  areas: readonly Area[];
  allowOwner?: boolean;
}) {
  const [role, setRole] = useState(allowOwner ? 'client_owner' : 'client_staff');
  return (
    <ActionForm action={action} submitLabel="Create invitation" pendingLabel="Inviting…" resetOnSuccess>
      <input type="hidden" name="client_id" value={clientId} />
      <Field label="Email address" htmlFor="invite-email">
        <Input id="invite-email" name="email" type="email" required autoComplete="off" />
      </Field>
      {allowOwner ? (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Role</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { v: 'client_owner', t: 'Business owner', d: 'Everything in their admin, approves designs.' },
              { v: 'client_staff', t: 'Staff', d: 'Only the areas you choose.' },
            ].map((o) => (
              <label key={o.v} className="flex cursor-pointer gap-3 rounded-xl border border-line p-3 has-[:checked]:border-ink">
                <input type="radio" name="role" value={o.v} checked={role === o.v} onChange={() => setRole(o.v)} className="mt-1" />
                <span><span className="block text-sm font-medium">{o.t}</span><span className="text-xs text-muted">{o.d}</span></span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <input type="hidden" name="role" value="client_staff" />
      )}
      {role === 'client_staff' && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">What can they manage?</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {areas.map((a) => (
              <label key={a.key} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="permissions" value={a.key} defaultChecked={a.key === 'orders'} /> {a.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </ActionForm>
  );
}
