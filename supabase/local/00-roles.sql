-- Recreates the database roles and schemas that a hosted Supabase project
-- already has, so a plain local Postgres behaves the same way.
-- Safe to run more than once. NOT needed (and not run) on hosted Supabase.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
  -- The web app's own login. It can do nothing by itself except switch to
  -- "authenticated" (a logged-in person) or "anon" (a visitor), so every
  -- query it runs is checked by the security rules. See SETUP.md.
  if not exists (select 1 from pg_roles where rolname = 'shopfront_app') then
    create role shopfront_app login noinherit password 'app-local-only';
  end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    create role supabase_auth_admin login createrole noinherit password 'auth-local-only';
  end if;
end $$;

grant anon, authenticated, service_role to current_user;
grant anon, authenticated to shopfront_app;

create schema if not exists extensions;
grant usage on schema extensions to anon, authenticated, service_role;
create extension if not exists pgcrypto with schema extensions;

create schema if not exists auth authorization supabase_auth_admin;
grant usage on schema auth to anon, authenticated, service_role, postgres;
do $$ begin execute format('grant create on database %I to supabase_auth_admin', current_database()); end $$;
alter role supabase_auth_admin set search_path = auth;
