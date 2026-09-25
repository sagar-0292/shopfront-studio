-- =============================================================================
-- Phase 2: every website is pinned to a version of the motion kit and the
-- commerce kit. It stays on that version until the agency OWNER upgrades it
-- (after seeing a before/after comparison). Team members can't change it.
-- =============================================================================
alter table public.sites
  add column motion_kit_version text not null default '1.0.0'
    check (motion_kit_version ~ '^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$'),
  add column commerce_kit_version text not null default '1.0.0'
    check (commerce_kit_version ~ '^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$');

-- Runs with the caller's own role so trusted database functions aren't blocked.
create function private.guard_kit_versions() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon')
     and (new.motion_kit_version is distinct from old.motion_kit_version
          or new.commerce_kit_version is distinct from old.commerce_kit_version)
     and not private.is_org_owner(new.organisation_id) then
    raise exception 'Only the agency owner can change which kit version a website uses.' using errcode = 'SF001';
  end if;
  return new;
end $$;

create trigger guard_kit_versions before update on public.sites
  for each row execute function private.guard_kit_versions();
