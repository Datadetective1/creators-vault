-- ===========================================================================
-- shim.sql — local stand-in for the Supabase-managed infrastructure that
-- creators-vault's six migrations depend on but do not create.
--
-- Applied to a FRESH database BEFORE supabase/migrations/0001..0006, as the
-- cluster superuser (postgres). Nothing here may be confused with the artefact
-- under test: this file creates ONLY objects that hosted Supabase would already
-- have provided (auth schema, storage schema, the three PostgREST roles,
-- auth.uid(), storage.foldername(), and Supabase's blanket default privileges).
--
-- Deliberate invariants, asserted at the bottom of this file so a later agent
-- cannot silently lose them:
--   * anon / authenticated / service_role are NOT superuser and NOT bypassrls,
--     so RLS actually applies to them. A bypassing role would make every
--     isolation test pass vacuously.
--   * RLS is ENABLED on storage.objects. Migration 0002 adds four policies to
--     that table but never enables RLS; Postgres silently ignores policies on a
--     table with relrowsecurity = false. Hosted Supabase ships it enabled, so
--     the shim ships it enabled too — and this is itself a finding about 0002.
--   * storage.foldername() must return {abc} for 'abc/def.jpg'; index [1] is
--     the ownership claim in five DB predicates and four app sites.
-- ===========================================================================

\set ON_ERROR_STOP on

-- Hosted Supabase preinstalls pgcrypto in schema `extensions`, so 0001's bare
-- `create extension if not exists "pgcrypto"` (no SCHEMA clause) is a no-op
-- there. Reproduce that: install it into `extensions` here, so 0001 no-ops and
-- does NOT drop ~30 pgcrypto functions into schema public the way it does on a
-- virgin database. gen_random_uuid() is in pg_catalog on PG13+, so every
-- `default gen_random_uuid()` in the migrations still resolves.
create schema if not exists extensions;
create extension if not exists "pgcrypto" with schema extensions;

-- ---------------------------------------------------------------------------
-- 1. Roles. NOLOGIN NOINHERIT, and explicitly NOSUPERUSER NOBYPASSRLS.
--    Roles are cluster-wide, so these may already exist from an earlier run.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit nosuperuser nobypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit nosuperuser nobypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit nosuperuser nobypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_storage_admin') then
    create role supabase_storage_admin nologin noinherit nosuperuser nobypassrls;
  end if;
end
$$;

-- Idempotent re-assertion: if a previous harness run (or another agent) created
-- these roles with bypassrls, strip it. This is the single most important
-- property of the whole harness.
alter role anon                   nosuperuser nobypassrls;
alter role authenticated          nosuperuser nobypassrls;
alter role service_role           nosuperuser nobypassrls;
alter role supabase_storage_admin nosuperuser nobypassrls;

-- ---------------------------------------------------------------------------
-- 2. Schemas.
-- ---------------------------------------------------------------------------
create schema if not exists auth;
create schema if not exists storage;

-- ---------------------------------------------------------------------------
-- 3. auth.users — FK target for profiles.id, subscriptions.user_id,
--    assets.user_id, checkout_sessions.user_id (all ON DELETE CASCADE), and
--    the table 0001 puts an AFTER INSERT trigger on. handle_new_user() reads
--    new.id, new.email and new.raw_user_meta_data ->> 'display_name'.
--
--    email is NULLABLE here, matching real GoTrue (phone-only signups and
--    anonymous sign-ins leave it NULL). That is deliberate: it preserves the
--    latent "profiles.email is NOT NULL so a NULL-email signup aborts" defect
--    instead of hiding it behind a shim-side NOT NULL.
-- ---------------------------------------------------------------------------
create table if not exists auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text,
  raw_user_meta_data jsonb,
  created_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4. auth.uid() with Supabase's real semantics: the `sub` claim, read first
--    from the flattened GUC and then from the whole-claims JSON blob. Tests
--    impersonate a user with either
--      set local request.jwt.claim.sub = '<uuid>';
--    or
--      select set_config('request.jwt.claims', '{"sub":"<uuid>"}', true);
--    Returns NULL when neither is set, which is what makes every
--    `(select auth.uid()) = user_id` predicate fail closed.
-- ---------------------------------------------------------------------------
create or replace function auth.uid() returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

-- Not referenced by any of the six migrations; provided because the real auth
-- schema has them and later probes may want them. Same GUC sources.
create or replace function auth.role() returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )
$$;

create or replace function auth.email() returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )
$$;

create or replace function auth.jwt() returns jsonb
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb,
    '{}'::jsonb
  )
$$;

-- ---------------------------------------------------------------------------
-- 5. storage.buckets — 0002 INSERTs ... ON CONFLICT (id) DO UPDATE (so id must
--    carry a PK/unique), 0004 UPDATEs allowed_mime_types.
-- ---------------------------------------------------------------------------
create table if not exists storage.buckets (
  id                 text primary key,
  name               text not null,
  owner              uuid,
  public             boolean not null default false,
  avif_autodetection boolean not null default false,
  file_size_limit    bigint,
  allowed_mime_types text[],
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Real Supabase has RLS on with no policies for end users; the Storage API
-- talks to this table as supabase_storage_admin. Owner (postgres) bypasses RLS,
-- so 0002's INSERT and 0004's UPDATE are unaffected.
alter table storage.buckets enable row level security;

-- ---------------------------------------------------------------------------
-- 6. storage.objects — 0002 puts four policies on it, 0004 a BEFORE INSERT
--    trigger, and user_stored_bytes()/enforce_asset_quota() read
--    metadata ->> 'size'. The (bucket_id, name) unique index mirrors real
--    Supabase and is what makes enforce_asset_quota's single-row lookup sound.
-- ---------------------------------------------------------------------------
create table if not exists storage.objects (
  id         uuid primary key default gen_random_uuid(),
  bucket_id  text references storage.buckets (id),
  name       text,
  owner      uuid,
  metadata   jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists objects_bucketid_objname
  on storage.objects (bucket_id, name);

-- CRITICAL. Migration 0002 creates four policies on this table and never runs
-- `alter table storage.objects enable row level security`. Without this line
-- those policies are inert and cross-user reads succeed. Hosted Supabase ships
-- it enabled, so the shim must too — otherwise every isolation test here is a
-- vacuous pass.
alter table storage.objects enable row level security;

-- ---------------------------------------------------------------------------
-- 7. storage.foldername — Supabase's real definition. For 'abc/def.jpg' it
--    returns {abc}; for a key with no '/' it returns an EMPTY array, so [1] is
--    NULL. Both behaviours are load-bearing for the migrations under test.
-- ---------------------------------------------------------------------------
create or replace function storage.foldername(name text) returns text[]
language plpgsql
immutable
as $$
declare
  _parts text[];
begin
  select string_to_array(name, '/') into _parts;
  return _parts[1 : array_length(_parts, 1) - 1];
end
$$;

-- Not used by the six migrations; present because the real storage schema has
-- them and app-shaped probes may reach for them.
create or replace function storage.filename(name text) returns text
language plpgsql
immutable
as $$
declare
  _parts text[];
begin
  select string_to_array(name, '/') into _parts;
  return _parts[array_length(_parts, 1)];
end
$$;

create or replace function storage.extension(name text) returns text
language plpgsql
immutable
as $$
declare
  _parts text[];
  _fn    text;
begin
  select string_to_array(name, '/') into _parts;
  _fn := _parts[array_length(_parts, 1)];
  _parts := string_to_array(_fn, '.');
  return _parts[array_length(_parts, 1)];
end
$$;

-- ---------------------------------------------------------------------------
-- 8. Supabase's blanket default privileges.
--
--    None of the six migrations grants SELECT/INSERT/DELETE on any public table
--    to anon or authenticated, and 0003/0005 revoke function EXECUTE from
--    public+anon+authenticated WITHOUT re-granting to service_role. The whole
--    app therefore depends on these grants already existing. Without them the
--    later RLS tests would fail with "permission denied for table ..." — a
--    FALSE NEGATIVE that must not be mistaken for isolation.
--
--    ALTER DEFAULT PRIVILEGES is the mechanism, deliberately, because it covers
--    tables and functions the migrations create AFTER this file runs. That is
--    why setup-db.sh does NOT re-run a blanket `grant all on all tables` after
--    the migrations: doing so would silently restore full UPDATE on
--    public.profiles to `authenticated` and destroy migration 0004's
--    column-grant control (revoke update on profiles; grant update
--    (display_name)). See setup-db.sh step 4, which ASSERTS that control held.
-- ---------------------------------------------------------------------------
grant usage on schema public     to anon, authenticated, service_role;
grant usage on schema extensions to anon, authenticated, service_role;
grant usage on schema auth    to anon, authenticated, service_role;
grant usage on schema storage to anon, authenticated, service_role;

-- Objects existing right now (the shim's own auth/storage tables).
grant all on all tables    in schema public  to anon, authenticated, service_role;
grant all on all sequences in schema public  to anon, authenticated, service_role;
grant all on all functions in schema public  to anon, authenticated, service_role;
grant all on all functions in schema auth    to anon, authenticated, service_role;
grant all on all functions in schema storage to anon, authenticated, service_role;

-- Objects created LATER, i.e. everything the six migrations make.
alter default privileges in schema public  grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public  grant all on functions to anon, authenticated, service_role;
alter default privileges in schema storage grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema storage grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema storage grant all on functions to anon, authenticated, service_role;

-- Storage tables specifically: RLS is the intended gate on objects, so the DML
-- privileges must be present for anon/authenticated or the policies never get
-- a chance to run. buckets stays read-only to end users.
grant select, insert, update, delete on storage.objects to anon, authenticated;
grant all                            on storage.objects to service_role, supabase_storage_admin;
grant select                         on storage.buckets to anon, authenticated;
grant all                            on storage.buckets to service_role, supabase_storage_admin;

-- auth.users is NOT readable by anon/authenticated on hosted Supabase; 0004's
-- comment about the profiles WITH CHECK depends on exactly that. Only
-- service_role gets in.
grant select on auth.users to service_role;

-- ---------------------------------------------------------------------------
-- 9. Self-assertions. These make the shim's contract enforced, not documented.
-- ---------------------------------------------------------------------------
do $$
declare
  bad text;
begin
  select string_agg(rolname, ', ') into bad
  from pg_roles
  where rolname in ('anon', 'authenticated', 'service_role', 'supabase_storage_admin')
    and (rolsuper or rolbypassrls);
  if bad is not null then
    raise exception 'SHIM CONTRACT VIOLATION: role(s) % are superuser or bypassrls; RLS tests would pass vacuously', bad;
  end if;

  if (select count(*) from pg_roles
      where rolname in ('anon', 'authenticated', 'service_role', 'supabase_storage_admin')) <> 4 then
    raise exception 'SHIM CONTRACT VIOLATION: not all four roles exist';
  end if;

  if storage.foldername('abc/def.jpg') is distinct from array['abc']::text[] then
    raise exception 'SHIM CONTRACT VIOLATION: storage.foldername(''abc/def.jpg'') = %, expected {abc}',
      storage.foldername('abc/def.jpg');
  end if;

  if (storage.foldername('1111/a.png'))[1] is distinct from '1111' then
    raise exception 'SHIM CONTRACT VIOLATION: foldername index [1] is not the owner segment';
  end if;

  if array_length(storage.foldername('toplevel.png'), 1) is not null then
    raise exception 'SHIM CONTRACT VIOLATION: foldername of a slashless key must be an empty array';
  end if;

  if not (select relrowsecurity from pg_class
          where oid = 'storage.objects'::regclass) then
    raise exception 'SHIM CONTRACT VIOLATION: RLS is not enabled on storage.objects';
  end if;

  if auth.uid() is not null then
    raise exception 'SHIM CONTRACT VIOLATION: auth.uid() must be NULL with no JWT GUC set';
  end if;

  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  if auth.uid() <> '11111111-1111-1111-1111-111111111111'::uuid then
    raise exception 'SHIM CONTRACT VIOLATION: auth.uid() does not read request.jwt.claim.sub';
  end if;
  perform set_config('request.jwt.claim.sub', '', true);

  perform set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true);
  if auth.uid() <> '22222222-2222-2222-2222-222222222222'::uuid then
    raise exception 'SHIM CONTRACT VIOLATION: auth.uid() does not read request.jwt.claims JSON';
  end if;
  perform set_config('request.jwt.claims', '', true);

  raise notice 'shim.sql: all contract assertions passed';
end
$$;
