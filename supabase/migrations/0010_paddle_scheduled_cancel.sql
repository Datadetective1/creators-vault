-- ===========================================================================
-- 0010 — remember a cancellation that is scheduled but not yet effective
--
-- Cancelling in Paddle's customer portal defaults to "at the end of the
-- billing period". Paddle keeps the subscription `active` until then and
-- records the pending cancellation in `scheduled_change`. The app only stored
-- status and period end, so a customer who had just cancelled was still told
-- "Renews on <date>" — the opposite of what they had asked for.
--
-- `scheduled_cancel_at` holds that pending date. It is written by the same
-- ordered, atomic function as the rest of the subscription (migration 0009),
-- so an older event cannot resurrect or clear a cancellation out of order.
-- ===========================================================================

alter table public.subscriptions
  add column if not exists scheduled_cancel_at timestamptz;

comment on column public.subscriptions.scheduled_cancel_at is
  'When a Paddle cancellation scheduled for period end takes effect; null when none is pending.';

-- Replace 0009's function. The signature changes, so the old overload goes
-- first; leaving it would make the RPC name ambiguous.
drop function if exists public.apply_paddle_subscription_event(
  uuid, text, text, public.plan_tier, public.subscription_status, timestamptz, timestamptz
);

create or replace function public.apply_paddle_subscription_event(
  p_user_id                uuid,
  p_paddle_customer_id     text,
  p_paddle_subscription_id text,
  p_plan                   public.plan_tier,
  p_status                 public.subscription_status,
  p_current_period_end     timestamptz,
  p_scheduled_cancel_at    timestamptz,
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
         scheduled_cancel_at    = p_scheduled_cancel_at,
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

revoke all on function public.apply_paddle_subscription_event(
  uuid, text, text, public.plan_tier, public.subscription_status, timestamptz, timestamptz, timestamptz
) from public, anon, authenticated;
grant execute on function public.apply_paddle_subscription_event(
  uuid, text, text, public.plan_tier, public.subscription_status, timestamptz, timestamptz, timestamptz
) to service_role;
