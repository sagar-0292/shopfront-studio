import { Field, Input, Select } from '@/components/ui';
import { INDIAN_STATES, LANGUAGES, SITE_TYPES } from '@/lib/catalog';

const BUSINESS_EXAMPLES = [
  'Sweet shop', 'Bakery', 'Café', 'Restaurant', 'Cloud kitchen', 'Dental clinic', 'Skin clinic', 'Salon & spa',
  'Gym', 'Yoga studio', 'Coaching classes', 'Pre-school', 'Real estate developer', 'Jeweller', 'Saree store',
  'Boutique', 'Furniture store', 'Interior designer', 'Architect', 'CA firm', 'Travel agency', 'Wedding planner',
  'Photographer', 'Pharmacy', 'Hardware store', 'Organic farm', 'Handicrafts', 'NGO',
];

function Chips({ name, options, selected, legend }: { name: string; options: readonly { key: string; label: string }[]; selected: string[]; legend: string }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o.key} className="cursor-pointer">
            <input type="checkbox" name={name} value={o.key} defaultChecked={selected.includes(o.key)} className="peer sr-only" />
            <span className="inline-block rounded-full border border-line bg-card px-3 py-2 text-sm transition peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ProjectFields({ defaults }: { defaults?: { name?: string; site_types?: string[]; business_kind?: string; languages?: string[] } }) {
  return (
    <div className="space-y-5">
      <Field label="Project name" htmlFor="name" hint="Usually the business or brand name, e.g. “Mithai Market”.">
        <Input id="name" name="name" required maxLength={160} defaultValue={defaults?.name} />
      </Field>
      <Field label="Kind of business" htmlFor="business_kind" hint="Type anything. The full picker of 150+ business kinds arrives with the AI pipeline.">
        <Input id="business_kind" name="business_kind" list="business-kinds" maxLength={160} defaultValue={defaults?.business_kind} />
        <datalist id="business-kinds">{BUSINESS_EXAMPLES.map((b) => <option key={b} value={b} />)}</datalist>
      </Field>
      <Chips name="site_types" legend="Website type (pick one or more)" options={SITE_TYPES} selected={defaults?.site_types ?? ['informative']} />
      <Chips name="languages" legend="Languages" options={LANGUAGES} selected={defaults?.languages ?? ['en']} />
    </div>
  );
}

export type ClientDefaults = {
  name?: string; contact_name?: string; phone?: string | null; whatsapp?: string | null; email?: string | null;
  city?: string; state?: string; gstin?: string | null;
};

export function ClientFields({ defaults, required = true }: { defaults?: ClientDefaults; required?: boolean }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label="Business name" htmlFor="client_name">
          <Input id="client_name" name="client_name" required={required} maxLength={160} defaultValue={defaults?.name} />
        </Field>
      </div>
      <Field label="Contact person" htmlFor="contact_name">
        <Input id="contact_name" name="contact_name" maxLength={120} autoComplete="off" defaultValue={defaults?.contact_name} />
      </Field>
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" maxLength={200} autoComplete="off" defaultValue={defaults?.email ?? ''} />
      </Field>
      <Field label="Phone" htmlFor="phone" hint="10-digit mobile, e.g. 98200 12345">
        <Input id="phone" name="phone" type="tel" inputMode="tel" maxLength={30} defaultValue={defaults?.phone ?? ''} />
      </Field>
      <Field label="WhatsApp number" htmlFor="whatsapp" hint="Leave empty if same as phone">
        <Input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" maxLength={30} defaultValue={defaults?.whatsapp ?? ''} />
      </Field>
      <Field label="City" htmlFor="city">
        <Input id="city" name="city" maxLength={80} defaultValue={defaults?.city} />
      </Field>
      <Field label="State" htmlFor="state">
        <Select id="state" name="state" defaultValue={defaults?.state ?? 'Maharashtra'}>
          <option value="">—</option>
          {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="GSTIN (optional)" htmlFor="gstin">
          <Input id="gstin" name="gstin" maxLength={20} className="uppercase" defaultValue={defaults?.gstin ?? ''} />
        </Field>
      </div>
    </div>
  );
}
