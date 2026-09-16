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
    "All of this can live in your vault.",
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

test("admin route is indistinguishable from one that does not exist", async ({ page }) => {
  // A redirect to /login would confirm the route exists. Both must 404.
  const admin = await page.goto("/admin");
  const nonexistent = await page.goto("/adminx");

  expect(admin?.status()).toBe(404);
  expect(nonexistent?.status()).toBe(404);
  await expect(page.getByText("Pilot stats")).toHaveCount(0);
});

test.describe("?next= cannot redirect off-site after login", () => {
  // A backslash resolves like a slash in a relative Location, so a naive
  // startsWith("/") guard would let these through and send a freshly
  // authenticated user to an attacker's copy of the login page.
  const ATTACKS = ["/%5Cevil.com", "//evil.com", "https://evil.com", "/%5C/evil.com"];

  for (const attack of ATTACKS) {
    test(`rejects ${attack}`, async ({ page }) => {
      await page.goto(`/login?next=${attack}`);
      const value = await page.locator('input[name="next"]').inputValue();
      expect(value).toBe("/dashboard");
    });
  }

  test("keeps a legitimate internal path, query string included", async ({ page }) => {
    await page.goto("/login?next=/dashboard/vault%3Ftab%3Drecent");
    await expect(page.locator('input[name="next"]')).toHaveValue("/dashboard/vault?tab=recent");
  });
});

test.describe("the redesign's media and motion", () => {
  test("hero ships a muted, looping, inline background video with a poster", async ({ page }) => {
    await page.goto("/");
    const video = page.locator("video").first();

    await expect(video).toHaveAttribute("poster", /hero-creator-poster\.webp$/);
    await expect(video).toHaveJSProperty("muted", true);
    await expect(video).toHaveJSProperty("loop", true);
    await expect(video).toHaveJSProperty("playsInline", true);
    // Real footage ships as VP9 with an H.264 fallback, so Safari gets a
    // playable source too instead of a frozen poster.
    await expect(video.locator('source[type="video/webm"]')).toHaveAttribute("src", /hero-creator\.webm$/);
    await expect(video.locator('source[type="video/mp4"]')).toHaveAttribute("src", /hero-creator\.mp4$/);
    // `muted` is what guarantees silence — a muted element keeps volume at 1.
    // Also assert the page ships no audio element at all.
    expect(await page.locator("audio").count()).toBe(0);
  });

  test("content tiles render as real images, lazily below the fold", async ({ page }) => {
    await page.goto("/");

    const tiles = page.locator("figure.media-tile img");
    expect(await tiles.count()).toBeGreaterThan(8);

    // Hero tiles are eager; the content wall must not be.
    const lazy = page.locator('figure.media-tile img[loading="lazy"]');
    expect(await lazy.count()).toBeGreaterThan(5);
  });

  test("every section becomes visible when scrolled", async ({ page }) => {
    // The reveal animation starts at opacity 0. Playwright's visibility check
    // ignores opacity, so this asserts it explicitly — a stuck observer would
    // otherwise ship a page that looks blank to a real visitor.
    await page.goto("/");
    // The page uses scroll-behavior: smooth, which makes programmatic scrolling
    // animate and never settle inside one task. Disable it for the sweep.
    await page.addStyleTag({ content: "html{scroll-behavior:auto !important}" });

    // Re-read the height each step: lazy images keep growing the page, so a
    // fixed-length loop stops before the footer.
    for (let y = 0, i = 0; i < 400; i += 1, y += 320) {
      const height = await page.evaluate(() => document.body.scrollHeight);
      if (y > height) break;
      await page.evaluate((v) => window.scrollTo(0, v), y);
      await page.waitForTimeout(70);
    }
    await page.waitForTimeout(1500);

    const stuck = await page.evaluate(() =>
      [...document.querySelectorAll(".reveal")]
        .filter((el) => (el as HTMLElement).checkVisibility())
        .filter((el) => parseFloat(getComputedStyle(el).opacity) < 0.99).length,
    );
    expect(stuck).toBe(0);
  });

  test("reduced motion shows everything immediately, with no scrolling", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    try {
      await page.goto("/");
      await page.waitForTimeout(600);

      const stuck = await page.evaluate(() =>
        [...document.querySelectorAll(".reveal")]
          .filter((el) => (el as HTMLElement).checkVisibility())
          .filter((el) => parseFloat(getComputedStyle(el).opacity) < 0.99).length,
      );
      expect(stuck).toBe(0);

      // The hero footage is a person moving; under reduced motion it must hold
      // on its first frame rather than loop.
      const video = page.locator("video").first();
      await expect(video).toHaveJSProperty("paused", true);
      await expect(video).toHaveJSProperty("autoplay", false);
    } finally {
      await context.close();
    }
  });

  test("content stays readable even if the reveal styles never un-hide", async ({ page }) => {
    // Simulates the bundle failing to run: without data-js the hidden state
    // must not apply at all.
    await page.goto("/");
    // Kill transitions first, so removing the attribute takes effect instantly
    // instead of leaving elements mid-fade when the assertion runs.
    await page.addStyleTag({ content: "*{transition:none !important}" });
    await page.waitForTimeout(200);
    await page.evaluate(() => document.documentElement.removeAttribute("data-js"));
    await page.waitForTimeout(200);

    const stuck = await page.evaluate(() =>
      [...document.querySelectorAll(".reveal")]
        .filter((el) => (el as HTMLElement).checkVisibility())
        .filter((el) => parseFloat(getComputedStyle(el).opacity) < 0.99).length,
    );
    expect(stuck).toBe(0);
  });
});

test("phone viewport shows media above the fold, not just text", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForTimeout(400);

  // At least one content tile must intersect the first screen.
  const aboveFold = await page.evaluate(() =>
    [...document.querySelectorAll("figure.media-tile")].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0;
    }).length,
  );
  expect(aboveFold).toBeGreaterThan(0);
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
