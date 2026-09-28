-- =============================================================================
-- Websites
-- * Each project keeps the brief the team wrote about the business and the
--   website built from it (the page description the design kit renders, plus
--   its product catalogue). Same rules as the project: the agency builds it.
-- * The business's own material: logo, photos and documents (brochures, menus,
--   price lists) that the website is built from. Stored in the database (images
--   are resized in the browser first) so it follows the same security rules.
-- * "Other" website type, with the team's own description.
-- =============================================================================
alter table public.sites
  add column website_brief jsonb,
  add column website jsonb,
  add column website_built_at timestamptz,
  add column site_type_other text not null default '' check (char_length(site_type_other) <= 160),
  add constraint sites_website_size check (pg_column_size(website) < 2000000 and pg_column_size(website_brief) < 100000);

create or replace function private.site_types() returns text[]
language sql immutable as $$
  select array['informative', 'whatsapp_catalogue', 'online_store', 'marketplace', 'bookings',
               'restaurant', 'real_estate', 'education', 'events', 'portfolio', 'ngo', 'other']
$$;

create type public.site_file_kind as enum ('logo', 'photo', 'document');

create table public.site_files (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  kind public.site_file_kind not null,
  -- A short name the website refers to, e.g. "shop-front".
  name text not null check (name ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(name) <= 60),
  label text not null default '' check (char_length(label) <= 200),
  filename text not null default '' check (char_length(filename) <= 200),
  mime text not null check (mime in ('image/webp', 'application/pdf', 'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/msword')),
  data bytea not null check (octet_length(data) <= 10 * 1024 * 1024),
  -- A smaller copy of photos, for phones.
  small bytea check (octet_length(small) <= 2 * 1024 * 1024),
  width integer check (width between 1 and 10000),
  height integer check (height between 1 and 10000),
  -- Main colours of a logo or photo, e.g. {#c8321a,#1e3bd6}.
  colours text[] not null default '{}' check (cardinality(colours) <= 6),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (site_id, name),
  check (kind = 'document' or mime = 'image/webp')
);
create index on public.site_files (site_id);
create unique index site_files_one_logo on public.site_files (site_id) where kind = 'logo';

create trigger fill_org before insert on public.site_files
  for each row execute function private.fill_org_from_site();
alter table public.site_files enable row level security;

-- The agency builds websites; the business owner can see what was used.
create policy "agency and business owner see files" on public.site_files for select to authenticated
  using (private.is_site_owner_side(site_id));
create policy "agency adds files" on public.site_files for insert to authenticated
  with check (private.is_org_member(organisation_id));
create policy "agency edits files" on public.site_files for update to authenticated
  using (private.is_org_member(organisation_id)) with check (private.is_org_member(organisation_id));
create policy "agency removes files" on public.site_files for delete to authenticated
  using (private.is_org_member(organisation_id));

grant select, insert, update, delete on public.site_files to authenticated;
grant all on public.site_files to service_role;
