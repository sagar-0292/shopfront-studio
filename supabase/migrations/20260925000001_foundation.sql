-- =============================================================================
-- Shopfront Studio — Phase 1 foundation
--
-- Tenancy model
--   organisations  = an agency (the paying customer of Shopfront Studio)
--   clients        = a business the agency builds for (belongs to one agency)
--   sites          = a website/project for a client (a client can have many)
--
-- Every tenant-owned row carries organisation_id, and every site-owned row
-- also carries site_id. Row-level security (RLS) on every table decides who
-- can see or change each row, so the rules hold even if someone bypasses the
-- app's screens and talks to the database directly.
--
-- Errors meant for people use SQLSTATE 'SF001' and a plain-language message;
-- the app shows those messages as-is.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- Helper functions live in a schema that is never exposed over the API.
create schema if not exists private;
grant usage on schema private to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Types
-- -----------------------------------------------------------------------------
create type public.agency_role as enum ('owner', 'team');
create type public.client_role as enum ('client_owner', 'client_staff');
create type public.site_status as enum ('draft', 'building', 'in_review', 'live', 'paused', 'archived');
create type public.client_status as enum ('lead', 'active', 'paused', 'churned');
create type public.seller_status as enum ('pending', 'active', 'suspended');
create type public.product_status as enum ('draft', 'active', 'hidden', 'sold_out');
create type public.order_status as enum ('new', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled', 'refunded');
create type public.lead_status as enum ('new', 'contacted', 'won', 'lost');
create type public.invitation_kind as enum ('agency', 'client', 'seller');

-- Areas of a client's admin panel. Client staff get a subset of these.
create function private.client_areas() returns text[]
language sql immutable as $$
  select array['products', 'orders', 'bookings', 'leads', 'content', 'sellers', 'coupons', 'reviews', 'analytics']
$$;

create function private.site_types() returns text[]
language sql immutable as $$
  select array['informative', 'whatsapp_catalogue', 'online_store', 'marketplace', 'bookings',
               'restaurant', 'real_estate', 'education', 'events', 'portfolio', 'ngo']
$$;

-- -----------------------------------------------------------------------------
-- Platform settings (not readable by anyone except through functions)
-- -----------------------------------------------------------------------------
create table public.platform_settings (
  id boolean primary key default true check (id),
  -- 'first_only': only the very first agency can sign up (default, safest)
  -- 'open':       anyone can create an agency workspace
  -- 'closed':     nobody can
  agency_signup_mode text not null default 'first_only'
    check (agency_signup_mode in ('first_only', 'open', 'closed'))
);
insert into public.platform_settings default values;

-- -----------------------------------------------------------------------------
-- People
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '' check (char_length(full_name) <= 120),
  phone text check (phone is null or phone ~ '^\+?[0-9 ]{8,16}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Agencies
-- -----------------------------------------------------------------------------
create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organisation_members (
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.agency_role not null default 'team',
  created_at timestamptz not null default now(),
  primary key (organisation_id, user_id)
);
create index on public.organisation_members (user_id);

-- Billing details are only for the agency owner.
create table public.organisation_billing (
  organisation_id uuid primary key references public.organisations (id) on delete cascade,
  legal_name text not null default '',
  gstin text check (gstin is null or gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$'),
  billing_email text,
  address text not null default '',
  state_code text check (state_code is null or state_code ~ '^[0-9]{2}$'),
  plan text not null default 'starter',
  razorpay_customer_id text,
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Clients and their sites
-- -----------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 160),
  contact_name text not null default '',
  email text,
  phone text,
  whatsapp text,
  city text not null default '',
  state text not null default '',
  gstin text check (gstin is null or gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$'),
  status public.client_status not null default 'active',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organisation_id)
);
create index on public.clients (organisation_id);

create table public.client_members (
  client_id uuid not null,
  organisation_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.client_role not null default 'client_staff',
  permissions text[] not null default '{}' check (permissions <@ private.client_areas()),
  created_at timestamptz not null default now(),
  primary key (client_id, user_id),
  foreign key (client_id, organisation_id) references public.clients (id, organisation_id) on delete cascade
);
create index on public.client_members (user_id);

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null,
  client_id uuid not null,
  name text not null check (char_length(name) between 2 and 160),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  site_types text[] not null default '{informative}'
    check (cardinality(site_types) >= 1 and site_types <@ private.site_types()),
  business_kind text not null default '' check (char_length(business_kind) <= 160),
  languages text[] not null default '{en}' check (cardinality(languages) >= 1),
  primary_domain text check (primary_domain is null or primary_domain ~ '^([a-z0-9-]+\.)+[a-z]{2,}$'),
  status public.site_status not null default 'draft',
  archived_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, slug),
  unique (id, organisation_id),
  foreign key (client_id, organisation_id) references public.clients (id, organisation_id) on delete cascade
);
create index on public.sites (client_id);

-- Which agency people are working on a project (informational, not access).
create table public.site_assignees (
  site_id uuid not null,
  organisation_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (site_id, user_id),
  foreign key (site_id, organisation_id) references public.sites (id, organisation_id) on delete cascade
);

-- -----------------------------------------------------------------------------
-- Marketplace sellers
-- -----------------------------------------------------------------------------
create table public.sellers (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null,
  site_id uuid not null,
  name text not null check (char_length(name) between 2 and 160),
  email text,
  phone text,
  status public.seller_status not null default 'pending',
  commission_bps integer not null default 0 check (commission_bps between 0 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, site_id),
  foreign key (site_id, organisation_id) references public.sites (id, organisation_id) on delete cascade
);
create index on public.sellers (site_id);

create table public.seller_members (
  seller_id uuid not null,
  site_id uuid not null,
  organisation_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (seller_id, user_id),
  foreign key (seller_id, site_id) references public.sellers (id, site_id) on delete cascade,
  foreign key (site_id, organisation_id) references public.sites (id, organisation_id) on delete cascade
);
create index on public.seller_members (user_id);

-- -----------------------------------------------------------------------------
-- Catalogue (extended in Phase 5)
-- -----------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null,
  site_id uuid not null,
  name text not null check (char_length(name) between 1 and 120),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, site_id),
  foreign key (site_id, organisation_id) references public.sites (id, organisation_id) on delete cascade
);
create index on public.categories (site_id);

-- Money is stored in paise (whole numbers) so rupee amounts never lose precision.
create table public.products (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null,
  site_id uuid not null,
  seller_id uuid,
  category_id uuid,
  name text not null check (char_length(name) between 1 and 200),
  description text not null default '',
  price_paise bigint not null check (price_paise >= 0),
  mrp_paise bigint check (mrp_paise is null or mrp_paise >= 0),
  status public.product_status not null default 'draft',
  featured boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (site_id, organisation_id) references public.sites (id, organisation_id) on delete cascade,
  foreign key (seller_id, site_id) references public.sellers (id, site_id) on delete cascade,
  foreign key (category_id, site_id) references public.categories (id, site_id)
);
create index on public.products (site_id, status);
create index on public.products (seller_id);

-- -----------------------------------------------------------------------------
-- Orders and leads (extended in Phases 5–6)
-- -----------------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null,
  site_id uuid not null,
  order_number bigint generated always as identity,
  customer_name text not null,
  customer_phone text,
  customer_email text,
  total_paise bigint not null check (total_paise >= 0),
  status public.order_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (site_id, organisation_id) references public.sites (id, organisation_id) on delete cascade
);
create index on public.orders (site_id, created_at desc);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null,
  site_id uuid not null,
  name text not null,
  phone text,
  email text,
  message text not null default '',
  source text not null default 'website',
  status public.lead_status not null default 'new',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (site_id, organisation_id) references public.sites (id, organisation_id) on delete cascade
);
create index on public.leads (site_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Invitations
-- -----------------------------------------------------------------------------
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  kind public.invitation_kind not null,
  client_id uuid,
  seller_id uuid,
  email text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  agency_role public.agency_role,
  client_role public.client_role,
  permissions text[] not null default '{}' check (permissions <@ private.client_areas()),
  token_hash text not null unique,
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  revoked_at timestamptz,
  foreign key (client_id, organisation_id) references public.clients (id, organisation_id) on delete cascade,
  foreign key (seller_id) references public.sellers (id) on delete cascade,
  check (
    (kind = 'agency' and agency_role is not null and client_id is null and seller_id is null) or
    (kind = 'client' and client_role is not null and client_id is not null and seller_id is null) or
    (kind = 'seller' and seller_id is not null and client_id is null)
  )
);
create index on public.invitations (organisation_id);

-- -----------------------------------------------------------------------------
-- Audit log (written only by triggers; nobody can edit or delete entries)
-- -----------------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  organisation_id uuid,
  site_id uuid,
  actor_id uuid,
  actor_email text,
  table_name text not null,
  record_id text,
  action text not null check (action in ('insert', 'update', 'delete')),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index on public.audit_log (organisation_id, created_at desc);

-- =============================================================================
-- Helper functions used by the security rules.
-- They are SECURITY DEFINER so they can look up memberships without being
-- blocked by the very rules they implement. They only ever answer yes/no
-- questions about the current user.
-- =============================================================================
create function private.is_org_member(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organisation_members m
    where m.organisation_id = org and m.user_id = (select auth.uid())
  )
$$;

create function private.is_org_owner(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organisation_members m
    where m.organisation_id = org and m.user_id = (select auth.uid()) and m.role = 'owner'
  )
$$;

create function private.is_client_owner(client uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.client_members c
    where c.client_id = client and c.user_id = (select auth.uid()) and c.role = 'client_owner'
  )
$$;

create function private.is_client_member(client uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.client_members c
    where c.client_id = client and c.user_id = (select auth.uid())
  )
$$;

-- Can the current user manage `area` (e.g. 'products', 'orders') on this site?
-- Agency owners/team: yes. Client owner: yes. Client staff: only listed areas.
create function private.can_manage_site(site uuid, area text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.sites s
    where s.id = site and (
      exists (
        select 1 from public.organisation_members m
        where m.organisation_id = s.organisation_id and m.user_id = (select auth.uid())
      ) or exists (
        select 1 from public.client_members c
        where c.client_id = s.client_id and c.user_id = (select auth.uid())
          and (c.role = 'client_owner' or area = any (c.permissions))
      )
    )
  )
$$;

-- Can the current user see this site at all (any role on it)?
create function private.can_view_site(site uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.sites s
    where s.id = site and (
      exists (select 1 from public.organisation_members m
              where m.organisation_id = s.organisation_id and m.user_id = (select auth.uid()))
      or exists (select 1 from public.client_members c
                 where c.client_id = s.client_id and c.user_id = (select auth.uid()))
      or exists (select 1 from public.seller_members sm
                 where sm.site_id = s.id and sm.user_id = (select auth.uid()))
    )
  )
$$;

create function private.is_seller_member(seller uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.seller_members sm
    where sm.seller_id = seller and sm.user_id = (select auth.uid())
  )
$$;

create function private.is_site_seller(site uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.seller_members sm
    where sm.site_id = site and sm.user_id = (select auth.uid())
  )
$$;

-- Is this site published so the public can see its catalogue?
create function private.site_is_public(site uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.sites s where s.id = site and s.status = 'live' and s.archived_at is null
  )
$$;

-- Do two users share any workspace? (lets people see each other's names)
create function private.shares_workspace(other uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select other = (select auth.uid())
  or exists (
    select 1 from public.organisation_members a
    join public.organisation_members b on a.organisation_id = b.organisation_id
    where a.user_id = (select auth.uid()) and b.user_id = other
  )
  or exists (  -- agency people can see their clients' logins
    select 1 from public.organisation_members a
    join public.client_members b on a.organisation_id = b.organisation_id
    where a.user_id = (select auth.uid()) and b.user_id = other
  )
  or exists (
    select 1 from public.organisation_members a
    join public.seller_members b on a.organisation_id = b.organisation_id
    where a.user_id = (select auth.uid()) and b.user_id = other
  )
  or exists (  -- client owners can see their own staff
    select 1 from public.client_members a
    join public.client_members b on a.client_id = b.client_id
    where a.user_id = (select auth.uid()) and a.role = 'client_owner' and b.user_id = other
  )
$$;

grant execute on all functions in schema private to anon, authenticated, service_role;

-- =============================================================================
-- Triggers
-- =============================================================================
create function private.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Fill organisation_id from the parent record so nobody can put a row into
-- one agency while pointing it at another agency's site or client.
create function private.fill_org_from_site() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select s.organisation_id into new.organisation_id from public.sites s where s.id = new.site_id;
  if new.organisation_id is null then
    raise exception 'That website could not be found.' using errcode = 'SF001';
  end if;
  return new;
end $$;

create function private.fill_org_from_client() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select c.organisation_id into new.organisation_id from public.clients c where c.id = new.client_id;
  if new.organisation_id is null then
    raise exception 'That client could not be found.' using errcode = 'SF001';
  end if;
  return new;
end $$;

create function private.fill_site_from_seller() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select s.site_id, s.organisation_id into new.site_id, new.organisation_id
  from public.sellers s where s.id = new.seller_id;
  if new.site_id is null then
    raise exception 'That seller could not be found.' using errcode = 'SF001';
  end if;
  return new;
end $$;

-- Rows can never move between agencies, clients or sites.
create function private.lock_tenancy() returns trigger
language plpgsql as $$
declare
  o jsonb := to_jsonb(old);
  n jsonb := to_jsonb(new);
  col text;
begin
  foreach col in array tg_argv loop
    if (o -> col) is distinct from (n -> col) then
      raise exception 'Records cannot be moved to a different agency, client or website.'
        using errcode = 'SF001';
    end if;
  end loop;
  return new;
end $$;

-- A seller can never reassign a product to another seller, or make it the
-- shop's own product.
create function private.guard_seller_products() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and old.seller_id is distinct from new.seller_id
     and not private.can_manage_site(old.site_id, 'products') then
    raise exception 'Only the shop can move a product to a different seller.' using errcode = 'SF001';
  end if;
  return new;
end $$;

-- An agency must always keep at least one owner.
create function private.keep_one_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.role = 'owner' and (tg_op = 'DELETE' or new.role <> 'owner') then
    if not exists (
      select 1 from public.organisation_members m
      where m.organisation_id = old.organisation_id and m.role = 'owner' and m.user_id <> old.user_id
    ) and exists (select 1 from public.organisations o where o.id = old.organisation_id) then
      raise exception 'An agency must always have at least one owner. Make someone else an owner first.'
        using errcode = 'SF001';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

-- Client owners can manage staff logins, but only the agency can add or
-- change a client owner.
-- Runs with the caller's own role (not SECURITY DEFINER) so that trusted
-- database functions such as accept_invitation are not blocked by it.
create function private.guard_client_members() returns trigger
language plpgsql set search_path = '' as $$
declare
  org uuid := case when tg_op = 'DELETE' then old.organisation_id else new.organisation_id end;
begin
  if current_user not in ('authenticated', 'anon') or private.is_org_member(org) then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if (tg_op <> 'INSERT' and old.role = 'client_owner') or (tg_op <> 'DELETE' and new.role = 'client_owner') then
    raise exception 'Only your agency can add or change a business owner login.' using errcode = 'SF001';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

create function private.audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  rec jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
begin
  insert into public.audit_log (organisation_id, site_id, actor_id, actor_email, table_name, record_id, action, old_data, new_data)
  values (
    case when tg_table_name = 'organisations' then (rec ->> 'id')::uuid else (rec ->> 'organisation_id')::uuid end,
    case when tg_table_name = 'sites' then (rec ->> 'id')::uuid else (rec ->> 'site_id')::uuid end,
    auth.uid(),
    claims ->> 'email',
    tg_table_name,
    coalesce(rec ->> 'id', rec ->> 'user_id'),
    lower(tg_op),
    case when tg_op <> 'INSERT' then to_jsonb(old) - 'token_hash' end,
    case when tg_op <> 'DELETE' then to_jsonb(new) - 'token_hash' end
  );
  return null;
end $$;

-- Create a profile row whenever someone signs up.
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, coalesce(new.email, ''), left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120))
  on conflict (id) do nothing;
  return new;
end $$;

create function private.sync_user_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();
create trigger on_auth_user_email_changed after update of email on auth.users
  for each row when (old.email is distinct from new.email) execute function private.sync_user_email();

-- updated_at
do $$
declare t text;
begin
  foreach t in array array['profiles', 'organisations', 'organisation_billing', 'clients', 'sites',
                           'sellers', 'categories', 'products', 'orders', 'leads'] loop
    execute format('create trigger set_updated_at before update on public.%I
                    for each row execute function private.set_updated_at()', t);
  end loop;
end $$;

-- organisation_id filled from parent
create trigger fill_org before insert on public.sites
  for each row execute function private.fill_org_from_client();
create trigger fill_org before insert on public.client_members
  for each row execute function private.fill_org_from_client();
create trigger fill_site before insert on public.seller_members
  for each row execute function private.fill_site_from_seller();
do $$
declare t text;
begin
  foreach t in array array['site_assignees', 'sellers', 'categories', 'products', 'orders', 'leads'] loop
    execute format('create trigger fill_org before insert on public.%I
                    for each row execute function private.fill_org_from_site()', t);
  end loop;
end $$;

-- tenancy is immutable
create trigger lock_tenancy before update on public.clients
  for each row execute function private.lock_tenancy('organisation_id');
create trigger lock_tenancy before update on public.sites
  for each row execute function private.lock_tenancy('organisation_id', 'client_id');
create trigger lock_tenancy before update on public.organisation_members
  for each row execute function private.lock_tenancy('organisation_id', 'user_id');
create trigger lock_tenancy before update on public.client_members
  for each row execute function private.lock_tenancy('organisation_id', 'client_id', 'user_id');
create trigger lock_tenancy before update on public.seller_members
  for each row execute function private.lock_tenancy('organisation_id', 'site_id', 'seller_id', 'user_id');
create trigger lock_tenancy before update on public.invitations
  for each row execute function private.lock_tenancy('organisation_id', 'kind', 'client_id', 'seller_id', 'email', 'token_hash');
do $$
declare t text;
begin
  foreach t in array array['sellers', 'categories', 'products', 'orders', 'leads'] loop
    execute format('create trigger lock_tenancy before update on public.%I
                    for each row execute function private.lock_tenancy(''organisation_id'', ''site_id'')', t);
  end loop;
end $$;

create trigger guard_seller_products before update on public.products
  for each row execute function private.guard_seller_products();
create trigger keep_one_owner before update or delete on public.organisation_members
  for each row execute function private.keep_one_owner();
create trigger guard_client_members before insert or update or delete on public.client_members
  for each row execute function private.guard_client_members();

-- audit
do $$
declare t text;
begin
  foreach t in array array['organisations', 'organisation_members', 'organisation_billing', 'clients',
                           'client_members', 'sites', 'site_assignees', 'sellers', 'seller_members',
                           'categories', 'products', 'orders', 'leads', 'invitations'] loop
    execute format('create trigger audit after insert or update or delete on public.%I
                    for each row execute function private.audit()', t);
  end loop;
end $$;

-- =============================================================================
-- Row-level security
-- =============================================================================
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- platform_settings: no policies → nobody reads or writes it directly.

-- profiles
create policy "see people you work with" on public.profiles for select to authenticated
  using (private.shares_workspace(id));
create policy "edit your own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- organisations
create policy "members see their agency" on public.organisations for select to authenticated
  using (
    private.is_org_member(id)
    or exists (select 1 from public.client_members c where c.organisation_id = id and c.user_id = (select auth.uid()))
    or exists (select 1 from public.seller_members s where s.organisation_id = id and s.user_id = (select auth.uid()))
  );
create policy "owners edit their agency" on public.organisations for update to authenticated
  using (private.is_org_owner(id)) with check (private.is_org_owner(id));

-- organisation_members
create policy "members see their team" on public.organisation_members for select to authenticated
  using (private.is_org_member(organisation_id));
create policy "owners add team" on public.organisation_members for insert to authenticated
  with check (private.is_org_owner(organisation_id));
create policy "owners change team" on public.organisation_members for update to authenticated
  using (private.is_org_owner(organisation_id)) with check (private.is_org_owner(organisation_id));
create policy "owners remove team" on public.organisation_members for delete to authenticated
  using (private.is_org_owner(organisation_id));

-- organisation_billing: owner only
create policy "owners see billing" on public.organisation_billing for select to authenticated
  using (private.is_org_owner(organisation_id));
create policy "owners edit billing" on public.organisation_billing for update to authenticated
  using (private.is_org_owner(organisation_id)) with check (private.is_org_owner(organisation_id));

-- clients
create policy "agency and the client see the client" on public.clients for select to authenticated
  using (private.is_org_member(organisation_id) or private.is_client_member(id));
create policy "agency adds clients" on public.clients for insert to authenticated
  with check (private.is_org_member(organisation_id));
create policy "agency edits clients" on public.clients for update to authenticated
  using (private.is_org_member(organisation_id)) with check (private.is_org_member(organisation_id));
create policy "owners delete clients" on public.clients for delete to authenticated
  using (private.is_org_owner(organisation_id));

-- client_members
create policy "see client logins" on public.client_members for select to authenticated
  using (
    private.is_org_member(organisation_id)
    or private.is_client_owner(client_id)
    or user_id = (select auth.uid())
  );
create policy "add client logins" on public.client_members for insert to authenticated
  with check (private.is_org_member(organisation_id) or private.is_client_owner(client_id));
create policy "change client logins" on public.client_members for update to authenticated
  using (private.is_org_member(organisation_id) or private.is_client_owner(client_id))
  with check (private.is_org_member(organisation_id) or private.is_client_owner(client_id));
create policy "remove client logins" on public.client_members for delete to authenticated
  using (private.is_org_member(organisation_id) or private.is_client_owner(client_id));

-- sites
-- The agency check comes first: it doesn't need to look the site up again,
-- which matters right after an insert (the new row isn't visible to lookups yet).
create policy "people on the site see it" on public.sites for select to authenticated
  using (private.is_org_member(organisation_id) or private.can_view_site(id));
create policy "agency adds sites" on public.sites for insert to authenticated
  with check (private.is_org_member(organisation_id));
create policy "agency edits sites" on public.sites for update to authenticated
  using (private.is_org_member(organisation_id)) with check (private.is_org_member(organisation_id));
create policy "owners delete sites" on public.sites for delete to authenticated
  using (private.is_org_owner(organisation_id));

-- site_assignees
create policy "agency sees assignees" on public.site_assignees for select to authenticated
  using (private.is_org_member(organisation_id));
create policy "agency assigns" on public.site_assignees for insert to authenticated
  with check (private.is_org_member(organisation_id)
              and exists (select 1 from public.organisation_members m
                          where m.organisation_id = site_assignees.organisation_id
                            and m.user_id = site_assignees.user_id));
create policy "agency unassigns" on public.site_assignees for delete to authenticated
  using (private.is_org_member(organisation_id));

-- sellers
create policy "shop and the seller see seller" on public.sellers for select to authenticated
  using (private.can_manage_site(site_id, 'sellers') or private.is_seller_member(id));
create policy "shop adds sellers" on public.sellers for insert to authenticated
  with check (private.can_manage_site(site_id, 'sellers'));
create policy "shop edits sellers" on public.sellers for update to authenticated
  using (private.can_manage_site(site_id, 'sellers')) with check (private.can_manage_site(site_id, 'sellers'));
create policy "shop removes sellers" on public.sellers for delete to authenticated
  using (private.can_manage_site(site_id, 'sellers'));

-- seller_members
create policy "see seller logins" on public.seller_members for select to authenticated
  using (private.can_manage_site(site_id, 'sellers') or user_id = (select auth.uid()));
create policy "shop adds seller logins" on public.seller_members for insert to authenticated
  with check (private.can_manage_site(site_id, 'sellers'));
create policy "shop removes seller logins" on public.seller_members for delete to authenticated
  using (private.can_manage_site(site_id, 'sellers'));

-- categories
create policy "shop, sellers and public see categories" on public.categories for select to anon, authenticated
  using (private.can_manage_site(site_id, 'products') or private.is_site_seller(site_id) or private.site_is_public(site_id));
create policy "shop adds categories" on public.categories for insert to authenticated
  with check (private.can_manage_site(site_id, 'products'));
create policy "shop edits categories" on public.categories for update to authenticated
  using (private.can_manage_site(site_id, 'products')) with check (private.can_manage_site(site_id, 'products'));
create policy "shop removes categories" on public.categories for delete to authenticated
  using (private.can_manage_site(site_id, 'products'));

-- products
create policy "see products" on public.products for select to anon, authenticated
  using (
    private.can_manage_site(site_id, 'products')
    or (seller_id is not null and private.is_seller_member(seller_id))
    or (status in ('active', 'sold_out') and private.site_is_public(site_id))
  );
create policy "add products" on public.products for insert to authenticated
  with check (
    private.can_manage_site(site_id, 'products')
    or (seller_id is not null and private.is_seller_member(seller_id))
  );
create policy "edit products" on public.products for update to authenticated
  using (
    private.can_manage_site(site_id, 'products')
    or (seller_id is not null and private.is_seller_member(seller_id))
  )
  with check (
    private.can_manage_site(site_id, 'products')
    or (seller_id is not null and private.is_seller_member(seller_id))
  );
create policy "remove products" on public.products for delete to authenticated
  using (
    private.can_manage_site(site_id, 'products')
    or (seller_id is not null and private.is_seller_member(seller_id))
  );

-- orders: no deletes — cancel or refund instead
create policy "see orders" on public.orders for select to authenticated
  using (private.can_manage_site(site_id, 'orders'));
create policy "add orders" on public.orders for insert to authenticated
  with check (private.can_manage_site(site_id, 'orders'));
create policy "edit orders" on public.orders for update to authenticated
  using (private.can_manage_site(site_id, 'orders')) with check (private.can_manage_site(site_id, 'orders'));

-- leads
create policy "see leads" on public.leads for select to authenticated
  using (private.can_manage_site(site_id, 'leads'));
create policy "add leads" on public.leads for insert to authenticated
  with check (private.can_manage_site(site_id, 'leads'));
create policy "edit leads" on public.leads for update to authenticated
  using (private.can_manage_site(site_id, 'leads')) with check (private.can_manage_site(site_id, 'leads'));
create policy "remove leads" on public.leads for delete to authenticated
  using (private.can_manage_site(site_id, 'leads'));

-- invitations
create function private.can_manage_invitation(
  org uuid, k public.invitation_kind, client uuid, seller uuid, crole public.client_role
) returns boolean
language sql stable security definer set search_path = '' as $$
  select case k
    when 'agency' then private.is_org_owner(org)
    when 'client' then private.is_org_member(org)
                       or (crole = 'client_staff' and private.is_client_owner(client))
    when 'seller' then exists (select 1 from public.sellers s
                               where s.id = seller and s.organisation_id = org
                                 and private.can_manage_site(s.site_id, 'sellers'))
  end
$$;
grant execute on function private.can_manage_invitation to authenticated;

create policy "see invitations you manage" on public.invitations for select to authenticated
  using (private.can_manage_invitation(organisation_id, kind, client_id, seller_id, client_role));
create policy "create invitations you manage" on public.invitations for insert to authenticated
  with check (private.can_manage_invitation(organisation_id, kind, client_id, seller_id, client_role)
              and invited_by = (select auth.uid()));
create policy "revoke invitations you manage" on public.invitations for update to authenticated
  using (private.can_manage_invitation(organisation_id, kind, client_id, seller_id, client_role))
  with check (private.can_manage_invitation(organisation_id, kind, client_id, seller_id, client_role));
create policy "delete invitations you manage" on public.invitations for delete to authenticated
  using (private.can_manage_invitation(organisation_id, kind, client_id, seller_id, client_role));

-- audit_log: agency members read their own agency's log. No one writes.
create policy "agency reads its audit log" on public.audit_log for select to authenticated
  using (organisation_id is not null and private.is_org_member(organisation_id));

-- =============================================================================
-- Table privileges (RLS above decides which rows)
-- =============================================================================
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke insert, update, delete on public.audit_log from authenticated;
revoke all on public.platform_settings from anon, authenticated;
grant select on public.products, public.categories to anon;
grant all on all tables in schema public to service_role;
grant usage on all sequences in schema public to authenticated, service_role;

-- =============================================================================
-- Actions that need to cross the rules in a controlled way
-- =============================================================================

-- Create a new agency workspace; the caller becomes its owner.
create function public.create_agency(agency_name text, agency_slug text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  mode text;
  org uuid;
begin
  if me is null then
    raise exception 'Please log in first.' using errcode = 'SF001';
  end if;
  select agency_signup_mode into mode from public.platform_settings;
  if mode = 'closed' or (mode = 'first_only' and exists (select 1 from public.organisations)) then
    raise exception 'New agency workspaces are not open right now. Ask your agency owner to invite you.'
      using errcode = 'SF001';
  end if;
  if exists (select 1 from public.organisations where slug = agency_slug) then
    raise exception 'That web address is already taken. Try a different agency name.' using errcode = 'SF001';
  end if;
  insert into public.organisations (name, slug, created_by) values (agency_name, agency_slug, me)
    returning id into org;
  insert into public.organisation_members (organisation_id, user_id, role) values (org, me, 'owner');
  insert into public.organisation_billing (organisation_id, legal_name) values (org, agency_name);
  return org;
end $$;
revoke execute on function public.create_agency from public, anon;
grant execute on function public.create_agency to authenticated;

-- Can the current user create an agency right now? (for showing the button)
create function public.agency_signup_open() returns boolean
language sql stable security definer set search_path = '' as $$
  select case agency_signup_mode
    when 'open' then true
    when 'first_only' then not exists (select 1 from public.organisations)
    else false end
  from public.platform_settings
$$;
grant execute on function public.agency_signup_open to anon, authenticated;

create function private.hash_token(token text) returns text
language sql immutable set search_path = '' as $$
  select encode(extensions.digest(convert_to(token, 'UTF8'), 'sha256'), 'hex')
$$;

-- Show what an invitation is for, given the secret link token.
create function public.invitation_preview(token text) returns table (
  kind public.invitation_kind,
  email text,
  organisation_name text,
  client_name text,
  seller_name text,
  invited_by_name text,
  role text,
  status text
)
language sql stable security definer set search_path = '' as $$
  select i.kind, i.email, o.name, c.name, s.name,
         coalesce(nullif(p.full_name, ''), p.email),
         coalesce(i.agency_role::text, i.client_role::text, 'seller'),
         case
           when i.revoked_at is not null then 'revoked'
           when i.accepted_at is not null then 'accepted'
           when i.expires_at < now() then 'expired'
           else 'pending'
         end
  from public.invitations i
  join public.organisations o on o.id = i.organisation_id
  left join public.clients c on c.id = i.client_id
  left join public.sellers s on s.id = i.seller_id
  left join public.profiles p on p.id = i.invited_by
  where i.token_hash = private.hash_token(token)
$$;
grant execute on function public.invitation_preview to anon, authenticated;

-- Accept an invitation. The logged-in email must match the invited email.
create function public.accept_invitation(token text) returns public.invitation_kind
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  my_email text;
  inv public.invitations;
begin
  if me is null then
    raise exception 'Please log in to accept this invitation.' using errcode = 'SF001';
  end if;
  select email into my_email from auth.users where id = me;

  select * into inv from public.invitations where token_hash = private.hash_token(token) for update;
  if inv.id is null then
    raise exception 'This invitation link is not valid. Ask for a new one.' using errcode = 'SF001';
  elsif inv.revoked_at is not null then
    raise exception 'This invitation was cancelled. Ask for a new one.' using errcode = 'SF001';
  elsif inv.accepted_at is not null then
    raise exception 'This invitation has already been used.' using errcode = 'SF001';
  elsif inv.expires_at < now() then
    raise exception 'This invitation has expired. Ask for a new one.' using errcode = 'SF001';
  elsif lower(inv.email) <> lower(coalesce(my_email, '')) then
    raise exception 'This invitation was sent to %. Log in with that email address to accept it.', inv.email
      using errcode = 'SF001';
  end if;

  if inv.kind = 'agency' then
    insert into public.organisation_members (organisation_id, user_id, role)
    values (inv.organisation_id, me, inv.agency_role)
    on conflict (organisation_id, user_id) do nothing;
  elsif inv.kind = 'client' then
    insert into public.client_members (client_id, user_id, role, permissions)
    values (inv.client_id, me, inv.client_role, inv.permissions)
    on conflict (client_id, user_id) do update set role = excluded.role, permissions = excluded.permissions;
  else
    insert into public.seller_members (seller_id, user_id)
    values (inv.seller_id, me)
    on conflict (seller_id, user_id) do nothing;
  end if;

  update public.invitations set accepted_at = now(), accepted_by = me where id = inv.id;
  return inv.kind;
end $$;
revoke execute on function public.accept_invitation from public, anon;
grant execute on function public.accept_invitation to authenticated;

-- Create an invitation and return the one-time secret for the link.
-- The secret itself is never stored, only its fingerprint.
create function public.create_invitation(
  p_organisation_id uuid,
  p_kind public.invitation_kind,
  p_email text,
  p_agency_role public.agency_role default null,
  p_client_id uuid default null,
  p_client_role public.client_role default null,
  p_permissions text[] default '{}',
  p_seller_id uuid default null
) returns table (invitation_id uuid, token text)
language plpgsql security invoker set search_path = '' as $$
declare
  t text := encode(extensions.gen_random_bytes(24), 'hex');
  new_id uuid;
begin
  insert into public.invitations (organisation_id, kind, email, agency_role, client_id, client_role,
                                  permissions, seller_id, token_hash, invited_by)
  values (p_organisation_id, p_kind, lower(trim(p_email)), p_agency_role, p_client_id, p_client_role,
          coalesce(p_permissions, '{}'), p_seller_id, private.hash_token(t), auth.uid())
  returning id into new_id;
  return query select new_id, t;
end $$;
revoke execute on function public.create_invitation from public, anon;
grant execute on function public.create_invitation to authenticated;
