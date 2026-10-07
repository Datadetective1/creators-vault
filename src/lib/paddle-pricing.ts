import "server-only";

import { headers } from "next/headers";

import { isPaddleConfigured, publicEnv } from "@/lib/env";

/**
 * The Creator price as Paddle will actually charge it in the visitor's
 * country, from Paddle's own pricing preview — never a conversion we compute.
 *
 * If the Paddle catalog gains a local-currency price for a country (a
 * `unit_price_overrides` entry, e.g. INR for India), this picks it up with no
 * code change, because the preview applies the same rules as checkout.
 *
 * Country comes from Vercel's `x-vercel-ip-country` header. With no country,
 * no billing configuration, or any Paddle error, this returns null and the
 * page shows the catalog price (US$4) with the general tax note, which
 * stays true everywhere.
 */
export interface LocalPrice {
  country: string;
  currency: string;
  /** Paddle's total in its currency, formatted for display, e.g. "$4" or "₹399". */
  total: string;
  /** Paddle-formatted tax included in the total, or null when tax is added at checkout. */
  taxIncluded: string | null;
}

const TTL_MS = 60 * 60 * 1000;
/** A failed lookup is retried soon, so one Paddle blip does not pin the fallback for an hour. */
const FAILURE_TTL_MS = 60 * 1000;
/** Pages never wait longer than this for Paddle; past it they show the fallback price. */
const PREVIEW_TIMEOUT_MS = 2000;
const cache = new Map<string, { at: number; value: LocalPrice | null }>();

export async function visitorCountry(): Promise<string | null> {
  const country = (await headers()).get("x-vercel-ip-country");
  return country && /^[A-Z]{2}$/.test(country) ? country : null;
}

export async function getLocalCreatorPrice(country: string | null): Promise<LocalPrice | null> {
  if (!country || !isPaddleConfigured()) return null;

  const hit = cache.get(country);
  if (hit && Date.now() - hit.at < (hit.value ? TTL_MS : FAILURE_TTL_MS)) return hit.value;

  const value = await fetchPreview(country);
  cache.set(country, { at: Date.now(), value });
  return value;
}

async function fetchPreview(country: string): Promise<LocalPrice | null> {
  const base =
    publicEnv.paddleEnvironment === "production"
      ? "https://api.paddle.com"
      : "https://sandbox-api.paddle.com";

  try {
    const response = await fetch(`${base}/pricing-preview`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.PADDLE_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        items: [{ price_id: process.env.PADDLE_CREATOR_PRICE_ID, quantity: 1 }],
        address: { country_code: country },
      }),
      signal: AbortSignal.timeout(PREVIEW_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) return null;

    const body = (await response.json()) as {
      data?: {
        currency_code?: string;
        details?: {
          line_items?: Array<{
            totals?: { tax?: string; total?: string };
            formatted_totals?: { total?: string; tax?: string };
          }>;
        };
      };
    };
    const line = body.data?.details?.line_items?.[0];
    if (!line?.formatted_totals?.total || !body.data?.currency_code) return null;

    const taxCents = Number(line.totals?.tax ?? "0");
    return {
      country,
      currency: body.data.currency_code,
      total: displayAmount(line.totals?.total, body.data.currency_code) ?? line.formatted_totals.total,
      taxIncluded: taxCents > 0 ? (line.formatted_totals.tax ?? null) : null,
    };
  } catch {
    return null;
  }
}

/**
 * Paddle's amount (in minor units) as a short label: "₹399" rather than
 * "₹399.00", while "$4.35" stays as is. The number is Paddle's; only the
 * presentation is ours.
 */
function displayAmount(minor: string | undefined, currency: string): string | null {
  const value = Number(minor);
  if (!minor || !Number.isFinite(value)) return null;
  const major = value / 100;
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: Number.isInteger(major) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(major);
  } catch {
    return null;
  }
}
