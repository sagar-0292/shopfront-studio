-- =============================================================================
-- Designs: each website has a design direction (its look) and is pinned to a
-- version of the design kit, like the motion and commerce kits.
-- Anyone in the agency can choose the look; only the agency OWNER can change
-- which kit version a website uses. Clients cannot change either.
-- =============================================================================
create type public.design_direction as enum ('editorial', 'bold', 'cinematic', 'crafted');

alter table public.sites
  add column design_direction public.design_direction,
  add column design_kit_version text not null default '1.0.0'
    check (design_kit_version ~ '^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$');

create or replace function private.guard_kit_versions() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon')
     and (new.motion_kit_version is distinct from old.motion_kit_version
          or new.commerce_kit_version is distinct from old.commerce_kit_version
          or new.design_kit_version is distinct from old.design_kit_version)
     and not private.is_org_owner(new.organisation_id) then
    raise exception 'Only the agency owner can change which kit version a website uses.' using errcode = 'SF001';
  end if;
  return new;
end $$;
