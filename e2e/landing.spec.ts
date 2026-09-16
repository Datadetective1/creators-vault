import { expect, test } from "@playwright/test";

/**
 * Public-surface checks. These run without any Supabase or Paddle
 * configuration, so they are the suite that guards a preview deployment.
 */

test("landing page shows the full story", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Your content is your business.",
  );
  await expect(page.getByText("Protect the work behind your brand.").first()).toBeVisible();

  // Every section the pilot needs in order to explain itself.
  for (const heading of [
    "Most creators have exactly one copy of their best work.",
    "Three steps. No technical setup.",
    "Everything your content business runs on.",
    "Start free. Upgrade when you outgrow it.",
    "Questions creators ask first.",
  ]) {
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }

  // All three plans are presented.
  for (const plan of ["5 GB", "100 GB", "500 GB"]) {
    await expect(page.getByText(plan, { exact: true }).first()).toBeVisible();
  }
});

test("the page makes no claim to import from social platforms", async ({ page }) => {
  await page.goto("/");
  const body = (await page.textContent("body")) ?? "";

  // Positioning guardrail: the pilot must not imply automatic backup.
  expect(body).toContain("upload them yourself");
  expect(body.toLowerCase()).not.toContain("automatically back up your instagram");
});

test("primary calls to action reach sign-up", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Protect My Content" }).first().click();
  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByRole("heading", { name: "Create your vault" })).toBeVisible();
});

test("auth pages render and link to each other", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();

  await page.getByRole("link", { name: "Forgot your password?" }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
});

test("FAQ entries expand", async ({ page }) => {
  await page.goto("/#faq");
  const question = page.getByText("Can anyone else see my files?");
  await question.click();
  await expect(
    page.getByText("Your vault is private.", { exact: false }),
  ).toBeVisible();
});

test.describe("protected routes are closed while signed out", () => {
  for (const path of ["/dashboard", "/dashboard/vault", "/dashboard/upload", "/dashboard/billing"]) {
    test(`${path} redirects to login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
      await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    });
  }
});

test("vault API rejects anonymous callers", async ({ request }) => {
  const list = await request.get("/api/assets");
  expect(list.status()).toBe(401);

  const uploadUrl = await request.post("/api/assets/upload-url", {
    data: { filename: "a.jpg", mimeType: "image/jpeg", sizeBytes: 1024 },
  });
  expect(uploadUrl.status()).toBe(401);

  const remove = await request.delete("/api/assets/00000000-0000-0000-0000-000000000000");
  expect(remove.status()).toBe(401);
});

test("paddle webhook refuses unsigned requests", async ({ request }) => {
  const response = await request.post("/api/paddle/webhook", {
    data: { event_type: "subscription.created" },
  });
  // 400 with no signature header; never 200.
  expect(response.status()).toBe(400);
});

test("admin route is not discoverable without configuration", async ({ page }) => {
  const response = await page.goto("/admin");
  // Either a 404 (no ADMIN_EMAILS) or a redirect to login — never the stats.
  expect(page.url()).not.toContain("/admin/stats");
  if (response) expect([200, 404]).toContain(response.status());
  await expect(page.getByText("Pilot stats")).toHaveCount(0);
});

test("layout holds up on a phone viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);

  await expect(page.getByRole("link", { name: "Protect My Content" }).first()).toBeVisible();
});
