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
