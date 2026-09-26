#!/usr/bin/env node
/**
 * Prepare Paddle for Creator Lock — idempotent, never prints a secret.
 *
 *   node scripts/paddle-live-setup.mjs --check            # read-only: verify key, list what exists
 *   node scripts/paddle-live-setup.mjs                    # create or reuse catalog, token, webhook
 *   node scripts/paddle-live-setup.mjs --sandbox --check  # same checks against the sandbox
 *
 * Live mode reads PADDLE_LIVE_API_KEY from .env.local (it must start with
 * pdl_live_). Sandbox mode reads PADDLE_API_KEY (pdl_sdbx_).
 *
 * What it sets up, reusing anything already tagged for Creator Lock:
 *   - the "Creator Lock — Creator" product
 *   - the Creator price: US$4.00 every month, tax added on top (account setting)
 *   - a client-side token for Paddle.js
 *   - a webhook destination for the subscription events the app handles,
 *     created INACTIVE so nothing is delivered before billing is switched on
 *
 * Results go to .env.paddle-live.local (git-ignored by .env.*), ready to copy
 * into Vercel Production once live billing is approved. This script never
 * touches Vercel and never turns billing on.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const args = new Set(process.argv.slice(2));
const SANDBOX = args.has("--sandbox");
const CHECK_ONLY = args.has("--check");

const API = SANDBOX ? "https://sandbox-api.paddle.com" : "https://api.paddle.com";
const KEY_NAME = SANDBOX ? "PADDLE_API_KEY" : "PADDLE_LIVE_API_KEY";
const KEY_PREFIX = SANDBOX ? "pdl_sdbx_" : "pdl_live_";
const OUT_FILE = SANDBOX ? null : ".env.paddle-live.local";

const WEBHOOK_URL = "https://www.creatorlock.app/api/paddle/webhook";
const WEBHOOK_EVENTS = [
  "subscription.created",
  "subscription.updated",
  "subscription.activated",
  "subscription.canceled",
  "subscription.paused",
  "subscription.resumed",
  "subscription.trialing",
  "subscription.past_due",
];
const TAG = { app: "creator-lock", tier: "creator" };

function readEnv(file) {
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, "utf8")
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/))
      .filter(Boolean)
      .map(([, k, v]) => [k, v.trim().replace(/^["']|["']$/g, "")]),
  );
}

const key = readEnv(".env.local")[KEY_NAME] ?? "";
if (!key.startsWith(KEY_PREFIX)) {
  console.error(`${KEY_NAME} is missing from .env.local or is not a ${KEY_PREFIX}… key. Nothing was changed.`);
  process.exit(1);
}

async function api(method, path, body) {
  const response = await fetch(API + path, {
    method,
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(`${method} ${path.split("?")[0]} -> HTTP ${response.status} ${json.error?.code ?? ""}: ${json.error?.detail ?? ""}`);
    error.code = json.error?.code;
    throw error;
  }
  return json.data;
}

const tagged = (item) => item.custom_data?.app === TAG.app && item.custom_data?.tier === TAG.tier;

console.log(`Paddle ${SANDBOX ? "SANDBOX" : "LIVE"} — ${CHECK_ONLY ? "read-only check" : "set up"}`);
await api("GET", "/event-types");
console.log("  key: valid");

let product = (await api("GET", "/products?status=active&per_page=200")).find(tagged);
let price = product
  ? (await api("GET", `/prices?product_id=${product.id}&status=active&per_page=200`)).find(
      (p) => p.unit_price.amount === "400" && p.unit_price.currency_code === "USD" &&
        p.billing_cycle?.interval === "month" && p.billing_cycle?.frequency === 1,
    )
  : undefined;
let destination = (await api("GET", "/notification-settings")).find((n) => n.destination === WEBHOOK_URL);
const tokens = await api("GET", "/client-tokens?status=active").catch(() => []);

if (CHECK_ONLY) {
  console.log(`  product: ${product ? `${product.id} (${product.tax_category})` : "not created yet"}`);
  console.log(`  $4/month price: ${price ? price.id : "not created yet"}`);
  console.log(`  webhook → ${WEBHOOK_URL}: ${destination ? `${destination.id}, active=${destination.active}` : "not created yet"}`);
  console.log(`  active client tokens: ${tokens.length}`);
  process.exit(0);
}

if (!product) {
  const base = {
    name: "Creator Lock — Creator",
    description: "Up to 100 GB of private storage for your original creator files.",
    custom_data: TAG,
  };
  try {
    product = await api("POST", "/products", { ...base, tax_category: "saas" });
  } catch (error) {
    // SaaS may need Paddle's approval on a new account; standard always works
    // and can be changed later without touching the price or the app.
    console.log(`  saas tax category not available (${error.code ?? error.message}); using standard`);
    product = await api("POST", "/products", { ...base, tax_category: "standard" });
  }
}
console.log(`  product: ${product.id} (${product.tax_category})`);

if (!price) {
  price = await api("POST", "/prices", {
    product_id: product.id,
    name: "Creator monthly",
    description: "Creator — $4 per month",
    unit_price: { amount: "400", currency_code: "USD" },
    billing_cycle: { interval: "month", frequency: 1 },
    quantity: { minimum: 1, maximum: 1 },
    tax_mode: "account_setting",
    custom_data: TAG,
  });
}
console.log(`  price: ${price.id} — US$4.00 every month, tax added on top`);

const existingOut = OUT_FILE ? readEnv(OUT_FILE) : {};
let clientToken = existingOut.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
if (!clientToken) {
  const created = await api("POST", "/client-tokens", {
    name: "Creator Lock checkout",
    description: "Paddle.js on www.creatorlock.app",
  });
  clientToken = created.token;
  console.log(`  client token: created ${created.id}`);
} else {
  console.log("  client token: reusing the one already saved");
}

let webhookSecret = existingOut.PADDLE_WEBHOOK_SECRET;
if (!destination) {
  destination = await api("POST", "/notification-settings", {
    description: "Creator Lock production webhook",
    type: "url",
    destination: WEBHOOK_URL,
    api_version: 1,
    include_sensitive_fields: false,
    traffic_source: "all",
    subscribed_events: WEBHOOK_EVENTS,
  });
  webhookSecret = destination.endpoint_secret_key;
  // Nothing should be delivered before the app has the secret and billing is on.
  destination = await api("PATCH", `/notification-settings/${destination.id}`, { active: false });
}
console.log(`  webhook: ${destination.id} → ${WEBHOOK_URL} (active=${destination.active})`);
if (!webhookSecret) webhookSecret = destination.endpoint_secret_key;

if (OUT_FILE) {
  const lines = [
    "# Paddle LIVE values for Vercel Production. Git-ignored. Do not commit.",
    "# Add these to Vercel only after live billing is explicitly approved.",
    "NEXT_PUBLIC_PADDLE_ENVIRONMENT=production",
    `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=${clientToken}`,
    `PADDLE_API_KEY=${key}`,
    `PADDLE_CREATOR_PRICE_ID=${price.id}`,
    `PADDLE_WEBHOOK_SECRET=${webhookSecret ?? ""}`,
    `PADDLE_NOTIFICATION_SETTING_ID=${destination.id}`,
    "",
  ];
  writeFileSync(OUT_FILE, lines.join("\n"));
  console.log(`  saved to ${OUT_FILE} (secrets not printed)`);
}
console.log("Done. Billing is still off: nothing was added to Vercel.");
