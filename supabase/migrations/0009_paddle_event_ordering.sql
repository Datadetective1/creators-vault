-- ===========================================================================
-- 0009 — apply Paddle subscription events in order, atomically
--
-- Paddle does not guarantee webhook delivery order, and retries a failed
-- delivery later. The webhook applied every subscription event as it arrived,
-- so a delayed `subscription.updated` (status active) landing after the
-- `subscription.canceled` that superseded it would put a cancelled customer
-- back on Creator — 100 GB they are no longer paying for — until some later
-- event happened to correct it.
--
-- Every Paddle subscription payload carries `updated_at`, which only moves
-- forward for a given subscription. Recording the newest one applied and
-- refusing anything older makes delivery order irrelevant. The comparison and
-- the write are one UPDATE, so two deliveries racing each other cannot both
-- pass the check.
--
-- The ownership guard the webhook already applied — only write to a row that
-- is unclaimed or already belongs to this Paddle customer — moves in here too,
-- so both conditions are evaluated in the same statement.
-- ===========================================================================

alter table public.subscriptions
  add column if not exists paddle_updated_at timestamptz;

comment on column public.subscriptions.paddle_updated_at is
  'updated_at of the newest Paddle subscription event applied to this row; older events are ignored.';

create or replace function public.apply_paddle_subscription_event(
  p_user_id                uuid,
  p_paddle_customer_id     text,
  p_paddle_subscription_id text,
  p_plan                   public.plan_tier,
  p_status                 public.subscription_status,
  p_current_period_end     timestamptz,
  p_event_updated_at       timestamptz
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  applied int;
begin
  if p_event_updated_at is null then
    raise exception 'A Paddle event must carry updated_at'
      using errcode = 'check_violation';
  end if;

  update public.subscriptions s
     set paddle_customer_id     = coalesce(p_paddle_customer_id, s.paddle_customer_id),
         paddle_subscription_id = coalesce(p_paddle_subscription_id, s.paddle_subscription_id),
         plan                   = p_plan,
         status                 = p_status,
         current_period_end     = p_current_period_end,
         paddle_updated_at      = p_event_updated_at
   where s.user_id = p_user_id
     and (p_paddle_customer_id is null
          or s.paddle_customer_id is null
          or s.paddle_customer_id = p_paddle_customer_id)
     and (s.paddle_updated_at is null or s.paddle_updated_at < p_event_updated_at);

  get diagnostics applied = row_count;
  if applied = 1 then
    return 'applied';
  end if;

  -- Say why nothing changed, so the webhook can log it precisely.
  if not exists (select 1 from public.subscriptions where user_id = p_user_id) then
    return 'no_row';
  end if;
  if exists (
    select 1 from public.subscriptions
     where user_id = p_user_id
       and p_paddle_customer_id is not null
       and paddle_customer_id is not null
       and paddle_customer_id <> p_paddle_customer_id
  ) then
    return 'foreign_customer';
  end if;
  return 'stale';
end;
$$;

-- Webhook-only: the service role calls it; no browser-facing role may.
revoke all on function public.apply_paddle_subscription_event(
  uuid, text, text, public.plan_tier, public.subscription_status, timestamptz, timestamptz
) from public, anon, authenticated;
grant execute on function public.apply_paddle_subscription_event(
  uuid, text, text, public.plan_tier, public.subscription_status, timestamptz, timestamptz
) to service_role;
