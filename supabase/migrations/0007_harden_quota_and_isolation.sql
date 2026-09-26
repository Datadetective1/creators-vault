-- ===========================================================================
-- 0007 — close the quota bypasses and the cross-user oracles
--
-- Everything here was measured against real PostgreSQL 16 before being written,
-- by replaying 0001..0006 onto a Supabase-shaped harness (auth.users, auth.uid,
-- storage.objects, storage.foldername, the anon/authenticated/service_role
-- roles and Supabase's default blanket grants) and then attacking the result as
-- a non-superuser `authenticated` role. Each section names what it observed.
--
-- 0004's header states the design intent this file actually delivers: "file_size
-- _bytes is overwritten from the real stored object, so a client-asserted size
-- is ignored entirely" and "the plan limit is checked inside the insert, under a
-- per-user lock". Both were defeated in practice:
--
--   * the lock existed only on the assets path, and locked nothing at all for a
--     user with no subscriptions row (SELECT ... FOR UPDATE over zero rows takes
--     no lock);
--   * the storage path had no lock whatsoever — two concurrent 4 GiB inserts
--     both committed, 8 GiB accounted on a 5 GiB plan;
--   * the size the server trusts lives in a row the owner may UPDATE, so one
--     INSERT plus one UPDATE put a free user 20,000x over their limit;
--   * a negative declared size was accepted and permanently discounted usage,
--     needing only the INSERT the vault policy is designed to grant;
--   * an empty-string size was accepted on the way in but crashed the function
--     that sums usage, so further uploads by that user died on a cast error;
--   * an empty public.plans table made the limit NULL, and `used + size > NULL`
--     is not TRUE, so both triggers returned NEW and the quota ceased to exist.
--
-- Two further findings are closed here because they leak other users' data:
-- user_storage_limit(uuid) and user_stored_bytes(uuid) are SECURITY DEFINER,
-- take the target as an argument, check nothing, and were executable by anon —
-- a paying-customer oracle for anyone holding the key in the browser bundle.
-- And because both quota triggers fire BEFORE the RLS WITH CHECK, their error
-- code differed depending on whether the *victim* was at quota, which let any
-- caller binary-search another user's remaining headroom from error codes alone.
--
-- Nothing here changes the product's shape: same tables, same two plans, same
-- key convention, same upload path. It makes the guarantees already claimed in
-- 0004's comments actually hold.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. Usage accounting: tolerate what the writer tolerates, and never go negative
--
-- enforce_storage_quota used nullif(new.metadata ->> 'size', '')::bigint while
-- user_stored_bytes cast without the nullif. An object carrying {"size": ""}
-- therefore passed the trigger and then raised 22P02 in every later call for
-- that user. Blast radius was narrower than it first looked — user_stored_bytes
-- has exactly one caller in the schema (enforce_storage_quota), and the app's
-- own usage read goes through public.assets — but a user whose next upload dies
-- on "invalid input syntax for type bigint" is still broken, and fixing the
-- divergence costs one function.
--
-- greatest(..., 0) is the second half: a negatively-declared object can no
-- longer discount real usage even if one is already stored.
-- ---------------------------------------------------------------------------
create or replace function public.user_stored_bytes(target_user uuid)
returns bigint
language sql
stable
security definer
set search_path = public, storage, pg_temp
as $$
  select coalesce(
           sum(greatest(nullif(o.metadata ->> 'size', '')::bigint, 0)),
           0
         )::bigint
  from storage.objects o
  where o.bucket_id = 'vault'
    and (storage.foldername(o.name))[1] = target_user::text;
$$;


-- ---------------------------------------------------------------------------
-- 2. The allowance: fail closed when it cannot be determined
--
-- The old body coalesced to the free allowance and, if public.plans held no
-- free row at all, returned NULL. NULL then propagated into the comparison
-- `used_bytes + real_size > limit_bytes`, which is NULL rather than TRUE, so
-- both triggers accepted the row: an empty plans table silently switched off
-- quota enforcement for every user. Measured — a 100 TiB object was accepted.
--
-- A missing plans table is a broken deployment, not a licence to store without
-- limit, so it raises now. The ordinary fallback for a user with no
-- subscriptions row is unchanged and still returns the free allowance.
-- ---------------------------------------------------------------------------
create or replace function public.user_storage_limit(target_user uuid)
returns bigint
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  limit_bytes bigint;
begin
  select coalesce(
           (
             select p.storage_limit_bytes
             from public.subscriptions s
             join public.plans p on p.tier = s.plan
             where s.user_id = target_user
               and (s.plan = 'free' or s.status in ('active', 'trialing', 'past_due'))
           ),
           (select storage_limit_bytes from public.plans where tier = 'free')
         )
    into limit_bytes;

  if limit_bytes is null then
    raise exception
      'No storage allowance could be determined for % — public.plans is missing its free row', target_user
      using errcode = 'internal_error';
  end if;

  return limit_bytes;
end;
$$;


-- ---------------------------------------------------------------------------
-- 3. Both helpers become server-internal
--
-- They are SECURITY DEFINER, they take the target user as an argument, and
-- neither checks it against auth.uid(). Measured: user A read user B's creator
-- allowance (107374182400) and B's exact byte total while RLS correctly hid
-- every one of B's rows, and role anon with no JWT got the same two answers.
-- Because the return value differs for a paying and a non-paying uuid, it is a
-- reliable paying-customer oracle, and both have the single-scalar-argument
-- shape PostgREST publishes at /rest/v1/rpc/<name>.
--
-- Revoking EXECUTE is the whole fix and it costs nothing: the only callers are
-- the SECURITY DEFINER triggers below, which run as the function owner and so
-- are unaffected. my_storage_usage() remains the user-facing read — no
-- argument, SECURITY INVOKER, self-scoped through auth.uid() and RLS.
-- ---------------------------------------------------------------------------
revoke all on function public.user_storage_limit(uuid) from public;
revoke all on function public.user_stored_bytes(uuid) from public;
revoke all on function public.user_storage_limit(uuid) from anon, authenticated;
revoke all on function public.user_stored_bytes(uuid) from anon, authenticated;

-- Same treatment for the trigger functions. CREATE TRIGGER checks EXECUTE on
-- the function, and anon/authenticated hold TRIGGER on the public tables by
-- platform default, so a broad EXECUTE grant on a SECURITY DEFINER trigger
-- function is a privilege-escalation primitive: attach handle_new_user() to a
-- table you own and it writes public.profiles and public.subscriptions as the
-- owner, bypassing RLS and bypassing 0004's column grant on profiles.email.
-- Measured end to end. A trigger already attached keeps firing — EXECUTE is
-- checked when the trigger is created, not when it fires.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.enforce_asset_quota() from public, anon, authenticated;
revoke all on function public.enforce_storage_quota() from public, anon, authenticated;


-- ---------------------------------------------------------------------------
-- 4. assets: a lock that exists, a size and type taken from storage, and an
--    error that is not an oracle
--
-- Three changes to a function whose intent was already right:
--
-- (a) The serialisation guard was `perform 1 from public.subscriptions where
--     user_id = new.user_id for update`. FOR UPDATE over zero rows takes no
--     lock, so for a user with no subscriptions row it serialised nothing and
--     the TOCTOU the 0004 header claims to have closed was fully open —
--     measured, two concurrent 4 GiB inserts both committed. Every user gets a
--     subscriptions row from handle_new_user today, but that insert is
--     `on conflict do nothing`, so any path that creates an auth.users row
--     without it firing leaves the lock inert. An advisory lock keyed on the
--     uuid itself cannot be absent.
--
-- (b) mime_type is now taken from the stored object too. There is deliberately
--     no UPDATE policy on public.assets so that metadata is immutable, but the
--     owner holds DELETE and INSERT, and delete-then-reinsert is a working
--     UPDATE — measured. It let a user relabel their own asset from image/png
--     to image/svg+xml on the same storage_key, which is the one MIME type
--     0004's bucket allowlist deliberately excludes because SVG can carry
--     script. Deriving it from storage removes the point of doing so.
--
-- (c) When the inserting user is not the owner named on the row, the quota
--     arithmetic is skipped and the row is handed to RLS to refuse. This
--     trigger fires BEFORE the WITH CHECK, so its two failure modes —
--     check_violation for "no such object" and the RLS 42501 for "not yours" —
--     told an attacker whether an arbitrary object key existed under another
--     user's prefix. Object keys are <uuid>/<uuid>.<ext>, so that also
--     confirmed guessed account uuids. Deferring to RLS makes every cross-user
--     attempt fail identically. A NULL auth.uid() (the service role, the Paddle
--     webhook) keeps full enforcement.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_asset_quota()
returns trigger
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
declare
  real_size   bigint;
  real_mime   text;
  used_bytes  bigint;
  limit_bytes bigint;
  caller      uuid := auth.uid();
begin
  -- Not the caller's row: let RLS reject it, so the error carries no signal.
  if caller is not null and new.user_id is distinct from caller then
    return new;
  end if;

  select greatest(nullif(o.metadata ->> 'size', '')::bigint, 0),
         nullif(o.metadata ->> 'mimetype', '')
    into real_size, real_mime
  from storage.objects o
  where o.bucket_id = 'vault'
    and o.name = new.storage_key
    and (storage.foldername(o.name))[1] = new.user_id::text;

  if real_size is null then
    raise exception 'No stored object for that key, or it does not belong to this user'
      using errcode = 'check_violation';
  end if;

  -- Size and type come from storage, never from the client.
  new.file_size_bytes := real_size;
  new.mime_type := coalesce(real_mime, new.mime_type);

  -- Serialise this user's concurrent finalises on something that always exists.
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));

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


-- ---------------------------------------------------------------------------
-- 5. storage.objects: the path a browser reaches directly, properly guarded
--
-- This is where the real bypasses were, because the anon key plus a user JWT
-- reaches the Storage API without passing through any route handler.
--
-- (a) No lock at all. Two concurrent 4 GiB inserts for a free user both
--     committed: 8589934592 accounted against 5368709120. Same advisory lock
--     as the assets path now.
-- (b) A negative declared size was accepted. {"size": -1099511627776} drove
--     accounted usage to -1094142918656, after which a further full 5 GiB
--     landed, repeatable without bound — and it needed only INSERT, not the
--     UPDATE the metadata-rewrite hole depends on, so it was the worse of the
--     two. Rejected outright now.
-- (c) The trigger was BEFORE INSERT only, and "vault: update own objects"
--     constrains bucket_id and the owner prefix of `name` while saying nothing
--     about `metadata`. So the owner could rewrite the very number the server
--     treats as authoritative: insert 1 byte, then UPDATE the size to 100 TiB.
--     It now fires on UPDATE too and refuses any caller-driven change to the
--     recorded size. The app never needs this — uploads go through
--     createSignedUploadUrl(key, { upsert: false }), an INSERT — and a NULL
--     auth.uid() (storage-api itself, which legitimately populates metadata
--     after the row lands) is still allowed through.
-- (d) The old exception handler did not do what its comment said. For a key
--     with no slash, foldername returns an empty array, [1] is NULL, NULL::uuid
--     does not raise, the handler never fired, and the object was graded
--     against a phantom free plan. For a slashed non-uuid key the cast did
--     raise and the object was accepted with no quota check whatsoever. RLS
--     blocks both shapes for `authenticated`, but anything writing without RLS
--     — the service role, storage-api — met no limit at all. An unattributable
--     key is now refused rather than waved through.
-- (e) Cross-prefix writes defer to RLS, for the same oracle reason as the
--     assets path: the error code previously flipped between 42501 and 53100
--     depending on whether the *victim* was at their limit, which let any
--     caller binary-search another user's remaining headroom.
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
  old_size    bigint;
  used_bytes  bigint;
  limit_bytes bigint;
  caller      uuid := auth.uid();
begin
  if new.bucket_id is distinct from 'vault' then
    return new;
  end if;

  begin
    owner_id := ((storage.foldername(new.name))[1])::uuid;
  exception when others then
    owner_id := null;
  end;

  if owner_id is null then
    raise exception 'Object key % is not prefixed with an owner id', new.name
      using errcode = 'check_violation';
  end if;

  -- Not the caller's prefix: let RLS reject it, so the error carries no signal.
  if caller is not null and owner_id is distinct from caller then
    return new;
  end if;

  new_size := nullif(new.metadata ->> 'size', '')::bigint;

  if new_size is not null and new_size < 0 then
    raise exception 'A stored object cannot declare a negative size (%)', new_size
      using errcode = 'check_violation';
  end if;

  if tg_op = 'UPDATE' then
    old_size := nullif(old.metadata ->> 'size', '')::bigint;

    -- The recorded size is what the quota is computed from, so a client may not
    -- edit it. storage-api may (caller is null), which is how a size that lands
    -- after the row does still get recorded.
    if caller is not null and new_size is distinct from old_size then
      raise exception 'The recorded size of a stored object cannot be changed'
        using errcode = 'check_violation';
    end if;

    -- Nothing size-relevant changed, so there is nothing to re-check.
    if new_size is not distinct from old_size then
      return new;
    end if;
  end if;

  -- Deliberately permissive, as in 0004: some storage paths populate metadata
  -- after the row lands. Such an object is still charged to the user by
  -- user_stored_bytes once its size appears, and this trigger now re-runs on
  -- that UPDATE, which is when the size actually becomes known.
  if new_size is null then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(owner_id::text, 0));

  used_bytes  := public.user_stored_bytes(owner_id);
  limit_bytes := public.user_storage_limit(owner_id);

  -- On UPDATE the row's own old size is already inside used_bytes.
  if tg_op = 'UPDATE' then
    used_bytes := used_bytes - coalesce(greatest(old_size, 0), 0);
  end if;

  if used_bytes + new_size > limit_bytes then
    raise exception 'Storage limit exceeded'
      using errcode = 'disk_full';
  end if;

  return new;
end;
$$;


-- ---------------------------------------------------------------------------
-- 6. Storage DDL, guarded
--
-- Every statement in this block needs ownership of storage.objects, which on a
-- hosted project belongs to supabase_storage_admin. Supabase's own documented
-- storage examples are `create policy ... on storage.objects`, and CREATE
-- POLICY cannot be granted — it requires ownership — so the dashboard's
-- `postgres` role must effectively have it, and this should simply apply. That
-- is an inference, not something verifiable from here, so the block fails soft:
-- plpgsql's EXCEPTION clause opens a savepoint, so a privilege error rolls the
-- whole block back — no policy is dropped without being recreated — and leaves
-- a NOTICE telling the operator what to re-run.
--
-- What it does:
--
--  * Enables RLS on storage.objects. 0002 creates four policies there and never
--    enables it, and Postgres silently ignores policies while relrowsecurity is
--    false — no error, and the policies stay visible in pg_policies the whole
--    time, so the dashboard looks correct. Measured: with it off, user A read
--    all of user B's objects with all four policies present. Hosted Supabase
--    ships it enabled, so this asserts a guarantee the repo was inheriting.
--
--  * Pins every vault key to the exact shape the application produces. Without
--    it, storage.foldername is a plain string split with no normalisation, so
--    '<A>/../<B>/x.jpg' and its percent-encoded form '<A>/%2e%2e/<B>/y.jpg'
--    both satisfied the old predicate — segment 1 is still A's own uuid. That
--    is not a cross-user read inside Postgres (the bytes are charged to A and B
--    cannot see the row), but it hands a database-blessed key to storage-api,
--    and whether that service normalises '..' when resolving a key is exactly
--    the kind of thing that differs between layers. The pattern below is the
--    same one the application already enforces in ownedKeyPattern
--    (src/lib/vault.ts:311) and matches what buildKey produces —
--    '<user id>/<uuid>.<ext>' — so it constrains nothing the app does.
-- ---------------------------------------------------------------------------
do $$
begin
  alter table storage.objects enable row level security;

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

  -- Kept rather than dropped: removing a policy the platform's own storage
  -- flows might use is a bigger risk than leaving it, and section 5's UPDATE
  -- guard is what actually closes the metadata hole. The app does not use it.
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

exception
  when insufficient_privilege then
    raise notice
      'SKIPPED the storage.objects hardening: % — re-run this block after "set role supabase_storage_admin;". Until then RLS state and the four vault policies are whatever 0002 left, and vault_enforce_storage_quota is still BEFORE INSERT only.',
      sqlerrm;
end$$;


-- ---------------------------------------------------------------------------
-- 7. Make the retired tier unwritable
--
-- subscriptions.plan and checkout_sessions.tier were bare enum columns with no
-- foreign key and no CHECK against public.plans, which is why 0006's broken
-- remap failed silently instead of loudly: `delete from public.plans where
-- tier = 'pro'` had nothing to violate. It is also why a stray 'pro' row was
-- dangerous — user_storage_limit's join found no plans row and its coalesce
-- handed back the FREE allowance, while src/lib/plans.ts maps 'pro' forward to
-- creator's 100 GiB, so the UI and the database disagreed about the same user.
--
-- With these keys in place the enum still carries 'pro' (dropping an enum value
-- means rewriting every dependent column, which 0006 rightly refused to do),
-- but nothing can store it, and a future attempt to retire a tier that still
-- has subscribers aborts with a referential-integrity error.
--
-- 0006's corrected remap runs before this, so any real 'pro' row is already on
-- creator by the time the constraint is checked. The guards below keep the file
-- re-runnable.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'subscriptions_plan_fkey'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_plan_fkey
      foreign key (plan) references public.plans (tier);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'checkout_sessions_tier_fkey'
  ) then
    alter table public.checkout_sessions
      add constraint checkout_sessions_tier_fkey
      foreign key (tier) references public.plans (tier);
  end if;
end$$;


-- ---------------------------------------------------------------------------
-- 8. Privileges RLS cannot cover
--
-- RLS filters rows. TRUNCATE is not a row operation, so no policy applies to
-- it, and Supabase's default `grant all on tables` in schema public includes
-- it. Measured: as role anon with no JWT, TRUNCATE emptied profiles,
-- subscriptions, assets, checkout_sessions and plans. The plans case is the
-- worst — before section 2, an empty plans table made user_storage_limit()
-- return NULL and stopped quota enforcement for everyone.
--
-- PostgREST does not expose TRUNCATE as a REST verb, so this is
-- defence-in-depth rather than a one-request exploit. It costs nothing: the
-- application never truncates.
--
-- TRIGGER goes with it. CREATE TRIGGER needs only that privilege, not
-- ownership, and as `authenticated` a trigger was successfully attached to
-- public.subscriptions — unauthorised DDL on a shared billing table. Together
-- with section 3's EXECUTE revokes this closes the attach-a-definer-function
-- escalation from both ends.
-- ---------------------------------------------------------------------------
revoke truncate, trigger on public.plans              from anon, authenticated;
revoke truncate, trigger on public.profiles           from anon, authenticated;
revoke truncate, trigger on public.subscriptions      from anon, authenticated;
revoke truncate, trigger on public.assets             from anon, authenticated;
revoke truncate, trigger on public.checkout_sessions  from anon, authenticated;


-- ---------------------------------------------------------------------------
-- 9. display_name is a write primitive the quota never saw
--
-- 0004 grants authenticated column-level UPDATE on profiles.display_name by
-- design, and profiles carried no CHECK constraints at all. Measured: a free
-- user wrote 52,428,800 bytes into their own display_name through the ordinary
-- "profiles: update own" policy while user_stored_bytes and my_storage_usage
-- both still reported 1111 bytes against a 5 GiB limit. Neither quota trigger
-- sees that path, so it was uncapped database growth charged to nobody.
--
-- 120 characters is generous for a display name and far below anything that
-- matters. assets.filename is capped at 255 in 0001 for the same reason.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_display_name_check'
  ) then
    -- Truncate anything already over the cap so the constraint can be added.
    update public.profiles
       set display_name = left(display_name, 120)
     where length(display_name) > 120;

    alter table public.profiles
      add constraint profiles_display_name_check
      check (display_name is null or length(display_name) between 1 and 120);
  end if;
end$$;


-- ===========================================================================
-- Deliberately NOT changed here, so the reasoning is on the record:
--
--  * profiles.email is NOT NULL while auth.users.email is nullable, so
--    handle_new_user aborts the whole signup transaction for any account with
--    no email address — measured: the auth.users row is rolled back with it.
--    Unreachable while email/password is the only enabled provider, which is
--    the pilot's configuration, and picking a placeholder email for a
--    phone-only or anonymous account is a product decision, not a migration's
--    to invent. Enabling any other auth provider needs this settled first.
--
--  * Deleting an auth.users row cascades to profiles, subscriptions, assets and
--    checkout_sessions but leaves storage.objects behind — there is no FK from
--    storage.objects to auth.users. Adding a trigger that deletes those rows
--    would make the orphans invisible rather than gone: a row delete in
--    Postgres does not remove the object from the bucket. Reclaiming the bytes
--    has to go through the Storage API, so it belongs in the application's
--    existing sweep, not here.
--
--  * my_storage_usage() (assets-side) and user_stored_bytes() (storage-side)
--    still disagree for objects that were never registered as assets, and the
--    dashboard reads the assets side, so it under-reports. That is now a
--    display gap rather than a quota gap — sections 4 and 5 mean unregistered
--    objects are still charged against the limit on the way in.
--
--  * set_updated_at() has no pinned search_path. It is SECURITY INVOKER and
--    references only now(), which resolves from pg_catalog and cannot be
--    shadowed, so it grants nothing — but it is the one function that will trip
--    a Supabase advisor scan.
-- ===========================================================================
