-- Regression suite for migration 0011: Terms / Privacy / upload-rights
-- acceptance, enforced on every path an upload can land.
-- Run after the shim and all migrations (see README.md).

\set ON_ERROR_STOP off
\pset pager off

create temporary table r(n int generated always as identity, name text, want text, got text, pass boolean);

create or replace function t(p_name text, p_want text, p_got text, p_pass boolean)
returns void language sql security definer
as $$ insert into r(name,want,got,pass) values (p_name,p_want,p_got,p_pass) $$;

-- C has never accepted; D will accept; E is used for the no-auth.uid() path.
do $$
begin
  insert into auth.users (id, email, raw_user_meta_data) values
    ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'c@test.invalid', '{}'),
    ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'd@test.invalid', '{}'),
    ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'e@test.invalid', '{}');
end$$;

-- 1. A new user is not accepted and cannot upload by any route
do $$
declare ok boolean;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated"}';
  select accepted into ok from public.upload_consent_status();
  perform t('NEW user starts not accepted', 'false', ok::text, ok = false);
end$$;

do $$
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated"}';
  insert into storage.objects (bucket_id, name, metadata) values
    ('vault', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc/a.png', '{"size":10,"mimetype":"image/png"}');
  perform t('BYPASS direct Storage insert without consent', 'refused', 'inserted', false);
exception when others then
  perform t('BYPASS direct Storage insert without consent', 'refused', sqlstate || ': ' || sqlerrm,
            sqlstate = '42501' and sqlerrm like 'Accept the Terms%');
end$$;

do $$
begin
  -- storage-api writing for a signed upload URL: no auth.uid(), owner from the key
  insert into storage.objects (bucket_id, name, metadata) values
    ('vault', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee/s.png', '{"size":10,"mimetype":"image/png"}');
  perform t('BYPASS signed-URL style insert (no uid) without consent', 'refused', 'inserted', false);
exception when others then
  perform t('BYPASS signed-URL style insert (no uid) without consent', 'refused', sqlstate || ': ' || sqlerrm,
            sqlerrm like 'Accept the Terms%');
end$$;

-- For the asset-row test the object must already exist, or 0007's quota
-- trigger refuses first and the consent trigger is never reached. Plant it
-- with the storage gate briefly off — a fixture, standing in for a file that
-- landed some other way.
alter table storage.objects disable trigger vault_require_upload_consent;
insert into storage.objects (bucket_id, name, metadata) values
  ('vault', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc/a.png', '{"size":10,"mimetype":"image/png"}');
alter table storage.objects enable trigger vault_require_upload_consent;

do $$
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated"}';
  insert into public.assets (user_id, filename, storage_key, mime_type, file_size_bytes) values
    ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'a.png', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc/a.png', 'image/png', 10);
  perform t('BYPASS direct asset-row insert without consent', 'refused', 'inserted', false);
exception when others then
  perform t('BYPASS direct asset-row insert without consent', 'refused', sqlstate || ': ' || sqlerrm,
            sqlerrm like 'Accept the Terms%');
end$$;

-- 2. Acceptance is recorded only through the function, for yourself, at the current version
do $$
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated"}';
  insert into public.legal_acceptances (user_id, consent_type, version) values
    ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'terms', '2026-10-06');
  perform t('FORGE direct insert into legal_acceptances', 'refused', 'inserted', false);
exception when others then
  perform t('FORGE direct insert into legal_acceptances', 'refused', sqlstate, sqlstate = '42501');
end$$;

do $$
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated"}';
  perform public.accept_legal_documents('2000-01-01', '2026-10-06', '2026-10-06');
  perform t('STALE version cannot be accepted', 'refused', 'accepted', false);
exception when others then
  perform t('STALE version cannot be accepted', 'refused', sqlstate, sqlstate = '23514');
end$$;

do $$
begin
  set local role anon;
  perform public.accept_legal_documents('2026-10-06', '2026-10-06', '2026-10-06');
  perform t('ANON cannot accept', 'refused', 'accepted', false);
exception when others then
  perform t('ANON cannot accept', 'refused', sqlstate, sqlstate = '42501');
end$$;

-- 3. D accepts, and can then upload; nothing about the request is stored
do $$
declare ok boolean; n bigint;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","role":"authenticated"}';
  perform public.accept_legal_documents('2026-10-06', '2026-10-06', '2026-10-06');
  perform public.accept_legal_documents('2026-10-06', '2026-10-06', '2026-10-06'); -- idempotent
  select accepted into ok from public.upload_consent_status();
  perform t('ACCEPT unlocks', 'true', ok::text, ok);
  select count(*) into n from public.legal_acceptances;
  perform t('ACCEPT stores exactly three rows (terms, privacy, upload_rights)', '3', n::text, n = 3);
end$$;

do $$
declare cols text;
begin
  select string_agg(column_name, ',' order by ordinal_position) into cols
  from information_schema.columns where table_schema = 'public' and table_name = 'legal_acceptances';
  perform t('ACCEPT stores no IP/device data', 'id,user_id,consent_type,version,accepted_at', cols,
            cols = 'id,user_id,consent_type,version,accepted_at');
end$$;

do $$
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","role":"authenticated"}';
  insert into storage.objects (bucket_id, name, metadata) values
    ('vault', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd/d.png', '{"size":10,"mimetype":"image/png"}');
  insert into public.assets (user_id, filename, storage_key, mime_type, file_size_bytes) values
    ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'd.png', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd/d.png', 'image/png', 1);
  perform t('HAPPY accepted user can upload (object + asset row)', 'ok', 'ok', true);
exception when others then
  perform t('HAPPY accepted user can upload (object + asset row)', 'ok', sqlstate || ': ' || sqlerrm, false);
end$$;

do $$
declare n bigint;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated"}';
  select count(*) into n from public.legal_acceptances;
  perform t('ISOLATION C cannot see D''s acceptance rows', '0', n::text, n = 0);
end$$;

-- 4. A material change (version bump) forces re-acceptance; accepting it unlocks again
update public.legal_documents set current_version = '2099-01-01' where consent_type = 'terms';

do $$
declare ok boolean;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","role":"authenticated"}';
  select accepted into ok from public.upload_consent_status();
  perform t('BUMP previously accepted user must re-accept', 'false', ok::text, ok = false);
end$$;

do $$
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","role":"authenticated"}';
  insert into storage.objects (bucket_id, name, metadata) values
    ('vault', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd/e.png', '{"size":10,"mimetype":"image/png"}');
  perform t('BUMP upload refused until re-accepted', 'refused', 'inserted', false);
exception when others then
  perform t('BUMP upload refused until re-accepted', 'refused', sqlstate || ': ' || sqlerrm,
            sqlerrm like 'Accept the Terms%');
end$$;

do $$
declare ok boolean;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","role":"authenticated"}';
  perform public.accept_legal_documents('2099-01-01', '2026-10-06', '2026-10-06');
  select accepted into ok from public.upload_consent_status();
  perform t('BUMP re-accepting the new version unlocks', 'true', ok::text, ok);
end$$;

update public.legal_documents set current_version = '2026-10-06' where consent_type = 'terms';

-- 5. Existing files are untouched: the gate fires on INSERT only
do $$
declare n bigint;
begin
  select count(*) into n from pg_trigger
  where tgname in ('vault_require_upload_consent', 'assets_require_upload_consent')
    and (tgtype & 16) = 0   -- not UPDATE
    and (tgtype & 8) = 0;   -- not DELETE
  perform t('SCOPE gate fires on INSERT only (existing files unaffected)', '2', n::text, n = 2);
end$$;

-- ---------------------------------------------------------------------------
\echo ''
\echo '================ 0011 CONSENT RESULTS ================'
select n, case when pass then 'PASS' else '*** FAIL ***' end as result, name, got from r order by n;
select count(*) filter (where pass) as passed,
       count(*) filter (where not pass) as failed
from r;
