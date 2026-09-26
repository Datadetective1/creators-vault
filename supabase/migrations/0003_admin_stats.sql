-- ===========================================================================
-- Creator Lock — internal pilot metrics
--
-- SECURITY DEFINER so it can aggregate across users, but EXECUTE is revoked
-- from `anon` and `authenticated`. Only the service role can call it, and the
-- /admin route additionally checks the caller's email against ADMIN_EMAILS.
-- ===========================================================================

create or replace function public.admin_pilot_stats()
returns table (
  total_users       bigint,
  paid_users        bigint,
  total_uploads     bigint,
  total_bytes       bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    (select count(*) from public.profiles)::bigint,
    (select count(*) from public.subscriptions
       where plan <> 'free' and status in ('active', 'trialing'))::bigint,
    (select count(*) from public.assets)::bigint,
    (select coalesce(sum(file_size_bytes), 0) from public.assets)::bigint;
$$;

revoke all on function public.admin_pilot_stats() from public;
revoke all on function public.admin_pilot_stats() from anon, authenticated;
