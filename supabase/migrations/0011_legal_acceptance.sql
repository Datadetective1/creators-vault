-- ===========================================================================
-- 0011 — Terms, Privacy and upload-rights acceptance, enforced on upload
--
-- A user must accept the current Terms of Service, the current Privacy Policy
-- and an upload-rights acknowledgement before their first upload, and again
-- whenever one of those documents changes materially (its version is bumped).
--
-- Where it is stored
--   legal_documents   one row per consent type, holding the CURRENT version.
--                     Bumping a version here is what forces re-acceptance.
--   legal_acceptances one row per (user, consent type, version) accepted, with
--                     a server timestamp. No IP address, user agent or device
--                     data is collected: the authenticated user id is the
--                     attribution.
--
-- How it is written
--   Only through accept_legal_documents(), a SECURITY DEFINER function that
--   takes auth.uid() as the user, so a caller can never record consent for
--   someone else, and that refuses a version that is not current, so a stale
--   page cannot record consent to a document that has since changed.
--   authenticated has SELECT on its own rows and nothing else.
--
-- How it is enforced
--   BEFORE INSERT triggers on BOTH places an upload can land:
--     * storage.objects (bucket 'vault') — the bytes. This covers the app's
--       signed upload URLs, a browser talking to the Storage API directly with
--       the anon key and its JWT, retries and multipart/resumable uploads,
--       since every one of them ends in an INSERT here. The owner is read from
--       the key prefix, as enforce_storage_quota does, so it applies even when
--       storage-api writes the row with no auth.uid().
--     * public.assets — the row that makes a file appear in the library.
--   Cross-user attempts defer to RLS (same oracle reasoning as 0007).
--   Existing objects and rows are untouched: only new uploads are gated.
--
-- Re-runnable.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Current versions
-- ---------------------------------------------------------------------------
create table if not exists public.legal_documents (
  consent_type    text primary key
                  check (consent_type in ('terms', 'privacy', 'upload_rights')),
  current_version text        not null check (length(current_version) between 1 and 40),
  updated_at      timestamptz not null default now()
);

-- Must match TERMS_VERSION / PRIVACY_VERSION / UPLOAD_RIGHTS_VERSION in
-- src/lib/legal.ts. An e2e test asserts the two agree.
insert into public.legal_documents (consent_type, current_version) values
  ('terms',         '2026-10-06'),
  ('privacy',       '2026-10-06'),
  ('upload_rights', '2026-10-06')
on conflict (consent_type) do nothing;

alter table public.legal_documents enable row level security;

drop policy if exists "legal_documents: readable" on public.legal_documents;
create policy "legal_documents: readable"
  on public.legal_documents for select
  to anon, authenticated
  using (true);

revoke insert, update, delete, truncate, trigger, references
  on public.legal_documents from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Acceptance records
-- ---------------------------------------------------------------------------
create table if not exists public.legal_acceptances (
  id           bigint generated always as identity primary key,
  user_id      uuid        not null references auth.users (id) on delete cascade,
  consent_type text        not null
               check (consent_type in ('terms', 'privacy', 'upload_rights')),
  version      text        not null check (length(version) between 1 and 40),
  accepted_at  timestamptz not null default now(),
  unique (user_id, consent_type, version)
);

alter table public.legal_acceptances enable row level security;

drop policy if exists "legal_acceptances: read own" on public.legal_acceptances;
create policy "legal_acceptances: read own"
  on public.legal_acceptances for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Read-only to users: the record is written by accept_legal_documents() only,
-- and is never edited or deleted from the client.
revoke insert, update, delete, truncate, trigger, references
  on public.legal_acceptances from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Has this user accepted every current document?
-- ---------------------------------------------------------------------------
create or replace function public.has_current_upload_consent(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select target_user is not null
     and not exists (
       select 1
       from public.legal_documents d
       where not exists (
         select 1
         from public.legal_acceptances a
         where a.user_id = target_user
           and a.consent_type = d.consent_type
           and a.version = d.current_version
       )
     );
$$;

revoke all on function public.has_current_upload_consent(uuid) from public, anon, authenticated;

-- The caller's own status, for the UI. Never takes a user id.
create or replace function public.upload_consent_status()
returns table (
  accepted              boolean,
  terms_version         text,
  privacy_version       text,
  upload_rights_version text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.has_current_upload_consent(auth.uid()),
         (select current_version from public.legal_documents where consent_type = 'terms'),
         (select current_version from public.legal_documents where consent_type = 'privacy'),
         (select current_version from public.legal_documents where consent_type = 'upload_rights');
$$;

revoke all on function public.upload_consent_status() from public, anon;
grant execute on function public.upload_consent_status() to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Record acceptance
-- ---------------------------------------------------------------------------
create or replace function public.accept_legal_documents(
  p_terms_version         text,
  p_privacy_version       text,
  p_upload_rights_version text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  -- Consent is to a specific text. If the page the user read is out of date,
  -- refuse rather than record agreement to a version they never saw.
  if p_terms_version is distinct from
       (select current_version from public.legal_documents where consent_type = 'terms')
     or p_privacy_version is distinct from
       (select current_version from public.legal_documents where consent_type = 'privacy')
     or p_upload_rights_version is distinct from
       (select current_version from public.legal_documents where consent_type = 'upload_rights')
  then
    raise exception 'The Terms or Privacy Policy have changed. Please review the current version.'
      using errcode = 'check_violation';
  end if;

  insert into public.legal_acceptances (user_id, consent_type, version) values
    (caller, 'terms',         p_terms_version),
    (caller, 'privacy',       p_privacy_version),
    (caller, 'upload_rights', p_upload_rights_version)
  on conflict (user_id, consent_type, version) do nothing;
end;
$$;

revoke all on function public.accept_legal_documents(text, text, text) from public, anon;
grant execute on function public.accept_legal_documents(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Enforcement on storage.objects (the bytes)
-- ---------------------------------------------------------------------------
create or replace function public.enforce_upload_consent_storage()
returns trigger
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
declare
  owner_id uuid;
  caller   uuid := auth.uid();
begin
  if new.bucket_id is distinct from 'vault' then
    return new;
  end if;

  begin
    owner_id := ((storage.foldername(new.name))[1])::uuid;
  exception when others then
    owner_id := null;
  end;

  -- Unattributable keys are refused by enforce_storage_quota; nothing to add.
  if owner_id is null then
    return new;
  end if;

  -- Not the caller's prefix: let RLS reject it, so the error carries no signal.
  if caller is not null and owner_id is distinct from caller then
    return new;
  end if;

  if not public.has_current_upload_consent(owner_id) then
    raise exception 'Accept the Terms of Service and Privacy Policy before uploading'
      using errcode = '42501', hint = 'consent_required';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_upload_consent_storage() from public, anon, authenticated;

drop trigger if exists vault_require_upload_consent on storage.objects;
create trigger vault_require_upload_consent
  before insert on storage.objects
  for each row execute function public.enforce_upload_consent_storage();

-- ---------------------------------------------------------------------------
-- 6. Enforcement on public.assets (the library row)
-- ---------------------------------------------------------------------------
create or replace function public.enforce_upload_consent_asset()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is not null and new.user_id is distinct from caller then
    return new;
  end if;

  if not public.has_current_upload_consent(new.user_id) then
    raise exception 'Accept the Terms of Service and Privacy Policy before uploading'
      using errcode = '42501', hint = 'consent_required';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_upload_consent_asset() from public, anon, authenticated;

drop trigger if exists assets_require_upload_consent on public.assets;
create trigger assets_require_upload_consent
  before insert on public.assets
  for each row execute function public.enforce_upload_consent_asset();
