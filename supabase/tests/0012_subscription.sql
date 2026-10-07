-- Regression suite for migration 0012: uploads need an active Creator
-- subscription, on every path, and an ended subscription keeps the files.
-- Run after the shim and all migrations (see README.md).

\set ON_ERROR_STOP off
\pset pager off

create temporary table r(n int generated always as identity, name text, want text, got text, pass boolean);

create or replace function t(p_name text, p_want text, p_got text, p_pass boolean)
returns void language sql security definer
as $$ insert into r(name,want,got,pass) values (p_name,p_want,p_got,p_pass) $$;

-- F: no subscription. G: Creator, active. Both have accepted the current terms,
-- so every refusal below is the subscription gate.
do $$
begin
  insert into auth.users (id, email, raw_user_meta_data) values
    ('ffffffff-ffff-4fff-8fff-ffffffffffff', 'f@test.invalid', '{}'),
    ('99999999-9999-4999-8999-999999999999', 'g@test.invalid', '{}');
end$$;

insert into public.legal_acceptances (user_id, consent_type, version)
select u, d.consent_type, d.current_version
from unnest(array['ffffffff-ffff-4fff-8fff-ffffffffffff'::uuid,
                  '99999999-9999-4999-8999-999999999999'::uuid]) u
cross join public.legal_documents d;

update public.subscriptions set plan = 'creator', status = 'active'
 where user_id = '99999999-9999-4999-8999-999999999999';

do $$
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"ffffffff-ffff-4fff-8fff-ffffffffffff","role":"authenticated"}';
  insert into storage.objects (bucket_id, name, metadata) values
    ('vault', 'ffffffff-ffff-4fff-8fff-ffffffffffff/a.png', '{"size":10,"mimetype":"image/png"}');
  perform t('NO PLAN direct Storage insert refused', 'refused', 'inserted', false);
exception when others then
  perform t('NO PLAN direct Storage insert refused', 'refused', sqlstate || ': ' || sqlerrm,
            sqlerrm like 'An active Creator subscription%');
end$$;

do $$
begin
  -- storage-api writing for a signed upload URL: no auth.uid()
  insert into storage.objects (bucket_id, name, metadata) values
    ('vault', 'ffffffff-ffff-4fff-8fff-ffffffffffff/s.png', '{"size":10,"mimetype":"image/png"}');
  perform t('NO PLAN signed-URL style insert refused', 'refused', 'inserted', false);
exception when others then
  perform t('NO PLAN signed-URL style insert refused', 'refused', sqlstate || ': ' || sqlerrm,
            sqlerrm like 'An active Creator subscription%');
end$$;

-- Plant an object with the gates off, to test the asset-row path on its own.
alter table storage.objects disable trigger vault_require_subscription;
insert into storage.objects (bucket_id, name, metadata) values
  ('vault', 'ffffffff-ffff-4fff-8fff-ffffffffffff/p.png', '{"size":10,"mimetype":"image/png"}');
alter table storage.objects enable trigger vault_require_subscription;

do $$
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"ffffffff-ffff-4fff-8fff-ffffffffffff","role":"authenticated"}';
  insert into public.assets (user_id, filename, storage_key, mime_type, file_size_bytes) values
    ('ffffffff-ffff-4fff-8fff-ffffffffffff', 'p.png', 'ffffffff-ffff-4fff-8fff-ffffffffffff/p.png', 'image/png', 10);
  perform t('NO PLAN asset-row insert refused', 'refused', 'inserted', false);
exception when others then
  perform t('NO PLAN asset-row insert refused', 'refused', sqlstate || ': ' || sqlerrm,
            sqlerrm like 'An active Creator subscription%');
end$$;

do $$
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"ffffffff-ffff-4fff-8fff-ffffffffffff","role":"authenticated"}';
  update public.subscriptions set plan = 'creator', status = 'active'
   where user_id = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
  if (select plan from public.subscriptions where user_id = 'ffffffff-ffff-4fff-8fff-ffffffffffff') = 'creator' then
    perform t('NO PLAN user cannot grant themselves Creator', 'unchanged', 'creator', false);
  else
    perform t('NO PLAN user cannot grant themselves Creator', 'unchanged', 'unchanged', true);
  end if;
exception when others then
  perform t('NO PLAN user cannot grant themselves Creator', 'refused', sqlstate, true);
end$$;

do $$
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"99999999-9999-4999-8999-999999999999","role":"authenticated"}';
  insert into storage.objects (bucket_id, name, metadata) values
    ('vault', '99999999-9999-4999-8999-999999999999/g.png', '{"size":10,"mimetype":"image/png"}');
  insert into public.assets (user_id, filename, storage_key, mime_type, file_size_bytes) values
    ('99999999-9999-4999-8999-999999999999', 'g.png', '99999999-9999-4999-8999-999999999999/g.png', 'image/png', 1);
  perform t('CREATOR active subscriber can upload', 'ok', 'ok', true);
exception when others then
  perform t('CREATOR active subscriber can upload', 'ok', sqlstate || ': ' || sqlerrm, false);
end$$;

-- past_due keeps access while Paddle retries; paused and canceled do not.
do $$
declare st text; ok boolean;
begin
  foreach st in array array['past_due', 'trialing', 'paused', 'canceled', 'inactive'] loop
    update public.subscriptions set status = st::public.subscription_status
     where user_id = '99999999-9999-4999-8999-999999999999';
    ok := public.has_upload_entitlement('99999999-9999-4999-8999-999999999999');
    perform t('STATUS ' || st || ' entitlement',
              case when st in ('past_due', 'trialing') then 'true' else 'false' end,
              ok::text,
              ok = (st in ('past_due', 'trialing')));
  end loop;
end$$;

-- Subscription ended (canceled): files stay readable and deletable, uploads stop.
update public.subscriptions set status = 'canceled'
 where user_id = '99999999-9999-4999-8999-999999999999';

do $$
declare n bigint;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"99999999-9999-4999-8999-999999999999","role":"authenticated"}';
  select count(*) into n from public.assets;
  perform t('ENDED existing files still listed', '1', n::text, n = 1);
  select count(*) into n from storage.objects where bucket_id = 'vault';
  perform t('ENDED existing objects still readable', '1', n::text, n = 1);
end$$;

do $$
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"99999999-9999-4999-8999-999999999999","role":"authenticated"}';
  insert into storage.objects (bucket_id, name, metadata) values
    ('vault', '99999999-9999-4999-8999-999999999999/h.png', '{"size":10,"mimetype":"image/png"}');
  perform t('ENDED new upload refused', 'refused', 'inserted', false);
exception when others then
  perform t('ENDED new upload refused', 'refused', sqlstate || ': ' || sqlerrm,
            sqlerrm like 'An active Creator subscription%');
end$$;

do $$
declare n bigint;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"99999999-9999-4999-8999-999999999999","role":"authenticated"}';
  delete from public.assets where user_id = '99999999-9999-4999-8999-999999999999';
  delete from storage.objects where name = '99999999-9999-4999-8999-999999999999/g.png';
  select count(*) into n from public.assets;
  perform t('ENDED user can still delete their files', '0', n::text, n = 0);
exception when others then
  perform t('ENDED user can still delete their files', '0', sqlstate || ': ' || sqlerrm, false);
end$$;

do $$
declare v text;
begin
  select current_version into v from public.legal_documents where consent_type = 'terms';
  perform t('TERMS version bumped to 2026-10-07', '2026-10-07', v, v = '2026-10-07');
end$$;

-- ---------------------------------------------------------------------------
\echo ''
\echo '================ 0012 SUBSCRIPTION RESULTS ================'
select n, case when pass then 'PASS' else '*** FAIL ***' end as result, name, got from r order by n;
select count(*) filter (where pass) as passed,
       count(*) filter (where not pass) as failed
from r;
