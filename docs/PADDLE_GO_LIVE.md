# Paddle go-live runbook

Production billing stays **off** until the owner explicitly approves turning it
on. Checkout is off whenever `PADDLE_API_KEY`, `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`
or `PADDLE_CREATOR_PRICE_ID` is missing from Vercel Production — the checkout
route answers 503 and the plan page says paid plans are not switched on.

## Before approval (safe — cannot charge anyone)

1. Owner completes Paddle live verification, adds payout details, and gets
   `creatorlock.app` approved (**Checkout → Website approval**).
2. Owner sets **Checkout → Checkout settings → Default payment link** to
   `https://www.creatorlock.app/dashboard/billing`.
3. Owner creates a live API key (**Developer tools → Authentication → API
   keys**) and saves it in `.env.local` as `PADDLE_LIVE_API_KEY=pdl_live_…`.
4. Run `node scripts/paddle-live-setup.mjs --check`, then
   `node scripts/paddle-live-setup.mjs`. This creates or reuses the live
   product, the US$4/month price, a client token and an **inactive** webhook
   destination for `https://www.creatorlock.app/api/paddle/webhook`, and writes
   the values to `.env.paddle-live.local` (git-ignored). Nothing reaches Vercel.

### Done — live catalog created 26 September 2026

The live account was empty (no products, prices, discounts, destinations,
tokens, customers, subscriptions or transactions), so everything was created;
nothing was reused, archived or recreated.

| Entity | Sandbox | Live |
|---|---|---|
| Product "Creator Lock — Creator" | `pro_01m3fh8hvsztbdz6ch6pz0wyvj` (standard) | `pro_01m3ft0zfaz3vrwtt02cpn21je` (saas) |
| Price US$4.00 / month, qty 1, tax on top | `pri_01m3fh8j3t839z7spaq4kbsq23` | `pri_01m3ft0zqt5537are2nr1cnw22` |
| Discounts | none | none |
| Webhook destination | `ntfset_01m3fha7kawcvxnkdarx16b6mz` (inactive, old tunnel) | `ntfset_01m3ft100698bsy77qav26k76n` → production URL, **inactive** |
| Client token | `test_…` | `live_…` (`ctkn_01m3ft0zvh5rz44yw8m764ycqa`) |

No code change maps these: price ids, tokens and hosts come from environment
variables, so going live is `.env.paddle-live.local` → Vercel Production.
Verified locally with the live values: checkout issues the live price, the plan
page loads the live token, and a webhook signed with the live secret applies
(one signed with the sandbox secret is rejected).

Never delete or recreate the live destination: that rotates its signing secret.

## On approval (this is the step that enables real charges)

5. Add to Vercel **Production** (project `creator-vault`), all as Sensitive
   except the two `NEXT_PUBLIC_` values, from `.env.paddle-live.local`:
   `NEXT_PUBLIC_PADDLE_ENVIRONMENT`, `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`,
   `PADDLE_API_KEY`, `PADDLE_CREATOR_PRICE_ID`, `PADDLE_WEBHOOK_SECRET`.
6. Activate the webhook destination (`PATCH /notification-settings/{id}` with
   `active: true`, id in `.env.paddle-live.local`).
7. Redeploy production. `NEXT_PUBLIC_` values are inlined at build time, so a
   redeploy is required.
8. Owner makes one real purchase, confirms the plan page shows Creator and the
   100 GB allowance, then in Paddle refunds it (**Transactions → order →
   Refund**) and cancels it (**Subscriptions → subscription → Cancel →
   Immediately**). A refund alone does not cancel a Paddle subscription, and
   the Refund Policy promises both.

## Rolling back

Remove `PADDLE_API_KEY` (or the client token or price id) from Vercel
Production and redeploy — checkout returns to 503 immediately. Deactivate the
webhook destination in Paddle.
