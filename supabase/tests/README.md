# Migration tests

These prove the database actually enforces what the migration comments claim,
against a real PostgreSQL 16 instance. They exist because the claims in
`0004_quota_enforcement.sql`'s header — that a client-asserted file size is
ignored, and that the plan limit is checked under a per-user lock — were not
true as written, and nothing in the repo would have caught that.

No Supabase project, no network and no Docker needed. Local PostgreSQL 16 is
enough.

## Files

| File | What it is |
|---|---|
| `supabase-shim.sql` | A stand-in for the parts of a hosted Supabase project the migrations depend on but do not create: `auth.users`, `auth.uid()`, `storage.buckets`, `storage.objects`, `storage.foldername()`, the `anon` / `authenticated` / `service_role` roles, and Supabase's default blanket grants. |
| `0007_regression.sql` | 33 assertions: 11 that the ordinary upload → list → download → delete flow still works, and 22 that each measured exploit is now refused. |

The shim ends with a self-assertion block that aborts if its own contract is
broken — in particular if any role came out `SUPERUSER` or `BYPASSRLS`, which
would make every isolation test pass for the wrong reason.

## Running them

```bash
# once, as root
pg_ctlcluster 16 main start

su postgres -c "dropdb --if-exists cv_test" && su postgres -c "createdb cv_test"
su postgres -c "psql -q -v ON_ERROR_STOP=1 -d cv_test -f -" < supabase/tests/supabase-shim.sql
for m in supabase/migrations/0*.sql; do
  su postgres -c "psql -q -v ON_ERROR_STOP=1 -d cv_test -f -" < "$m" || break
done
su postgres -c "psql -q -d cv_test -f -" < supabase/tests/0007_regression.sql
```

The last command prints a table; the final row must read `33 | 0`.

Files are fed over stdin because `psql` runs as the `postgres` OS user and may
not be able to read a path under your home directory.

## What these tests cannot tell you

Real enforcement is split between Postgres and Supabase's `storage-api` service,
and only the Postgres half is here. Specifically **untested**, and worth checking
once against a throwaway hosted project:

- **The bucket's MIME allowlist and `file_size_limit`.** Both are rows in
  `storage.buckets`; nothing in Postgres enforces either. The deliberate
  exclusion of `image/svg+xml` is only real if `storage-api` honours it, so try
  uploading an `.svg` and confirm it is refused.
- **Whether `storage-api` normalises `..` when resolving a key to bytes.**
  `0007` constrains object keys to `<uuid>/<single-segment>` at the policy level,
  which refuses `..` and its percent-encoded form, so this should no longer be
  reachable — but the layer below has never been exercised here.
- **HTTP status codes.** These tests read SQLSTATEs. What PostgREST returns for
  `53100` or `23514`, and whether it echoes a trigger's message, is not covered.
- **JWT verification.** The tests set `request.jwt.claims` with `SET LOCAL`, which
  exercises policy predicates only — not signature, audience or expiry checks.
- **`service_role`'s RLS bypass.** On a hosted project that comes from how
  PostgREST connects, not from the `rolbypassrls` bit. The shim's `service_role`
  is deliberately an ordinary role, so nothing here describes the real webhook
  path.
- **Whether the `storage.objects` statements apply on a hosted project.** They
  need owner-level rights. Measured on the live project: `CREATE POLICY` and
  `CREATE TRIGGER` succeed as `postgres`, but `ALTER TABLE ... ENABLE ROW LEVEL
  SECURITY` does not — and because `0007` section 6 wraps everything in one
  exception handler, that single failure discarded the whole block. `0008` is
  the fix. These tests pass either way, because the local harness owns the
  table, so they cannot catch that class of problem at all.
