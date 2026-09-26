-- ===========================================================================
-- Creator Lock — move quota and size enforcement into the database
--
-- Every browser holds the anon key and the user's own JWT, so PostgREST and
-- the Storage API are directly reachable. That makes the checks in the route
-- handlers advisory: a client can insert an `assets` row with any
-- file_size_bytes it likes, or push objects straight into its own storage
-- prefix, and never touch our API.
--
-- Enforcement therefore belongs here, where it applies to every path:
--   * file_size_bytes is overwritten from the real stored object, so a
--     client-asserted size is ignored entirely;
--   * the plan limit is checked inside the insert, under a per-user lock, so
--     concurrent finalises cannot each read the same pre-insert total and all
--     pass (the TOCTOU that let four parallel 4 GiB uploads land on a 5 GiB
--     plan);
--   * storage objects are checked on their way in, so bypassing the metadata
--     table entirely does not buy free storage.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- The allowance a user is actually entitled to right now.
--
-- Mirrors effectivePlan() in src/lib/plans.ts: a paid tier only counts while
-- the subscription is in good standing, otherwise the free allowance applies.
-- ---------------------------------------------------------------------------
create or replace function public.user_storage_limit(target_user uuid)
returns bigint
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (
      select p.storage_limit_bytes
      from public.subscriptions s
      join public.plans p on p.tier = s.plan
      where s.user_id = target_user
        and (s.plan = 'free' or s.status in ('active', 'trialing', 'past_due'))
    ),
    (select storage_limit_bytes from public.plans where tier = 'free')
  );
$$;

-- ---------------------------------------------------------------------------
-- Real bytes held under a user's storage prefix.
-- ---------------------------------------------------------------------------
create or replace function public.user_stored_bytes(target_user uuid)
returns bigint
language sql
stable
security definer
set search_path = public, storage, pg_temp
as $$
  select coalesce(sum((o.metadata ->> 'size')::bigint), 0)::bigint
  from storage.objects o
  where o.bucket_id = 'vault'
    and (storage.foldername(o.name))[1] = target_user::text;
$$;

-- ---------------------------------------------------------------------------
-- assets: authoritative size + quota, enforced on insert.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_asset_quota()
returns trigger
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
declare
  real_size  bigint;
  used_bytes bigint;
  limit_bytes bigint;
begin
  -- The object must exist, and must sit under the inserting user's prefix.
  select (o.metadata ->> 'size')::bigint
    into real_size
  from storage.objects o
  where o.bucket_id = 'vault'
    and o.name = new.storage_key
    and (storage.foldername(o.name))[1] = new.user_id::text;

  if real_size is null then
    raise exception 'No stored object for that key, or it does not belong to this user'
      using errcode = 'check_violation';
  end if;

  -- Size is taken from storage, never from the client.
  new.file_size_bytes := real_size;

  -- Serialise concurrent inserts for this user so the sum below cannot be read
  -- by several transactions before any of them commits.
  perform 1 from public.subscriptions where user_id = new.user_id for update;

  select coalesce(sum(a.file_size_bytes), 0) into used_bytes
  from public.assets a
  where a.user_id = new.user_id
    and a.id is distinct from new.id;

  limit_bytes := public.user_storage_limit(new.user_id);

  if used_bytes + real_size > limit_bytes then
    raise exception 'Storage limit exceeded: % of % bytes already used, file is % bytes',
      used_bytes, limit_bytes, real_size
      using errcode = 'disk_full';
  end if;

  return new;
end;
$$;

drop trigger if exists assets_enforce_quota on public.assets;
create trigger assets_enforce_quota
  before insert on public.assets
  for each row execute function public.enforce_asset_quota();

-- ---------------------------------------------------------------------------
-- storage.objects: quota on the way in, so skipping the metadata table
-- entirely does not buy free storage.
--
-- Deliberately permissive when the size is not yet known: some storage paths
-- populate metadata after the row lands, and blocking those would break real
-- uploads. Objects that slip through are still charged against the user by
-- user_stored_bytes(), and unreferenced ones are swept by the application.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_storage_quota()
returns trigger
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
declare
  owner_id    uuid;
  new_size    bigint;
  used_bytes  bigint;
  limit_bytes bigint;
begin
  if new.bucket_id is distinct from 'vault' then
    return new;
  end if;

  begin
    owner_id := ((storage.foldername(new.name))[1])::uuid;
  exception when others then
    return new; -- not an owner-prefixed key; the RLS policies already reject it
  end;

  new_size := nullif(new.metadata ->> 'size', '')::bigint;
  if new_size is null then
    return new;
  end if;

  used_bytes  := public.user_stored_bytes(owner_id);
  limit_bytes := public.user_storage_limit(owner_id);

  if used_bytes + new_size > limit_bytes then
    raise exception 'Storage limit exceeded'
      using errcode = 'disk_full';
  end if;

  return new;
end;
$$;

drop trigger if exists vault_enforce_storage_quota on storage.objects;
create trigger vault_enforce_storage_quota
  before insert on storage.objects
  for each row execute function public.enforce_storage_quota();

-- ---------------------------------------------------------------------------
-- Restrict the bucket to the types the application accepts, so the allowlist
-- (notably the deliberate exclusion of SVG, which can carry script) is
-- enforced on the stored bytes and not only on what the client claimed.
-- ---------------------------------------------------------------------------
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg','image/png','image/gif','image/webp','image/avif','image/heic','image/heif','image/tiff',
  'video/mp4','video/quicktime','video/webm','video/x-matroska','video/x-msvideo',
  'audio/mpeg','audio/mp4','audio/wav','audio/x-wav','audio/aac','audio/ogg','audio/flac','audio/x-flac',
  'application/pdf','text/plain','text/markdown','text/csv','text/vtt','application/json',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip'
]
where id = 'vault';

-- ---------------------------------------------------------------------------
-- profiles.email must not be user-writable.
--
-- Nothing authorises on it today (/admin reads auth.users.email), but leaving
-- it freely writable invites a future feature to trust a value the user
-- controls.
--
-- Done with a column-level grant rather than a policy predicate: a WITH CHECK
-- that compares against auth.users would require the `authenticated` role to
-- SELECT that table, which it cannot do — the policy would fail closed and
-- block legitimate profile edits too.
-- ---------------------------------------------------------------------------
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

-- Reset the policy to the plain ownership predicate. The column grant above is
-- what keeps `email` read-only, so the policy must not also try to read
-- auth.users — the `authenticated` role cannot select from it.
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
