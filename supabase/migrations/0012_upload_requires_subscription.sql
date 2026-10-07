-- ===========================================================================
-- 0012 — Uploads require an active Creator subscription
--
-- Creator Lock now sells one plan, Creator (100 GB). There is no free storage:
-- an account can be created for free, but it cannot store files until it has
-- an active Creator subscription. The `free` plan tier remains as the internal
-- value for "no active subscription" (the Paddle webhook writes it when a
-- subscription ends); it is no longer sold and grants no uploads.
--
-- Enforced the same way as 0011's consent gate: BEFORE INSERT triggers on both
-- places an upload can land — storage.objects (bucket 'vault', which covers
-- signed upload URLs, direct Storage API calls, retries and multipart) and
-- public.assets. Existing objects and rows are untouched: an account whose
-- subscription ended keeps its files and can still read, download and delete
-- them (SELECT/DELETE are not gated), it just cannot add new ones.
--
-- "Active" matches effectivePlan() in src/lib/plans.ts: plan 'creator' with
-- status active, trialing or past_due (past_due keeps access while Paddle
-- retries the payment). paused, canceled and inactive do not.
--
-- Also bumps the Terms of Service version: the plan and what happens when a
-- subscription ends changed materially, so users accept the new Terms before
-- their next upload (0011's re-acceptance mechanism).
--
-- Re-runnable.
-- ===========================================================================

create or replace function public.has_upload_entitlement(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.subscriptions s
    where s.user_id = target_user
      and s.plan = 'creator'
      and s.status in ('active', 'trialing', 'past_due')
  );
$$;

revoke all on function public.has_upload_entitlement(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- storage.objects
-- ---------------------------------------------------------------------------
create or replace function public.enforce_upload_subscription_storage()
returns trigger
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
declare
  owner_id uuid;
  caller   uuid := auth.uid();
begin
  if new.bucket_id is distinct from 'vault' then
    return new;
  end if;

  begin
    owner_id := ((storage.foldername(new.name))[1])::uuid;
  exception when others then
    owner_id := null;
  end;

  -- Unattributable keys are refused by enforce_storage_quota.
  if owner_id is null then
    return new;
  end if;

  -- Not the caller's prefix: let RLS reject it, so the error carries no signal.
  if caller is not null and owner_id is distinct from caller then
    return new;
  end if;

  if not public.has_upload_entitlement(owner_id) then
    raise exception 'An active Creator subscription is required to upload'
      using errcode = '42501', hint = 'subscription_required';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_upload_subscription_storage() from public, anon, authenticated;

drop trigger if exists vault_require_subscription on storage.objects;
create trigger vault_require_subscription
  before insert on storage.objects
  for each row execute function public.enforce_upload_subscription_storage();

-- ---------------------------------------------------------------------------
-- public.assets
-- ---------------------------------------------------------------------------
create or replace function public.enforce_upload_subscription_asset()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is not null and new.user_id is distinct from caller then
    return new;
  end if;

  if not public.has_upload_entitlement(new.user_id) then
    raise exception 'An active Creator subscription is required to upload'
      using errcode = '42501', hint = 'subscription_required';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_upload_subscription_asset() from public, anon, authenticated;

drop trigger if exists assets_require_subscription on public.assets;
create trigger assets_require_subscription
  before insert on public.assets
  for each row execute function public.enforce_upload_subscription_asset();

-- ---------------------------------------------------------------------------
-- Terms of Service version (must match TERMS_VERSION in src/lib/legal.ts)
-- ---------------------------------------------------------------------------
update public.legal_documents
   set current_version = '2026-10-07', updated_at = now()
 where consent_type = 'terms'
   and current_version is distinct from '2026-10-07';
