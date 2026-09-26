-- ===========================================================================
-- Creator Lock — bind a Paddle checkout to the account that started it
--
-- Checkout previously passed `{ user_id }` to the browser as Paddle custom
-- data. Paddle stores whatever it is handed and signs the resulting webhook
-- legitimately, so a user who edited that value in devtools could have a real,
-- correctly-signed subscription event applied to somebody else's account —
-- enough to overwrite a victim's subscription and then cancel it out from
-- under them.
--
-- The browser now only ever sees an opaque nonce. The nonce -> user mapping
-- lives here, written and read with the service-role key, so the account being
-- entitled is never client-controlled.
-- ===========================================================================

create table if not exists public.checkout_sessions (
  nonce      uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  tier       public.plan_tier not null,
  created_at timestamptz not null default now()
);

create index if not exists checkout_sessions_user_idx on public.checkout_sessions (user_id);
create index if not exists checkout_sessions_created_idx on public.checkout_sessions (created_at);

alter table public.checkout_sessions enable row level security;

-- No policy for `authenticated`: this table is service-role only. A user can
-- neither read another user's nonce nor mint one for an account they do not
-- own.

-- Housekeeping: nonces are single-use in practice and only needed until the
-- subscription webhook arrives.
create or replace function public.purge_stale_checkout_sessions()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.checkout_sessions where created_at < now() - interval '7 days';
$$;

revoke all on function public.purge_stale_checkout_sessions() from public, anon, authenticated;
