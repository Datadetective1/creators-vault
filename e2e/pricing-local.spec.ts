import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

/**
 * The price on the site is the price Paddle charges in the visitor's country.
 *
 * Vercel sets `x-vercel-ip-country` in production and a client cannot spoof
 * it there, so this runs only against a local server, where the test supplies
 * the header itself. The expected figure is fetched from Paddle's pricing
 * preview with the same key and price the server uses — so whatever Paddle
 * would charge (USD today, or a local-currency override if one is added to the
 * catalog) is what the page must show.
 */

const envFile = resolve(process.cwd(), ".env.local");
if (existsSync(envFile)) process.loadEnvFile(envFile);

const LOCAL = !process.env.E2E_BASE_URL;
const configured = Boolean(process.env.PADDLE_API_KEY && process.env.PADDLE_CREATOR_PRICE_ID);
const api =
  process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === "production"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";

async function paddlePreview(country: string) {
  const response = await fetch(`${api}/pricing-preview`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.PADDLE_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      items: [{ price_id: process.env.PADDLE_CREATOR_PRICE_ID, quantity: 1 }],
      address: { country_code: country },
    }),
  });
  expect(response.ok).toBe(true);
  const body = await response.json();
  const line = body.data.details.line_items[0];
  return {
    currency: body.data.currency_code as string,
    total: line.formatted_totals.total as string,
    totalMinor: Number(line.totals.total),
    tax: line.formatted_totals.tax as string,
    taxCents: Number(line.totals.tax),
  };
}

test.describe("price shown matches Paddle for the visitor's country", () => {
  test.skip(!LOCAL || !configured, "Local server with Paddle configured only.");

  for (const country of ["IN", "BD", "US"]) {
    test(country, async ({ browser }) => {
      const expected = await paddlePreview(country);
      const context = await browser.newContext({ extraHTTPHeaders: { "x-vercel-ip-country": country } });
      const page = await context.newPage();
      await page.goto("/pricing");

      // Paddle's own amount, shown without a ".00" on whole numbers.
      const major = expected.totalMinor / 100;
      const label = new Intl.NumberFormat(expected.currency === "INR" ? "en-IN" : "en-US", {
        style: "currency",
        currency: expected.currency,
        minimumFractionDigits: Number.isInteger(major) ? 0 : 2,
      }).format(major);
      await expect(page.getByTestId("creator-price")).toHaveText(label);
      if (country === "IN") {
        // The India requirement: rupees from Paddle, never a USD figure.
        expect(expected.currency).toBe("INR");
        await expect(page.getByTestId("creator-price")).toHaveText("₹399");
        await expect(page.locator("main")).not.toContainText("$4");
      }
      if (expected.taxCents > 0) {
        await expect(page.getByTestId("creator-tax-note")).toContainText(expected.tax);
      }
      await context.close();
    });
  }

  test("no country: catalog price with the general tax note", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByTestId("creator-price")).toHaveText("$4");
  });
});
