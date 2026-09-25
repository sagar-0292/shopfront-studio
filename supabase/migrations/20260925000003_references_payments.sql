-- =============================================================================
-- Reference & competitor websites, and payment settings, per website.
-- =============================================================================

-- The audit log must never contain secret material.
create or replace function private.audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  rec jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  secret_keys text[] := array['token_hash', 'ciphertext'];
begin
  insert into public.audit_log (organisation_id, site_id, actor_id, actor_email, table_name, record_id, action, old_data, new_data)
  values (
    case when tg_table_name = 'organisations' then (rec ->> 'id')::uuid else (rec ->> 'organisation_id')::uuid end,
    case when tg_table_name = 'sites' then (rec ->> 'id')::uuid else (rec ->> 'site_id')::uuid end,
    auth.uid(),
    claims ->> 'email',
    tg_table_name,
    coalesce(rec ->> 'id', rec ->> 'user_id', rec ->> 'site_id'),
    lower(tg_op),
    case when tg_op <> 'INSERT' then to_jsonb(old) - secret_keys end,
    case when tg_op <> 'DELETE' then to_jsonb(new) - secret_keys end
  );
  return null;
end $$;

-- Agency people, or the business owner of this website's client.
create function private.is_site_owner_side(site uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.sites s
    where s.id = site and (
      exists (select 1 from public.organisation_members m
              where m.organisation_id = s.organisation_id and m.user_id = (select auth.uid()))
      or exists (select 1 from public.client_members c
                 where c.client_id = s.client_id and c.user_id = (select auth.uid()) and c.role = 'client_owner')
    )
  )
$$;
grant execute on function private.is_site_owner_side to authenticated;

-- -----------------------------------------------------------------------------
-- Reference and competitor websites
-- -----------------------------------------------------------------------------
create type public.reference_kind as enum ('inspiration', 'competitor');

create table public.site_references (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null,
  site_id uuid not null,
  kind public.reference_kind not null,
  url text not null check (url ~ '^https?://[a-z0-9.-]+\.[a-z]{2,}(:[0-9]{1,5})?(/[^\s]*)?$' and char_length(url) <= 500),
  notes text not null default '' check (char_length(notes) <= 1000),
  added_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (site_id, url),
  foreign key (site_id, organisation_id) references public.sites (id, organisation_id) on delete cascade
);
create index on public.site_references (site_id);

create trigger fill_org before insert on public.site_references
  for each row execute function private.fill_org_from_site();
create trigger audit after insert or update or delete on public.site_references
  for each row execute function private.audit();
alter table public.site_references enable row level security;

create policy "agency and business owner see references" on public.site_references for select to authenticated
  using (private.is_site_owner_side(site_id));
create policy "agency and business owner add references" on public.site_references for insert to authenticated
  with check (private.is_site_owner_side(site_id) and added_by = (select auth.uid()));
create policy "agency edits any, business owner edits their own" on public.site_references for update to authenticated
  using (private.is_org_member(organisation_id) or (private.is_site_owner_side(site_id) and added_by = (select auth.uid())))
  with check (private.is_site_owner_side(site_id));
create policy "agency removes any, business owner removes their own" on public.site_references for delete to authenticated
  using (private.is_org_member(organisation_id) or (private.is_site_owner_side(site_id) and added_by = (select auth.uid())));

-- -----------------------------------------------------------------------------
-- Payment settings (nothing secret here: these end up on the public website)
-- -----------------------------------------------------------------------------
create type public.payment_provider as enum ('razorpay', 'cashfree', 'phonepe', 'payu', 'stripe');

create table public.site_payment_settings (
  site_id uuid primary key,
  organisation_id uuid not null,
  whatsapp_enabled boolean not null default true,
  upi_enabled boolean not null default false,
  upi_vpa text check (upi_vpa is null or upi_vpa ~ '^[a-zA-Z0-9._-]{2,255}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$'),
  upi_payee_name text check (upi_payee_name is null or char_length(upi_payee_name) between 2 and 100),
  cod_enabled boolean not null default false,
  cod_max_paise bigint check (cod_max_paise is null or cod_max_paise > 0),
  online_enabled boolean not null default false,
  online_provider public.payment_provider,
  online_mode text not null default 'test' check (online_mode in ('test', 'live')),
  -- Public identifiers only (e.g. Razorpay key id or account id). Secrets live in site_payment_secrets.
  provider_public_id text check (provider_public_id is null or char_length(provider_public_id) <= 200),
  provider_connected_at timestamptz,
  provider_connected_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  check (not upi_enabled or upi_vpa is not null),
  check (not online_enabled or (online_provider is not null and provider_connected_at is not null)),
  foreign key (site_id, organisation_id) references public.sites (id, organisation_id) on delete cascade
);

create trigger fill_org before insert on public.site_payment_settings
  for each row execute function private.fill_org_from_site();
create trigger set_updated_at before update on public.site_payment_settings
  for each row execute function private.set_updated_at();
create trigger lock_tenancy before update on public.site_payment_settings
  for each row execute function private.lock_tenancy('organisation_id', 'site_id');
create trigger audit after insert or update or delete on public.site_payment_settings
  for each row execute function private.audit();
alter table public.site_payment_settings enable row level security;

create policy "agency and business owner see payment settings" on public.site_payment_settings for select to authenticated
  using (private.is_site_owner_side(site_id));
create policy "agency and business owner create payment settings" on public.site_payment_settings for insert to authenticated
  with check (private.is_site_owner_side(site_id));
create policy "agency and business owner change payment settings" on public.site_payment_settings for update to authenticated
  using (private.is_site_owner_side(site_id)) with check (private.is_site_owner_side(site_id));

-- -----------------------------------------------------------------------------
-- Payment secrets: encrypted by the app before they arrive here (AES-256-GCM,
-- key held only by the server). Nobody can read this table through the
-- security rules — not the agency owner, not the business owner. Only the
-- server's payment code (Phase 6) reads it, through a separate trusted path.
-- -----------------------------------------------------------------------------
create table public.site_payment_secrets (
  site_id uuid not null,
  organisation_id uuid not null,
  provider public.payment_provider not null,
  ciphertext text not null check (char_length(ciphertext) between 20 and 20000),
  hint text not null default '' check (char_length(hint) <= 40),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (site_id, provider),
  foreign key (site_id, organisation_id) references public.sites (id, organisation_id) on delete cascade
);
create trigger audit after insert or update or delete on public.site_payment_secrets
  for each row execute function private.audit();
alter table public.site_payment_secrets enable row level security;
-- (no policies: no direct access for anyone)
revoke all on public.site_payment_secrets from anon, authenticated;

-- Save (or replace) a site's encrypted payment credentials and mark the provider connected.
create function public.save_payment_credentials(
  p_site_id uuid, p_provider public.payment_provider, p_ciphertext text, p_hint text, p_public_id text, p_mode text
) returns void
language plpgsql security definer set search_path = '' as $$
declare org uuid;
begin
  if not private.is_site_owner_side(p_site_id) then
    raise exception 'Only your agency or the business owner can connect payments.' using errcode = 'SF001';
  end if;
  if p_mode not in ('test', 'live') then
    raise exception 'Choose test mode or live mode.' using errcode = 'SF001';
  end if;
  select organisation_id into org from public.sites where id = p_site_id;
  insert into public.site_payment_secrets (site_id, organisation_id, provider, ciphertext, hint, updated_by)
  values (p_site_id, org, p_provider, p_ciphertext, coalesce(p_hint, ''), auth.uid())
  on conflict (site_id, provider) do update
    set ciphertext = excluded.ciphertext, hint = excluded.hint, updated_by = excluded.updated_by, updated_at = now();
  insert into public.site_payment_settings (site_id, online_provider, provider_public_id, online_mode, provider_connected_at, provider_connected_by)
  values (p_site_id, p_provider, p_public_id, p_mode, now(), auth.uid())
  on conflict (site_id) do update
    set online_provider = excluded.online_provider, provider_public_id = excluded.provider_public_id,
        online_mode = excluded.online_mode, provider_connected_at = now(), provider_connected_by = auth.uid();
end $$;
revoke execute on function public.save_payment_credentials from public, anon;
grant execute on function public.save_payment_credentials to authenticated;

-- Disconnect: deletes the stored credentials and switches online payments off.
create function public.disconnect_payment_provider(p_site_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_site_owner_side(p_site_id) then
    raise exception 'Only your agency or the business owner can change payments.' using errcode = 'SF001';
  end if;
  delete from public.site_payment_secrets where site_id = p_site_id;
  update public.site_payment_settings
    set online_enabled = false, online_provider = null, provider_public_id = null,
        provider_connected_at = null, provider_connected_by = null
  where site_id = p_site_id;
end $$;
revoke execute on function public.disconnect_payment_provider from public, anon;
grant execute on function public.disconnect_payment_provider to authenticated;

-- What people may see about stored credentials: which provider, when, and a short hint.
create function public.payment_credentials_status(p_site_id uuid)
returns table (provider public.payment_provider, hint text, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select s.provider, s.hint, s.updated_at from public.site_payment_secrets s
  where s.site_id = p_site_id and private.is_site_owner_side(p_site_id)
$$;
revoke execute on function public.payment_credentials_status from public, anon;
grant execute on function public.payment_credentials_status to authenticated;

grant select, insert, update, delete on public.site_references to authenticated;
grant select, insert, update on public.site_payment_settings to authenticated;
grant all on public.site_references, public.site_payment_settings, public.site_payment_secrets to service_role;
