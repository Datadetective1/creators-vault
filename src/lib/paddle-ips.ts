import "server-only";

import { publicEnv } from "@/lib/env";

/**
 * Paddle webhook source-IP allowlist.
 *
 * Paddle publishes the addresses its webhooks come from at GET /ips
 * (`data.ipv4_cidrs`, as /32 CIDRs). That endpoint is the source of truth and
 * can change, so the list is fetched at runtime and cached — never hard-coded.
 * This sits in front of signature verification as defence in depth; the HMAC
 * check still decides whether an event is genuine.
 */

const CACHE_MS = 60 * 60 * 1000; // re-read Paddle's list hourly

let cache: { cidrs: string[]; fetchedAt: number } | null = null;

function ipsEndpoint(): string {
  return publicEnv.paddleEnvironment === "production"
    ? "https://api.paddle.com/ips"
    : "https://sandbox-api.paddle.com/ips";
}

/**
 * Enforced when deployed on Vercel, where the client address header is set by
 * the platform and cannot be supplied by the caller. Locally it is off unless
 * PADDLE_WEBHOOK_ENFORCE_IPS=1; PADDLE_WEBHOOK_ENFORCE_IPS=0 turns it off.
 */
export function shouldEnforcePaddleIps(): boolean {
  const flag = process.env.PADDLE_WEBHOOK_ENFORCE_IPS;
  if (flag === "0") return false;
  if (flag === "1") return true;
  return process.env.VERCEL === "1";
}

/** Paddle's current webhook CIDRs; the last good list if a refresh fails. */
export async function paddleWebhookCidrs(): Promise<string[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_MS) return cache.cidrs;
  try {
    const response = await fetch(ipsEndpoint(), { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = (await response.json()) as { data?: { ipv4_cidrs?: unknown } };
    const cidrs = Array.isArray(body.data?.ipv4_cidrs)
      ? body.data.ipv4_cidrs.filter((c): c is string => typeof c === "string")
      : [];
    if (cidrs.length === 0) throw new Error("empty list");
    cache = { cidrs, fetchedAt: Date.now() };
    return cidrs;
  } catch (error) {
    if (cache) return cache.cidrs;
    throw new Error(`Could not load Paddle webhook IPs: ${(error as Error).message}`);
  }
}

/** The caller's address as Vercel reports it (first x-forwarded-for entry). */
export function requestIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip")?.trim() || null;
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    value = value * 256 + n;
  }
  return value;
}

/** True when `ip` (IPv4, or IPv4-mapped IPv6) falls inside any of `cidrs`. */
export function ipInCidrs(ip: string, cidrs: string[]): boolean {
  const address = ipv4ToInt(ip.replace(/^::ffff:/i, ""));
  if (address === null) return false;
  return cidrs.some((cidr) => {
    const [base, bitsText = "32"] = cidr.split("/");
    const network = ipv4ToInt(base ?? "");
    const bits = Number(bitsText);
    if (network === null || !Number.isInteger(bits) || bits < 0 || bits > 32) return false;
    const size = 2 ** (32 - bits);
    return Math.floor(address / size) === Math.floor(network / size);
  });
}
