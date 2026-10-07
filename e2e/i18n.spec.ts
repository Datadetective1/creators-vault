import { expect, test } from "@playwright/test";

import { en } from "../src/lib/i18n/messages/en";
import { hi } from "../src/lib/i18n/messages/hi";
import { bn } from "../src/lib/i18n/messages/bn";

/**
 * Language support: English, Hindi and Bangla on the public pages, the choice
 * persisting, and no customer-facing "vault" wording in any of them.
 */

const DICTS = { en, hi, bn } as const;
const PUBLIC_PAGES = ["/", "/pricing", "/login", "/signup", "/forgot-password", "/terms", "/privacy", "/refunds"];

test("the language picker switches the page and the choice persists", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  await page.getByTestId("language-select").first().selectOption("hi");
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  await expect(page.getByRole("link", { name: hi.common.nav.signupCta }).first()).toBeVisible();

  // Survives a reload and navigation to other pages.
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  const cookies = await page.context().cookies();
  expect(cookies.find((cookie) => cookie.name === "cl_locale")?.value).toBe("hi");

  await page.getByTestId("language-select").first().selectOption("bn");
  await expect(page.locator("html")).toHaveAttribute("lang", "bn");
  await page.goto("/pricing");
  await expect(page.locator("html")).toHaveAttribute("lang", "bn");
  await expect(page.getByRole("heading", { level: 1, name: bn.pricing.heading.replace("{price}", "₹399") })).toBeVisible();

  await page.getByTestId("language-select").first().selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("a browser asking for Hindi gets Hindi until it chooses otherwise", async ({ browser }) => {
  const context = await browser.newContext({ locale: "hi-IN" });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  await context.close();
});

for (const locale of ["en", "hi", "bn"] as const) {
  test(`${locale}: public pages render translated chrome and never say "vault"`, async ({ page, baseURL }) => {
    const t = DICTS[locale];
    await page.context().addCookies([{ name: "cl_locale", value: locale, url: baseURL! }]);
    for (const path of PUBLIC_PAGES) {
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      const text = await page.locator("body").innerText();
      expect(text, `${path} in ${locale}`).not.toMatch(/vault/i);
      const title = await page.title();
      expect(title, `${path} title in ${locale}`).not.toMatch(/vault/i);
      const alts = await page.locator("img[alt]").evaluateAll((imgs) => imgs.map((img) => img.getAttribute("alt") ?? ""));
      expect(alts.join(" "), `${path} alt text in ${locale}`).not.toMatch(/vault/i);
      // One plan, own brand: no free tier, no old price, no operator name in the UI.
      expect(text, `${path} legacy plan copy in ${locale}`).not.toMatch(/Start free|20 GB|\$4\b/);
      if (!["/terms", "/privacy", "/refunds"].includes(path)) {
        expect(text, `${path} operator name in ${locale}`).not.toMatch(/MERIDIAN VERTEX/i);
      }
    }

    await page.goto("/");
    await expect(page.getByRole("link", { name: t.common.nav.pricing }).first()).toBeVisible();

    // Legal documents stay in English; other languages say so up front.
    await page.goto("/terms");
    if (locale === "en") {
      await expect(page.getByText(en.common.legalEnglishOnly)).toHaveCount(0);
    } else {
      await expect(page.getByText(t.common.legalEnglishOnly)).toBeVisible();
    }
  });
}

test("the old library URL redirects to the new one", async ({ request }) => {
  const response = await request.get("/dashboard/vault", { maxRedirects: 0 });
  expect([301, 308]).toContain(response.status());
  expect(response.headers().location).toMatch(/\/dashboard\/files$/);
});
