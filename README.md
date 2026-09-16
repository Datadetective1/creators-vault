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
3. **SQL Editor**, run every file in `supabase/migrations/` in numeric order:
   `0001_init.sql`, `0002_storage.sql`, `0003_admin_stats.sql`,
   `0004_quota_enforcement.sql`, `0005_checkout_sessions.sql`.
   These create the tables, all RLS policies, the private `vault` bucket, and
   the triggers that enforce size and quota in the database.
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

### Media assets

Every tile on the landing page is real creator photography, and the hero
backdrop is real footage, all sourced from Pexels under the
[Pexels License](https://www.pexels.com/license/) (free for commercial use,
modification allowed, attribution not required). Provenance for every file —
source page, photographer, licence — is recorded in
[public/media/CREDITS.md](public/media/CREDITS.md).

`scripts/photo-manifest.json` is the source of truth: one entry per slot with
the photo's URL, page, credit and licence, plus the hero video. Run

```bash
FFMPEG=/path/to/ffmpeg node scripts/ingest-photos.mjs
```

to (re)build `public/media/photos/*.webp` (attention-cropped to each tile's
exact aspect ratio, ≤1280 px, WebP q72) and the hero loop
(`hero-creator.webm` VP9 + `hero-creator.mp4` H.264 fallback + poster, 720p,
9-second seamless cross-faded loop, no audio track). Without `FFMPEG` the
photos still import and the video is reported as skipped. The script also
regenerates [CREDITS.md](public/media/CREDITS.md), crediting everything that is
on disk rather than only the current run's downloads, so a partial run never
drops the record for a file that is still shipping.

The hero video is muted, `playsInline`, `loop` and poster-backed. Motion is
opt-in: the element ships with no `autoplay` and no `<source>` children, and
the client adds them only once it knows the viewer has not asked for reduced
motion. A browser that blocks autoplay — or a visitor with reduced motion —
simply sees the poster, and in the reduced-motion case the 618 KB loop is never
requested at all.

**Changing a picture:** edit the manifest entry (URL, credit, optional crop
`position`, optional `crop` box) and re-run the script. `crop` takes
`{left, top, width, height}` as fractions of the framed tile and is how a shot
whose full frame carries a legible third-party wordmark earns its place — see
`brand-01`. `src/lib/media.ts` keeps a `swapHint` per
slot describing the brief, so a replacement stays on-brief and at the same
aspect ratio without any layout change.

`scripts/generate-media.mjs` is the earlier fallback that produced original
gradient artwork when no stock library was reachable; it is kept for that
scenario but its output is no longer committed.

### Motion

Scroll reveals use IntersectionObserver with a rect-based backstop, and the
hidden state is gated on `html[data-js="1"]` — set by an inline script in the
document head. If scripting never runs, the page renders fully visible rather
than blank. `prefers-reduced-motion` disables every animation and settles the
product demo on its final frame.

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
- **Quota and size are enforced in the database, not in the API.** Every
  browser holds the anon key and the user's JWT, so PostgREST and the Storage
  API are reachable without going through our routes — application-layer checks
  alone would be advisory. A trigger on `assets` overwrites `file_size_bytes`
  from the real stored object and checks the plan limit under a per-user lock
  (which also closes the race where parallel uploads each read the same
  pre-insert total); a trigger on `storage.objects` rejects over-quota uploads
  that skip the metadata table entirely.
- **The bucket has an allowed MIME type list**, so the type allowlist — notably
  the deliberate SVG exclusion — holds on the stored bytes and not only on what
  the client declared. `finalizeUpload` re-validates against the stored object.
- **Abandoned uploads are swept.** A dropped connection can strand an object
  with no asset row. Objects older than an hour with no row are cleaned up on
  the next upload — bounded, chunked, and strictly advisory, so a failed sweep
  can never block a creator from uploading.
- **`profiles.email` is not user-writable** (column-level grant), so no future
  feature can trust it as an identity.
- **Webhooks are signature-verified** with the raw request body, and the
  account they apply to is resolved from a server-minted nonce. The browser
  never sees or supplies a user id, so a correctly-signed Paddle event cannot
  be steered onto someone else's account. Writes additionally refuse to
  reassign a subscription that already belongs to a different Paddle customer.
- **`.env*` is gitignored.** No secret belongs in this repository.

---

## Known limits for the pilot

- Supabase's built-in auth mailer is rate-limited on the free tier. If sign-up
  volume grows, point **Custom SMTP** at a transactional provider.
- Cancellation and payment-method changes are handled through Paddle's own
  emails rather than an in-app portal.
- E2E coverage is Chromium-only.
- Landing photography is stock. A stock licence covers the image but is not a
  model release for every marketing use of an identifiable person — confirm
  before a paid campaign, and never present anyone as endorsing the product.
- Paddle's SDK enforces a **5-second** tolerance on the webhook timestamp, so a
  server with significant clock skew will reject every webhook and entitlement
  will silently stop syncing. Worth checking first if plans stop updating.
- Migrations 0004 and 0005 create a trigger on `storage.objects`. The Supabase
  SQL Editor runs as `postgres` and can do this; if a future hosted change
  restricts it, the `assets` trigger still enforces quota for every file the
  app records.
- Entitlement does not yet check `current_period_end`, so a lost webhook could
  leave a paid allowance in place longer than it should. There is no
  `event_id` idempotency guard either, so a delayed retry can overwrite newer
  state. Both are worth adding before charging at scale.
- Changing a password does not require re-entering the old one; enable
  Supabase's reauthentication setting before launch.
- No Content-Security-Policy header yet (no XSS sink exists today — this is
  defence in depth).
