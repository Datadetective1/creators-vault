# Creator Lock — Supabase setup

For the product owner. Create the project, apply the schema, configure auth and
storage, set the Vercel variables, then verify. Paddle is **not** part of this —
see the last section.

Production origin used throughout: `https://creator-vault-inky.vercel.app`

Two things before you start:

- **Nothing here should cost money.** If any screen offers an upgrade, a payment
  method or a paid add-on, stop.
- **The final Playwright verification has to run on your machine.** The agent
  container has no network route to `*.supabase.co` — it is blocked by policy —
  so it cannot reach a real project at all.

---

## 0. Before clicking anything

1. Log in at <https://supabase.com/dashboard> and note which **organization** you
   are in, top-left. A project cannot be moved between orgs later.
2. **Organization → Billing**: confirm the plan is **Free** with **no payment
   method attached**. If a spend cap or usage limit is offered, set it to the
   most restrictive option.
3. Free projects are **paused after a period of inactivity**, and a free org has
   a low project cap. So don't create a throwaway project to look around — and
   if signup mysteriously stops working in a few weeks, check whether the project
   is paused before debugging anything.

> ### Read this before you invite anyone
>
> The product advertises **5 GiB per free user and 100 GiB per Creator user**,
> and the bucket's per-object ceiling is 5 GiB — one permitted file can consume a
> free user's entire advertised allowance. A free-tier Supabase project's
> included storage is a small fraction of that.
>
> The first creator who uploads real video will hit the *project's* limit, not
> ours, and the dashboard's remedy at that moment is an upgrade prompt. Before
> the first invite, read the real figures off **Reports → Usage** and decide
> whether the pilot caps uploads far below the advertised number, or whether a
> paid Supabase plan is approved with a budget. Don't discover this from a
> creator.

---

## 1. Create the project

| Field | Value |
|---|---|
| Name | `creator-lock-pilot` |
| Organization | the one confirmed above |
| Region | **South Asia (Mumbai) `ap-south-1`** — see below |
| Plan | **Free** |
| Database password | **Generate**, then save to your password manager |

**Region is permanent.** Changing it means a new project and redoing all of
this. `ap-south-1` is what the repo specifies, for Indian and Bangladeshi
creators. Open the dropdown and read it:

- Mumbai `ap-south-1` present → use it.
- Absent → **Singapore `ap-southeast-1`**. Next-nearest: Seoul
  `ap-northeast-2`, then Sydney `ap-southeast-2`.
- Do **not** accept a US or EU default. Uploads go browser → Storage directly,
  so region latency lands on the slowest path in the product.

Whichever you pick, write it down.

**The database password** is not needed anywhere in this document — every step
uses the dashboard SQL editor, which does not ask for it. It exists for direct
`psql` access later. Generate it, put it in your password manager, and do not
paste it into chat, a ticket, a commit or a note file.

---

## 2. Create the storage bucket first

Before the SQL, deliberately. Migration `0002` writes into `storage.buckets` and
creates policies on `storage.objects`, both owned by `supabase_storage_admin` on
a hosted project. If that write is refused, doing this by hand means you still
have a correctly configured bucket rather than none.

**Storage → New bucket:**

| Setting | Value |
|---|---|
| Name | `vault` — exactly, lowercase; it is a hardcoded constant |
| Public bucket | **OFF** |
| File size limit | `5368709120` bytes (5 GiB) |
| Allowed MIME types | **leave empty** — `0004` sets the 34-entry allowlist |

Leave the MIME list empty on purpose. If you type your own and `0004`'s update is
later refused, you keep whatever the form left behind — and that allowlist is the
only place the deliberate **SVG exclusion** is enforced on the stored bytes.

---

## 3. Apply the migrations

First, one query that decides everything about the storage half:

```sql
select current_user,
       pg_has_role(current_user,'supabase_storage_admin','USAGE') as can_act_as_storage_admin,
       has_table_privilege('storage.buckets','INSERT')            as can_write_buckets,
       (select relrowsecurity from pg_class where oid='storage.objects'::regclass) as objects_rls_on;
```

Interpretation, corrected against what the live project actually did:

- `can_act_as_storage_admin` will most likely read **false** — `postgres` is not
  a member of that role. That does **not** mean the storage DDL fails. Measured
  on the live project: `CREATE POLICY` and `CREATE TRIGGER` on `storage.objects`
  both succeed as `postgres`; the single statement that fails is
  `ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY`. Migration `0008`
  exists for precisely that statement — which is why it is not optional.
- Do **not** try `set role supabase_storage_admin;`. With `postgres` not a
  member, that statement fails with 42501 as well. (An earlier version of this
  runbook recommended it; that advice was wrong.)
- If `can_write_buckets` is false, the bucket you made in step 2 stands in for
  `0002`'s write. Note it and carry on.

Then **SQL Editor**, one file per query tab, in filename order, **all eight**:

```
0001_init.sql
0002_storage.sql
0003_admin_stats.sql
0004_quota_enforcement.sql
0005_checkout_sessions.sql
0006_retire_pro_plan.sql
0007_harden_quota_and_isolation.sql
0008_storage_hardening_hosted.sql
```

Run them as **eight separate executions**, not one paste. A multi-statement send
is one implicit transaction, so a failure in a later file silently discards the
earlier ones. Wrap each file in `begin; … commit;` so a failure rolls that file
back rather than leaving it half-applied, and read the result panel after each
one. All seven are replay-safe, so re-running a file is fine.

`0007` and `0008` are not optional. `0007` closes a set of quota bypasses and
cross-user leaks measured against `0001..0006`; `0008` is what makes `0007`'s
`storage.objects` half actually land on a hosted project. `supabase/tests/`
holds the proof for both.

### Statements that may error

| File | Error | What to do |
|---|---|---|
| `0001` `create trigger on_auth_user_created on auth.users` | `must be owner of relation users` | **Stop.** Without it no profile or subscription row is ever created and signup is broken. This is a well-worn Supabase pattern and should work. |
| `0002` `insert into storage.buckets` | permission denied / RLS violation on `buckets` | Non-fatal **because you did step 2** — the bucket already exists correctly. Note it and continue. |
| `0002` the four `create policy … on storage.objects` | `must be owner of relation objects` | **Stop.** These are the whole file-isolation guarantee. |
| `0004` / `0007` `create trigger … on storage.objects` | `must be owner` | Tell me. Without it the storage-side quota does not exist and only the `assets` trigger enforces the limit. |
| `0004` `update storage.buckets set allowed_mime_types` | *no error, zero rows* | A refused `UPDATE` under RLS raises nothing. Always verify it (below); if empty, enter the types by hand from `0004`. |
| `0007`'s storage block | `NOTICE: SKIPPED the storage.objects hardening` | **Expected on hosted, and `0008` is the fix — just carry on to it.** The block's exception handler rolls the *whole* block back, not only the failing `ALTER`, so the policies and trigger are discarded rather than skipped. `0008` re-does them without the `ALTER`. |
| `0008` | `must be owner of table objects` on `CREATE POLICY` | Then the storage isolation guarantee genuinely cannot be installed from SQL. **Stop and say so** — this contradicts what the live project measured. |

---

## 4. Auth configuration

**Authentication → URL Configuration.** Site URL, exactly, **no trailing slash**
(the app concatenates `/auth/callback`, so a trailing slash yields
`//auth/callback`):

```
https://creator-vault-inky.vercel.app
```

Redirect URLs — the allowlist is matched **including the query string**, so the
`?next=` entries are not optional:

```
https://creator-vault-inky.vercel.app/auth/callback
https://creator-vault-inky.vercel.app/auth/callback?next=/reset-password
http://localhost:3000/auth/callback
http://localhost:3000/auth/callback?next=/reset-password
```

If the field accepts `**`, these two replace the four above:

```
https://creator-vault-inky.vercel.app/auth/callback**
http://localhost:3000/auth/callback**
```

**Vercel previews: add nothing.** A preview cannot complete an emailed link as
the code stands — the app always emails the production origin and the PKCE
verifier cookie is host-scoped, so the exchange fails with
`/login?error=link_expired`. A wildcard would not fix it. Previews are left
unconfigured on purpose (see step 5).

### Email confirmation — the two requirements conflict

- **ON** is required for the signup anti-enumeration defence: an existing address
  and a new one return the identical neutral notice.
- **OFF** is required for the gated Playwright journey to run at all — it submits
  the signup form and waits for `/dashboard`, which only happens when a session
  is returned, which only happens with confirmation off.

Sequence it, in one sitting:

1. Turn **Confirm email OFF**.
2. Keep the Vercel deployment behind Vercel's deployment protection so the public
   cannot reach `/signup` while it is off — during that window anyone who finds
   the URL can create a fully entitled account with an address they don't own.
3. Run the whole of step 7, Playwright included.
4. Turn **Confirm email ON**, then attempt one signup and confirm you get the
   "Check your email" notice.
5. Remove deployment protection, then invite creators.

After step 4 the gated spec cannot run again until someone adds a mail-capture
step. That is expected.

### Other auth settings

| Setting | Value | Why |
|---|---|---|
| Allow new users to sign up | **ON** | |
| Minimum password length | **8** | matches the app's own rule and the form's hint |
| All OAuth / social providers | **OFF** | nothing is wired; no provider button exists |
| Anonymous sign-ins | **OFF** | a NULL email aborts the whole signup transaction — `profiles.email` is `NOT NULL` |
| Phone auth | **OFF** | same reason |
| CAPTCHA | **OFF** | the app never sends a captcha token; enabling it breaks signup, login and reset with misleading messages |
| MFA / AAL2 enforcement | **OFF** | no MFA calls exist in the app |
| Secure password change (reauthentication) | **OFF** | the code sends no nonce; enabling it plausibly breaks password change |
| Email templates | defaults | the default `{{ .ConfirmationURL }}` is what `/auth/callback`'s PKCE branch expects |

Custom SMTP isn't required yet, but with confirmation ON, hitting the built-in
mailer's free hourly cap makes signup *appear* to succeed while no mail arrives.
Worth provisioning before real volume.

---

## 5. Environment variables in Vercel

**Project → Settings → Environment Variables.** Only these names are read by the
code — don't invent others.

| Variable | Value from | Prod | Preview | Dev | Secret? |
|---|---|:--:|:--:|:--:|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL | ✅ | ❌ | ✅ | No — ships in the browser bundle |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same screen → **public / anon / publishable** key | ✅ | ❌ | ✅ | No — ships in the browser bundle, by design |
| `SUPABASE_SERVICE_ROLE_KEY` | same screen → **service_role / secret** key | ✅ | ❌ | ✅ local only | **YES. Server-only. Never prefix `NEXT_PUBLIC_`. Never set in Preview.** |
| `NEXT_PUBLIC_SITE_URL` | not from Supabase. Prod `https://creator-vault-inky.vercel.app`, dev `http://localhost:3000` | ✅ | ❌ | ✅ | No |
| `ADMIN_EMAILS` | your own address, comma-separated | ✅ | ❌ | ✅ | Sensitive, not secret |
| `NEXT_PUBLIC_PADDLE_ENVIRONMENT` | `sandbox`, or omit (it defaults to sandbox) | optional | ❌ | optional | No |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | **do not set** | — | — | — | — |
| `PADDLE_API_KEY` | **do not set** | — | — | — | — |
| `PADDLE_WEBHOOK_SECRET` | **do not set** | — | — | — | — |
| `PADDLE_CREATOR_PRICE_ID` | **do not set** | — | — | — | — |

- **Leave the Paddle variables absent** — absent, not empty. That is what keeps
  billing off: checkout returns 503 and the plan page says paid plans are not
  switched on. Setting the client token, API key and price id together is the
  switch that turns real money on.
- **Preview is intentionally unconfigured.** There is one Supabase project; if
  Preview held these values, every branch deployment would sign users into your
  live database and count against your storage quota. Unconfigured, a preview
  degrades to the honest "not switched on" landing page.
- `VERCEL_URL` and `VERCEL_PROJECT_PRODUCTION_URL` are injected by Vercel. Don't
  set them.
- **Trigger a new deployment after saving.** `NEXT_PUBLIC_*` values are inlined
  at build time and have no effect on the deployment already live. If `/signup`
  still shows the "not switched on" notice, you are looking at the old build.

**Which Vercel project?** Two are connected to this repo — `creator-vault` and
`creators-vault` — and both build on every push. Confirm which one owns the
`creator-vault-inky.vercel.app` domain before pasting anything; variables in the
wrong project leave production broken while a preview works.

Locally the same values go in `.env.local` (gitignored). Run `npm run build`
after writing it — Playwright serves an already-built bundle.

---

## 6. What to send back

**Do not paste into chat:** the `service_role` key, the database password, or any
connection string. Those go straight into Vercel and your own `.env.local`.

| Needed | How |
|---|---|
| Project URL (`https://<ref>.supabase.co`) | paste — it is public and ships in the browser bundle |
| Region actually chosen | one word; it is permanent and belongs in the pilot brief |
| Which key style the dashboard offered — legacy `anon`/`service_role` JWTs, or newer `sb_publishable_` / `sb_secret_` | one line. Both work with the installed `supabase-js` 2.116.0 and `@supabase/ssr` 0.12.7 |
| Any error text from step 3 | verbatim, in full — it says whether the storage security layer exists |
| The step 7 verification output | the result rows |
| The Playwright summary line | it cannot be run from the agent container |
| Confirmation that email confirmation ended **ON** | one line |

If service-role access is ever needed, the right answer is that **you** run the
statement and paste the output — not that you hand over the key.

---

## 7. Verification

**7a. Schema.** Paste this and send the output:

```sql
select 'plans' as check, string_agg(tier::text, ',' order by sort_order) as value from public.plans
union all select 'objects_rls', (select relrowsecurity::text from pg_class where oid='storage.objects'::regclass)
union all select 'vault_policies', (select count(*)::text from pg_policy where polrelid='storage.objects'::regclass)
union all select 'storage_trigger', (select count(*)::text from pg_trigger where tgname='vault_enforce_storage_quota' and not tgisinternal)
union all select 'fks_to_plans', (select count(*)::text from pg_constraint where confrelid='public.plans'::regclass)
union all select 'anon_can_read_limits', (select has_function_privilege('anon','public.user_storage_limit(uuid)','EXECUTE')::text)
union all select 'bucket_private', (select (not public)::text from storage.buckets where id='vault')
union all select 'mime_count', (select coalesce(array_length(allowed_mime_types,1),0)::text from storage.buckets where id='vault')
union all select 'svg_allowed', (select ('image/svg+xml' = any(allowed_mime_types))::text from storage.buckets where id='vault');
```

Expected: `free,creator` · `true` · `4` · `1` · `2` · `false` · `true` · `34` ·
`false`. Anything else, send it before going further — `objects_rls = false`
means every creator's files are readable by every other creator.

**7b. The journey**, on the deployed site: sign up, confirm if required, log in,
reach the dashboard, upload a small image, upload a small video, watch storage
usage update, see the file in My Vault, download it, delete it, confirm it is
gone from both the vault list and **Storage → vault** in the dashboard.

**7c. Isolation.** Repeat the signup with a second address. Confirm user B sees
an empty vault, and that pasting user A's download URL after it expires fails.

**7d. Things only the real service can prove.** Try to upload a `.svg` — it must
be refused by the MIME allowlist. Nothing in the database enforces that; only
Supabase's storage service does.

**7e. Playwright**, on your machine, with `.env.local` written and
`npm run build` done and email confirmation still **OFF**:

```bash
E2E_SUPABASE_READY=1 npm run test:e2e
```

Two currently-skipped specs should run: the creator journey, and "a second
creator cannot see the first creator's files".

A green run here does **not** prove RLS. It exercises the app's own API routes,
which filter by user anyway. The direct-PostgREST isolation checks are separate;
`supabase/tests/` covers the database half locally.

---

## 8. Paddle — not yet

Do not configure Paddle until the journey above passes end to end. The next phase
is free user → sandbox checkout → $4/month Creator → 100 GB entitlement →
webhook → dashboard reflects the paid plan. Leaving the four Paddle variables
absent is what keeps billing off in the meantime.

---

## Still outstanding

**There is no Terms of Service and no Privacy Policy in this repo**, while the
site makes pricing and data-handling representations publicly and the footer
already promises "Your files stay private." That is a launch blocker and no
amount of Supabase configuration changes it.
