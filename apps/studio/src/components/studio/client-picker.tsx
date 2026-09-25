'use client';

import { useState, type ReactNode } from 'react';
import { Field, Select } from '@/components/ui';

export function ClientPicker({ clients, newClientFields }: { clients: { id: string; name: string }[]; newClientFields: ReactNode }) {
  const [value, setValue] = useState('new');
  return (
    <div className="space-y-5">
      {clients.length > 0 && (
        <Field label="Client" htmlFor="client_id">
          <Select id="client_id" name="client_id" value={value} onChange={(e) => setValue(e.target.value)}>
            <option value="new">+ A new client</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
      )}
      {value === 'new' && newClientFields}
    </div>
  );
}
