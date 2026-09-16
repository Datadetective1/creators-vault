-- ===========================================================================
-- Creator Vault — core schema
-- Tables: profiles, subscriptions, assets
-- Every table is protected by Row Level Security. A user can only ever reach
-- their own rows; there is no policy that exposes another user's data.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Plans
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'plan_tier') then
    create type public.plan_tier as enum ('free', 'creator', 'pro');
  end if;
  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type public.subscription_status as enum (
      'active', 'trialing', 'past_due', 'paused', 'canceled', 'inactive'
    );
  end if;
end$$;

-- Storage allowance per plan. Kept in the database so server-side quota checks
-- and the Paddle webhook agree on one source of truth.
create table if not exists public.plans (
  tier              public.plan_tier primary key,
  name              text        not null,
  storage_limit_bytes bigint    not null check (storage_limit_bytes > 0),
  sort_order        int         not null default 0
);

insert into public.plans (tier, name, storage_limit_bytes, sort_order) values
  ('free',    'Free',      5   * 1024^3, 1),
  ('creator', 'Creator',   100 * 1024^3, 2),
  ('pro',     'Pro',       500 * 1024^3, 3)
on conflict (tier) do update
  set name = excluded.name,
      storage_limit_bytes = excluded.storage_limit_bytes,
      sort_order = excluded.sort_order;

alter table public.plans enable row level security;

drop policy if exists "plans are readable by everyone" on public.plans;
create policy "plans are readable by everyone"
  on public.plans for select
  to authenticated, anon
  using (true);

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text        not null,
  display_name text,
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ---------------------------------------------------------------------------
-- subscriptions
-- Read-only to the user. All writes happen through the Paddle webhook using
-- the service-role key, which bypasses RLS. There is deliberately no
-- INSERT/UPDATE/DELETE policy for authenticated users: a creator must never be
-- able to grant themselves a paid plan.
-- ---------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null unique references auth.users (id) on delete cascade,
  paddle_customer_id     text,
  paddle_subscription_id text unique,
  plan                   public.plan_tier not null default 'free',
  status                 public.subscription_status not null default 'inactive',
  current_period_end     timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);
create index if not exists subscriptions_paddle_customer_idx on public.subscriptions (paddle_customer_id);

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions: read own" on public.subscriptions;
create policy "subscriptions: read own"
  on public.subscriptions for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- assets
--
-- Storage-provider agnostic by design. `storage_provider` + `storage_key`
-- together locate the object. Supabase Storage is the only provider for the
-- pilot, but no application logic depends on a Supabase-specific URL shape,
-- so objects can be copied to another private object store later and only
-- `storage_provider` needs to change — users never re-upload.
-- ---------------------------------------------------------------------------
create table if not exists public.assets (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  filename         text not null check (length(filename) between 1 and 255),
  storage_provider text not null default 'supabase' check (length(storage_provider) between 1 and 32),
  storage_key      text not null check (length(storage_key) between 1 and 1024),
  mime_type        text not null default 'application/octet-stream',
  file_size_bytes  bigint not null check (file_size_bytes >= 0),
  created_at       timestamptz not null default now(),
  unique (storage_provider, storage_key)
);

create index if not exists assets_user_created_idx on public.assets (user_id, created_at desc);

alter table public.assets enable row level security;

drop policy if exists "assets: read own" on public.assets;
create policy "assets: read own"
  on public.assets for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "assets: insert own" on public.assets;
create policy "assets: insert own"
  on public.assets for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "assets: delete own" on public.assets;
create policy "assets: delete own"
  on public.assets for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Metadata is immutable once written; there is no UPDATE policy. Renames are
-- out of scope for the pilot, and this prevents a user rewriting file_size_bytes
-- to defeat the quota check.

-- ---------------------------------------------------------------------------
-- New-user bootstrap: every auth.users row gets a profile and a free plan.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '')
  )
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'free', 'active')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Storage usage + quota helpers.
-- SECURITY INVOKER so the caller's RLS applies: a user can only ever sum
-- their own assets.
-- ---------------------------------------------------------------------------
create or replace function public.my_storage_usage()
returns table (used_bytes bigint, file_count bigint)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select coalesce(sum(file_size_bytes), 0)::bigint, count(*)::bigint
  from public.assets
  where user_id = (select auth.uid());
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();
