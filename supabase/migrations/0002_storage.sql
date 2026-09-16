-- ===========================================================================
-- Creator Vault — private storage bucket + per-user object isolation
--
-- Object key convention:  <user_id>/<random-uuid>.<ext>
-- The first path segment IS the owner. Every policy below pins that segment
-- to auth.uid(), so Postgres itself refuses cross-user access — the browser
-- is never trusted to filter.
-- ===========================================================================

-- Private bucket. `public = false` means there are no anonymous object URLs;
-- every read requires a short-lived signed URL minted server-side.
insert into storage.buckets (id, name, public, file_size_limit)
values ('vault', 'vault', false, 5368709120)  -- 5 GiB per-object ceiling
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit;

-- ---------------------------------------------------------------------------
-- storage.objects policies, scoped to the 'vault' bucket.
-- ---------------------------------------------------------------------------

drop policy if exists "vault: read own objects" on storage.objects;
create policy "vault: read own objects"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'vault'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "vault: upload own objects" on storage.objects;
create policy "vault: upload own objects"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'vault'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "vault: update own objects" on storage.objects;
create policy "vault: update own objects"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'vault'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'vault'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "vault: delete own objects" on storage.objects;
create policy "vault: delete own objects"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'vault'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Anonymous users get nothing: no policy grants `anon` any access to the
-- vault bucket, and the bucket is not public.
