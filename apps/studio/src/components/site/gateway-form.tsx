'use client';

import { useState } from 'react';
import { ActionForm } from '@/components/action-form';
import { Field, Input, Select } from '@/components/ui';
import type { ActionState } from '@/lib/action';

type P = { key: string; name: string; about: string; fees: string; fields: { name: string; label: string; secret: boolean; hint?: string }[] };

export function GatewayKeysForm({ action, siteId, providers }: { action: (p: ActionState, f: FormData) => Promise<ActionState>; siteId: string; providers: P[] }) {
  const [key, setKey] = useState(providers[0].key);
  const p = providers.find((x) => x.key === key)!;
  return (
    <ActionForm action={action} submitLabel={`Save ${p.name} keys`} pendingLabel="Saving securely…" resetOnSuccess>
      <input type="hidden" name="site_id" value={siteId} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Payment gateway" htmlFor="gw-provider">
          <Select id="gw-provider" name="provider" value={key} onChange={(e) => setKey(e.target.value)}>
            {providers.map((x) => <option key={x.key} value={x.key}>{x.name}</option>)}
          </Select>
        </Field>
        <Field label="Mode" htmlFor="gw-mode" hint="Use test mode until you’ve tried a payment.">
          <Select id="gw-mode" name="mode" defaultValue="test">
            <option value="test">Test (no real money)</option>
            <option value="live">Live</option>
          </Select>
        </Field>
      </div>
      <p className="text-sm text-muted">{p.about} {p.fees}.</p>
      <div className="grid gap-5 sm:grid-cols-2">
        {p.fields.map((f) => (
          <Field key={`${p.key}-${f.name}`} label={f.label} htmlFor={`gw-${f.name}`} hint={f.secret ? 'Stored encrypted. It can’t be shown again.' : f.hint}>
            <Input id={`gw-${f.name}`} name={f.name} type={f.secret ? 'password' : 'text'} autoComplete="off" spellCheck={false} required maxLength={300} />
          </Field>
        ))}
      </div>
    </ActionForm>
  );
}
