-- ===========================================================================
-- 0008 — make 0007's storage.objects hardening apply on hosted Supabase
--
-- 0007 section 6 wraps its storage DDL in one block with an
-- insufficient_privilege handler, and opens that block with
-- `alter table storage.objects enable row level security`. On a hosted project
-- storage.objects is owned by supabase_storage_admin, and the migration role
-- (`postgres`) is not a member of it, so that ALTER raises 42501. The handler
-- then rolls back the entire block: the four vault policies keep 0002's
-- foldername() predicate, and vault_enforce_storage_quota stays BEFORE INSERT
-- only. 0007 still reports success, with the policy and trigger work skipped.
--
-- Measured on the live creator-lock project with a rolled-back dry run: the
-- ALTER is the only statement that fails. DROP/CREATE POLICY and DROP/CREATE
-- TRIGGER on storage.objects both succeed as `postgres`.
--
-- So this is 0007 section 6 again, verbatim, except that RLS is enabled only
-- when it is actually off. Hosted Supabase ships storage.objects with RLS on,
-- so there the ALTER is skipped and everything else lands. On a database where
-- RLS is off and the role cannot turn it on, the 42501 still propagates and
-- the whole migration fails loudly — a policy set that Postgres is silently
-- ignoring is not a state to report success over.
--
-- Re-runnable: every statement is drop-if-exists / create.
-- ===========================================================================

do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'storage.objects'::regclass) then
    alter table storage.objects enable row level security;
  end if;
end$$;

drop policy if exists "vault: read own objects" on storage.objects;
create policy "vault: read own objects"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'vault'
    and name ~ ('^' || (select auth.uid())::text || '/[A-Za-z0-9._-]{1,200}$')
  );

drop policy if exists "vault: upload own objects" on storage.objects;
create policy "vault: upload own objects"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'vault'
    and name ~ ('^' || (select auth.uid())::text || '/[A-Za-z0-9._-]{1,200}$')
  );

drop policy if exists "vault: update own objects" on storage.objects;
create policy "vault: update own objects"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'vault'
    and name ~ ('^' || (select auth.uid())::text || '/[A-Za-z0-9._-]{1,200}$')
  )
  with check (
    bucket_id = 'vault'
    and name ~ ('^' || (select auth.uid())::text || '/[A-Za-z0-9._-]{1,200}$')
  );

drop policy if exists "vault: delete own objects" on storage.objects;
create policy "vault: delete own objects"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'vault'
    and name ~ ('^' || (select auth.uid())::text || '/[A-Za-z0-9._-]{1,200}$')
  );

drop trigger if exists vault_enforce_storage_quota on storage.objects;
create trigger vault_enforce_storage_quota
  before insert or update on storage.objects
  for each row execute function public.enforce_storage_quota();
