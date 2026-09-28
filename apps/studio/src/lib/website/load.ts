import 'server-only';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Db } from '@/lib/db';
import { kitsDir } from '@/lib/kits';
import { publicPaymentConfig, type PaymentSettings } from '@/lib/payments';
import { DESIGNS, type Direction } from '@/lib/designs';
import type { BriefFacts, BriefInput } from './brief';
import type { OwnImage, Website } from './build';

export type SiteRow = {
  id: string; name: string; slug: string; status: string; client_id: string; organisation_id: string;
  site_types: string[]; site_type_other: string; business_kind: string; languages: string[];
  design_direction: Direction | null; design_kit_version: string; motion_kit_version: string; commerce_kit_version: string;
  website_brief: Partial<BriefInput> | null; website: Website | null; website_built_at: string | null;
};
export type FileMeta = {
  id: string; kind: 'logo' | 'photo' | 'document'; name: string; label: string; filename: string; mime: string;
  width: number | null; height: number | null; colours: string[]; size: number; has_small: boolean;
};

export const EMPTY_BRIEF: BriefInput = { about: '', offer: '', audience: '', street: '', area: '', city: '', state: '', pincode: '', hours: '', instagram: '', reviews: '', notes: '' };

/** Everything the website builder needs about one project, read with the person's own permissions. */
export async function loadProjectWebsite(db: Db, siteId: string, orgId: string) {
  const site = await db.one<SiteRow>(
    `select id, name, slug, status, client_id, organisation_id, site_types, site_type_other, business_kind, languages, design_direction,
            design_kit_version, motion_kit_version, commerce_kit_version, website_brief, website, website_built_at
     from sites where id = $1 and organisation_id = $2`, [siteId, orgId]);
  if (!site) return null;
  const [client, files, payments] = await Promise.all([
    db.one<{ name: string; phone: string | null; whatsapp: string | null; email: string | null; city: string; state: string }>(
      `select name, phone, whatsapp, email, city, state from clients where id = $1`, [site.client_id]),
    db.query<FileMeta>(
      `select id, kind, name, label, filename, mime, width, height, colours, octet_length(data) as size, small is not null as has_small
       from site_files where site_id = $1 order by kind, created_at`, [siteId]),
    db.one<PaymentSettings>(`select * from site_payment_settings where site_id = $1`, [siteId]),
  ]);
  if (!client) return null;
  const brief: BriefInput = { ...EMPTY_BRIEF, city: client.city, state: client.state, ...(site.website_brief ?? {}) };
  const facts: BriefFacts = {
    // The address on the website page wins; otherwise the client's details.
    name: site.name, city: brief.city || client.city, state: brief.state || client.state, phone: client.phone, whatsapp: client.whatsapp, email: client.email,
    siteTypes: site.site_types, siteTypeOther: site.site_type_other, businessKind: site.business_kind, languages: site.languages,
  };
  const own: OwnImage[] = files.filter((f) => f.kind !== 'document' && f.width && f.height)
    .map((f) => ({ name: f.name, label: f.label, kind: f.kind as 'logo' | 'photo', width: f.width!, height: f.height!, hasSmall: f.has_small }));
  return { site, client, files, brief, facts, own, payments: payments ? publicPaymentConfig(payments) : null };
}

/** The finished sample site for a look, in the same shape Claude answers in. */
export function exampleFor(direction: Direction): unknown {
  const p = join(kitsDir(), 'sites', DESIGNS[direction].sample.id, 'example.json');
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {};
}
