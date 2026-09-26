-- Regression suite for migration 0007.
-- Every test re-runs an exploit the audit MEASURED against 0001..0006 and
-- asserts it is now refused — plus a happy-path block proving the product flow
-- still works, which matters more than any of the hardening.

\set ON_ERROR_STOP off
\pset pager off

create temporary table r(n int generated always as identity, name text, want text, got text, pass boolean);

-- SECURITY DEFINER so a test still inside `set local role authenticated` can
-- record its own result. Without it, only tests that RAISE could write here —
-- an exception handler's savepoint rollback silently restores the role, so the
-- passing-but-not-raising tests were the ones that appeared to fail.
create or replace function t(p_name text, p_want text, p_got text, p_pass boolean)
returns void language sql security definer
as $$ insert into r(name,want,got,pass) values (p_name,p_want,p_got,p_pass) $$;

-- ---------------------------------------------------------------------------
-- fixtures: two users, A and B
-- ---------------------------------------------------------------------------
do $$
begin
  insert into auth.users (id, email, raw_user_meta_data) values
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@test.invalid', '{}'),
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@test.invalid', '{}');
end$$;

-- B holds 2048 real bytes, so cross-user probes have something to find.
insert into storage.objects (bucket_id, name, metadata)
values ('vault', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/b1.png', '{"size":2048,"mimetype":"image/png"}');

-- ===========================================================================
-- HAPPY PATH FIRST. If 0007 broke the product, nothing else matters.
-- ===========================================================================
do $$
declare ok boolean; n bigint; used bigint;
begin
  -- A signs up -> profile + free subscription exist (0001 trigger)
  select count(*)=1 into ok from public.profiles where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  perform t('HAPPY signup created a profile','1 row', ok::text, ok);
  select count(*)=1 into ok from public.subscriptions
    where user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and plan='free';
  perform t('HAPPY signup created a free subscription','1 row', ok::text, ok);

  -- A uploads: object then asset row, exactly as the app does
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';

  insert into storage.objects (bucket_id, name, metadata) values
    ('vault','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/11111111-1111-4111-8111-111111111111.png',
     '{"size":4096,"mimetype":"image/png"}');
  perform t('HAPPY A can upload an object to its own prefix','insert ok','insert ok',true);

  insert into public.assets (user_id, filename, storage_key, mime_type, file_size_bytes) values
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','holiday.png',
     'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/11111111-1111-4111-8111-111111111111.png',
     'application/octet-stream', 1);
  perform t('HAPPY A can register the asset','insert ok','insert ok',true);

  -- size and mime were taken from storage, not from what the client asserted
  select file_size_bytes, mime_type='image/png' into n, ok from public.assets
    where user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  perform t('HAPPY size overwritten from storage','4096', n::text, n=4096);
  perform t('HAPPY mime overwritten from storage','image/png', ok::text, ok);

  -- A lists its own vault, and sees only its own
  select count(*) into n from public.assets;
  perform t('HAPPY A lists only its own assets','1', n::text, n=1);
  select count(*) into n from storage.objects;
  perform t('HAPPY A lists only its own objects','1', n::text, n=1);

  -- usage reads work
  select used_bytes into used from public.my_storage_usage();
  perform t('HAPPY my_storage_usage works for A','4096', used::text, used=4096);

  -- A deletes its own asset and object
  delete from public.assets where user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  select count(*) into n from public.assets;
  perform t('HAPPY A can delete its own asset','0', n::text, n=0);
  delete from storage.objects
    where name='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/11111111-1111-4111-8111-111111111111.png';
  perform t('HAPPY A can delete its own object','deleted','deleted',true);
exception when others then
  perform t('HAPPY PATH BROKE','no error', sqlstate||' '||sqlerrm, false);
end$$;

-- ===========================================================================
-- Each fix, as its own attack.
-- ===========================================================================

-- 1. negative declared size (INSERT-only, needed no UPDATE privilege)
do $$
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';
  insert into storage.objects (bucket_id,name,metadata) values
    ('vault','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/neg.bin','{"size":-1099511627776}');
  perform t('FIX negative declared size refused','rejected','ACCEPTED — still exploitable',false);
exception when others then
  perform t('FIX negative declared size refused','rejected', sqlstate||': '||sqlerrm, sqlstate='23514');
end$$;

-- 2. owner rewrites metadata.size (the unbounded bypass: 1 insert + 1 update)
do $$
declare acc bigint;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';
  insert into storage.objects (bucket_id,name,metadata) values
    ('vault','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/sneak.bin','{"size":1}');
  update storage.objects set metadata='{"size":109951162777600}'
    where name='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/sneak.bin';
  acc := public.user_stored_bytes('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  perform t('FIX owner cannot raise metadata.size','rejected','ACCEPTED — accounted '||acc,false);
exception when others then
  perform t('FIX owner cannot raise metadata.size','rejected', sqlstate||': '||sqlerrm, sqlstate='23514');
end$$;

-- Self-contained: the previous version updated sneak.bin, which the block above
-- had already rolled back, so it matched zero rows, fired no trigger and read as
-- "ACCEPTED" while proving nothing. Each strip variant now creates its own row.
do $$
declare shape text; shapes text[] := array['strip','null','emptystring'];
begin
  foreach shape in array shapes loop
    insert into storage.objects (bucket_id,name,metadata)
      values ('vault','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/s_'||shape||'.bin','{"size":4096}');
    begin
      set local role authenticated;
      set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';
      if shape = 'strip' then
        update storage.objects set metadata = metadata - 'size'
          where name='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/s_'||shape||'.bin';
      elsif shape = 'null' then
        update storage.objects set metadata = jsonb_set(metadata,'{size}','null')
          where name='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/s_'||shape||'.bin';
      else
        update storage.objects set metadata = jsonb_set(metadata,'{size}','""')
          where name='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/s_'||shape||'.bin';
      end if;
      perform t('FIX owner cannot erase metadata.size ('||shape||')','rejected','ACCEPTED — usage resettable',false);
    exception when others then
      perform t('FIX owner cannot erase metadata.size ('||shape||')','rejected', sqlstate||': '||sqlerrm, sqlstate='23514');
    end;
  end loop;
end$$;

-- 3. empty-string size no longer bricks the usage sum
do $$
declare acc bigint;
begin
  insert into storage.objects (bucket_id,name,metadata) values
    ('vault','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/empty.bin','{"size":""}');
  acc := public.user_stored_bytes('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  perform t('FIX empty-string size does not crash usage sum','a number', acc::text, true);
exception when others then
  perform t('FIX empty-string size does not crash usage sum','a number', sqlstate||': '||sqlerrm, false);
end$$;

-- 4. the retired tier is unwritable, and a referenced tier cannot be deleted
do $$
begin
  update public.subscriptions set plan='pro' where user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  perform t('FIX plan=pro is unwritable','rejected','ACCEPTED — silent free fallback',false);
exception when others then
  perform t('FIX plan=pro is unwritable','rejected', sqlstate||': '||sqlerrm, sqlstate='23503');
end$$;

do $$
begin
  delete from public.plans where tier='free';
  perform t('FIX a referenced plan row cannot be deleted','rejected','ACCEPTED — quota would fail open',false);
exception when others then
  perform t('FIX a referenced plan row cannot be deleted','rejected', sqlstate||': '||sqlerrm, sqlstate='23503');
end$$;

-- 5. TRUNCATE (RLS cannot filter it)
do $$
begin
  set local role anon;
  truncate public.plans;
  perform t('FIX anon cannot TRUNCATE public.plans','rejected','ACCEPTED — quota globally disabled',false);
exception when others then
  perform t('FIX anon cannot TRUNCATE public.plans','rejected', sqlstate||': '||sqlerrm, sqlstate='42501');
end$$;

do $$
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';
  truncate public.profiles cascade;
  perform t('FIX authenticated cannot TRUNCATE public.profiles','rejected','ACCEPTED',false);
exception when others then
  perform t('FIX authenticated cannot TRUNCATE public.profiles','rejected', sqlstate||': '||sqlerrm, sqlstate='42501');
end$$;

-- 6. traversal-shaped keys, including the percent-encoded form
do $$
declare k text; shapes text[] := array[
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/../bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/x.png',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/%2e%2e/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/y.png',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/./bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/z.png',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa//deep.png',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/../../bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/w.png'
  ];
begin
  foreach k in array shapes loop
    begin
      set local role authenticated;
      set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';
      insert into storage.objects (bucket_id,name,metadata) values ('vault',k,'{"size":100}');
      perform t('FIX traversal key refused: '||k,'rejected','ACCEPTED',false);
    exception when others then
      perform t('FIX traversal key refused: '||k,'rejected', sqlstate, sqlstate in ('42501','23514'));
    end;
  end loop;
end$$;

-- 7. the cross-user oracles are no longer callable
do $$
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';
  perform public.user_storage_limit('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  perform t('FIX authenticated cannot call user_storage_limit','rejected','ACCEPTED — plan tier leaked',false);
exception when others then
  perform t('FIX authenticated cannot call user_storage_limit','rejected', sqlstate||': '||sqlerrm, sqlstate='42501');
end$$;

do $$
begin
  set local role anon;
  perform public.user_stored_bytes('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  perform t('FIX anon cannot call user_stored_bytes','rejected','ACCEPTED — byte total leaked',false);
exception when others then
  perform t('FIX anon cannot call user_stored_bytes','rejected', sqlstate||': '||sqlerrm, sqlstate='42501');
end$$;

-- 8. the definer-function attach escalation
do $$
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';
  create temporary table evil_t(id uuid, email text, raw_user_meta_data jsonb);
  create trigger evil after insert on evil_t for each row execute function public.handle_new_user();
  perform t('FIX cannot attach handle_new_user to own table','rejected','ACCEPTED — RLS bypass primitive',false);
exception when others then
  perform t('FIX cannot attach handle_new_user to own table','rejected', sqlstate||': '||sqlerrm, sqlstate='42501');
end$$;

do $$
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';
  create trigger evil2 before insert on public.subscriptions
    for each row execute function public.set_updated_at();
  perform t('FIX cannot attach a trigger to public.subscriptions','rejected','ACCEPTED — DDL on billing table',false);
exception when others then
  perform t('FIX cannot attach a trigger to public.subscriptions','rejected', sqlstate||': '||sqlerrm, sqlstate='42501');
end$$;

-- 9. display_name is capped
do $$
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';
  update public.profiles set display_name = repeat('x', 1048576)
    where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  perform t('FIX display_name is length-capped','rejected','ACCEPTED — unmetered storage',false);
exception when others then
  perform t('FIX display_name is length-capped','rejected', sqlstate||': '||sqlerrm, sqlstate='23514');
end$$;

-- 10. the error-code oracle: a cross-user insert must look identical whether or
--     not the victim is at their limit.
do $$
declare code_under text; code_at text;
begin
  -- victim B well under quota
  begin
    set local role authenticated;
    set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';
    insert into storage.objects (bucket_id,name,metadata) values
      ('vault','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/probe1.bin','{"size":1024}');
  exception when others then code_under := sqlstate;
  end;
  -- push B to its 5 GiB ceiling, then probe again
  insert into storage.objects (bucket_id,name,metadata) values
    ('vault','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/fill.bin','{"size":5368707072}');
  begin
    set local role authenticated;
    set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';
    insert into storage.objects (bucket_id,name,metadata) values
      ('vault','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/probe2.bin','{"size":1024}');
  exception when others then code_at := sqlstate;
  end;
  perform t('FIX cross-user error code is not a quota oracle',
            'same code both times',
            coalesce(code_under,'(none)')||' vs '||coalesce(code_at,'(none)'),
            code_under is not null and code_under = code_at);
end$$;

-- 11. asset mime_type cannot be flipped by delete-then-reinsert
do $$
declare m text;
begin
  insert into storage.objects (bucket_id,name,metadata) values
    ('vault','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/pic.png','{"size":512,"mimetype":"image/png"}');
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';
  insert into public.assets (user_id,filename,storage_key,mime_type,file_size_bytes) values
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','pic.png',
     'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/pic.png','image/svg+xml',1);
  select mime_type into m from public.assets
    where storage_key='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/pic.png';
  perform t('FIX asset mime_type comes from storage, not the client','image/png', m, m='image/png');
exception when others then
  perform t('FIX asset mime_type comes from storage, not the client','image/png', sqlstate||': '||sqlerrm, false);
end$$;

-- ---------------------------------------------------------------------------
\echo ''
\echo '================ 0007 REGRESSION RESULTS ================'
select n, case when pass then 'PASS' else '*** FAIL ***' end as result, name, got from r order by n;
select count(*) filter (where pass) as passed,
       count(*) filter (where not pass) as failed
from r;
