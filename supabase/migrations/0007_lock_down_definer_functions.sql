-- ===========================================================================
-- Creator Vault — close the RPC surface on internal SECURITY DEFINER functions
--
-- Postgres grants EXECUTE to PUBLIC by default, and everything in `public` is
-- exposed through PostgREST. That made user_storage_limit(uuid) and
-- user_stored_bytes(uuid) callable by anyone — including `anon` — with an
-- arbitrary user id, leaking another account's plan allowance and usage.
--
-- None of these are meant to be called directly. The quota triggers still
-- work: a trigger function's EXECUTE privilege is checked when the trigger is
-- created, not when it fires, and the helpers are invoked from inside
-- SECURITY DEFINER code running as the owner.
-- ===========================================================================

revoke all on function public.user_storage_limit(uuid)  from public, anon, authenticated;
revoke all on function public.user_stored_bytes(uuid)   from public, anon, authenticated;
revoke all on function public.enforce_asset_quota()     from public, anon, authenticated;
revoke all on function public.enforce_storage_quota()   from public, anon, authenticated;
revoke all on function public.handle_new_user()         from public, anon, authenticated;

-- Pin search_path on the one remaining function that lacked it.
alter function public.set_updated_at() set search_path = public, pg_temp;

-- ---------------------------------------------------------------------------
-- Finish what 0006 intended for subscriptions.
--
-- 0006 guards its subscriptions update on a column named `tier`, but the
-- column is `plan` (0001), so that block never runs. With the `pro` plans row
-- deleted, a leftover `pro` subscription would fall through to the Free
-- allowance in user_storage_limit() — failing downward, the direction 0006
-- explicitly set out to avoid. Move any such row forward here.
-- ---------------------------------------------------------------------------
update public.subscriptions
   set plan = 'creator'::public.plan_tier
 where plan = 'pro'::public.plan_tier;
