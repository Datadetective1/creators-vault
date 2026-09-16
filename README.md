# Creator Vault

> Your content is your business. Protect the work behind your brand.

A validation pilot: a creator signs up, subscribes, uploads the files their
business depends on, and can download or delete them at any time.

**Stack:** Next.js 16 · TypeScript · Supabase (Auth, Postgres, Storage) ·
Paddle (subscriptions) · Vercel

---

## Status

The application is complete and builds clean. It needs three external accounts
before anyone can sign up — see **Setup** below.

| Area | State |
|---|---|
| Landing page | Works with no configuration |
| Auth, vault, uploads | Needs a Supabase project |
| Subscriptions | Needs a Paddle sandbox account |
| Deployment | Needs a Vercel project |

Without credentials the site still builds and deploys: the landing page is fully
functional and the auth pages show an honest "not switched on yet" notice rather
than erroring.

---

## Setup

### 1. Supabase

1. Create a project at <https://supabase.com/dashboard> — choose the
   **South Asia (Mumbai) `ap-south-1`** region for creators in India.
2. **Project Settings → API**, copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-only, never
     expose this to the browser)
3. **SQL Editor**, run the migrations in `supabase/migrations/` in order:
   `0001_init.sql`, then `0002_storage.sql`, then `0003_admin_stats.sql`.
   This creates the tables, all RLS policies, and the private `vault` bucket.
4. **Authentication → URL Configuration**: set Site URL to your deployed origin
   and add `<origin>/auth/callback` to Redirect URLs.

### 2. Paddle

1. Create a **sandbox** account at <https://sandbox-vendors.paddle.com>.
2. **Catalog → Products**: create a "Creator" product and a "Pro" product, each
   with a recurring monthly price. Copy each price id (`pri_...`) into
   `PADDLE_CREATOR_PRICE_ID` and `PADDLE_PRO_PRICE_ID`.
3. **Developer Tools → Authentication**: create an API key → `PADDLE_API_KEY`.
4. **Developer Tools → Client-side tokens**: create one →
   `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`.
5. **Developer Tools → Notifications**: add a destination pointing at
   `https://<your-domain>/api/paddle/webhook`, subscribed to the
   `subscription.*` events. Copy the signing secret → `PADDLE_WEBHOOK_SECRET`.

Leave `NEXT_PUBLIC_PADDLE_ENVIRONMENT=sandbox` until you go live.

### 3. Run it

```bash
cp .env.example .env.local   # then fill in the values
npm install
npm run dev
```

---

## Commands

```bash
npm run dev         # development server
npm run build       # production build
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm run test:e2e    # Playwright (public surface only by default)

# The full signed-in journey, once Supabase is live:
E2E_SUPABASE_READY=1 npm run test:e2e
```

---

## How it is put together

```
src/
  app/
    page.tsx                    landing page
    (auth)/                     login, signup, password reset
    dashboard/                  overview, vault, upload, plan
    admin/                      internal pilot stats (ADMIN_EMAILS gated)
    api/
      assets/                   upload authorisation, list, download, delete
      paddle/                   checkout price lookup, webhook
  lib/
    storage/                    provider-agnostic file storage
    vault.ts                    quota + asset lifecycle
    paddle.ts                   subscription mapping
    supabase/                   browser / server / admin clients
supabase/migrations/            schema, RLS, storage policies
e2e/                            Playwright specs
```

### Storage is behind a provider interface

`assets` rows store `storage_provider` **and** `storage_key`, and all file
operations go through the `StorageProvider` interface in
`src/lib/storage/types.ts`. No application code builds or parses a
Supabase-specific URL.

Supabase Storage is the only implementation today. Adding another private object
store later means writing one class and registering it in
`src/lib/storage/index.ts`. Reads dispatch on each row's own
`storage_provider`, so existing files keep resolving through whichever provider
actually holds them — **creators never re-upload**.

### Uploads do not pass through the server

The browser asks `/api/assets/upload-url` for a short-lived signed target, then
sends the bytes straight to storage and calls `/api/assets` to record the file.
Vercel caps a function request body at 4.5 MB; this path sidesteps that
entirely, so multi-gigabyte video works.

### Security model

- **Private bucket.** No public object URLs. Downloads use 60-second signed
  URLs issued only after ownership is confirmed.
- **RLS on every table**, plus storage policies pinning each object's first path
  key segment to `auth.uid()`. Isolation is enforced by Postgres, not by
  frontend filtering.
- **Subscriptions are read-only to users.** Only the webhook writes them, using
  the service-role key, so nobody can grant themselves a paid plan.
- **Storage keys are `<user_id>/<uuid>.<ext>`** — never derived from the
  uploaded filename, so path traversal is structurally impossible.
- **Quota is enforced server-side** before an upload is authorised, and the
  recorded size is read back from storage rather than trusted from the client.
  It is charged against what is actually in storage, not just what was
  recorded, so bytes uploaded without finalising still count. Objects older
  than an hour with no asset row are swept on the next upload, so a dropped
  connection does not permanently consume a creator's allowance.
- **Webhooks are signature-verified** with the raw request body.
- **`.env*` is gitignored.** No secret belongs in this repository.

---

## Known limits for the pilot

- Supabase's built-in auth mailer is rate-limited on the free tier. If sign-up
  volume grows, point **Custom SMTP** at a transactional provider.
- Cancellation and payment-method changes are handled through Paddle's own
  emails rather than an in-app portal.
- E2E coverage is Chromium-only.
