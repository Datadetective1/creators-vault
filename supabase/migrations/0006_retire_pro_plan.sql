-- ---------------------------------------------------------------------------
-- 0006 — retire the 500 GB "pro" plan
-- ---------------------------------------------------------------------------
--
-- The pilot sells one paid tier at a flat price, so the third tier has nothing
-- to sell. This migration narrows the ACTIVE model to (free, creator) while
-- leaving migration 0001 exactly as it was written — history is not rewritten,
-- and a fresh database still replays 0001 then this.
--
-- Two deliberate choices:
--
-- 1. Anything still on `pro` is moved FORWARD to `creator`, not back to `free`.
--    A pro row means somebody was granted more than Free; dropping them below
--    what they had would be the wrong direction to fail in. (In practice there
--    are none — billing was never switched on and PADDLE_PRO_PRICE_ID was never
--    set — so these statements are expected to touch zero rows. They exist so
--    the migration is correct even if that assumption is wrong.)
--
-- 2. The `pro` value is LEFT IN the plan_tier enum. Postgres cannot drop an
--    enum value; removing it means creating a new type, rewriting every
--    dependent column and dropping the old one, which is a destructive rewrite
--    of live columns for no functional gain. An unused enum value costs
--    nothing. src/lib/plans.ts maps the retired tier forward in the same way,
--    so application and database agree.
-- ---------------------------------------------------------------------------

-- Move any subscription still naming the retired tier onto creator.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'subscriptions' and column_name = 'tier'
  ) then
    update public.subscriptions
       set tier = 'creator'::public.plan_tier
     where tier = 'pro'::public.plan_tier;
  end if;
end$$;

-- Same for any in-flight checkout session that named it.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'checkout_sessions' and column_name = 'tier'
  ) then
    update public.checkout_sessions
       set tier = 'creator'::public.plan_tier
     where tier = 'pro'::public.plan_tier;
  end if;
end$$;

-- Retire the plans row itself. Quota lookups join against this table, so once
-- it is gone the tier grants nothing even if a stray row reappears.
delete from public.plans where tier = 'pro'::public.plan_tier;

-- Keep the two live rows authoritative, including the label the UI reads.
insert into public.plans (tier, name, storage_limit_bytes, sort_order) values
  ('free',    'Free',    5   * 1024^3, 1),
  ('creator', 'Creator', 100 * 1024^3, 2)
on conflict (tier) do update
  set name = excluded.name,
      storage_limit_bytes = excluded.storage_limit_bytes,
      sort_order = excluded.sort_order;
