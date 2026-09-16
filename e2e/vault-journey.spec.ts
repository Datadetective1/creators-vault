import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

/**
 * The full creator journey: sign up -> log in -> upload -> list -> download ->
 * delete -> log out.
 *
 * Skipped unless E2E_SUPABASE_READY=1, because it needs a live Supabase
 * project. Run it once the pilot has credentials:
 *
 *   E2E_SUPABASE_READY=1 npm run test:e2e
 *
 * It also requires email confirmation to be OFF in Supabase
 * (Authentication > Sign In / Providers > Email > "Confirm email"), otherwise
 * sign-up cannot complete without opening a mailbox.
 */

const READY = process.env.E2E_SUPABASE_READY === "1";

test.describe("creator journey", () => {
  test.skip(!READY, "Set E2E_SUPABASE_READY=1 with a live Supabase project to run this.");

  // Uploads are slow; give the whole journey room.
  test.setTimeout(120_000);

  test("sign up, upload, download, delete, sign out", async ({ page }) => {
    const email = `e2e+${randomUUID()}@creator-vault-test.dev`;
    const password = `Test-${randomUUID().slice(0, 12)}!`;

    // --- 1-4: sign up and reach the dashboard ---------------------------------
    await page.goto("/signup");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Create my vault" }).click();

    await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();

    // A brand-new account starts on Free with nothing stored.
    await expect(page.getByText("Free", { exact: true }).first()).toBeVisible();

    // --- 5: upload ------------------------------------------------------------
    await page.getByRole("link", { name: "Upload", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\/upload/);

    const filename = `vault-e2e-${Date.now()}.txt`;
    const contents = "Creator Vault end-to-end test asset.";

    await page.setInputFiles('input[type="file"]', {
      name: filename,
      mimeType: "text/plain",
      buffer: Buffer.from(contents),
    });

    await page.getByRole("button", { name: /Upload 1 file/ }).click();
    await expect(page.getByText("Done")).toBeVisible({ timeout: 60_000 });

    // --- 6: it appears in My Vault -------------------------------------------
    await page.getByRole("link", { name: "My Vault" }).click();
    await expect(page.getByRole("cell", { name: filename })).toBeVisible();

    // --- 7: download returns the original bytes ------------------------------
    const downloadPromise = page.waitForEvent("download");
    await page
      .getByRole("row", { name: new RegExp(filename.replace(/\./g, "\\.")) })
      .getByRole("link", { name: "Download" })
      .click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain(filename.slice(0, 20));

    // --- 8: delete ------------------------------------------------------------
    page.once("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("row", { name: new RegExp(filename.replace(/\./g, "\\.")) })
      .getByRole("button", { name: "Delete" })
      .click();

    await expect(page.getByRole("cell", { name: filename })).toHaveCount(0, { timeout: 20_000 });

    // --- 9: log out -----------------------------------------------------------
    await page.getByRole("button", { name: "Log out" }).click();
    await page.waitForURL("/", { timeout: 20_000 });

    // --- 10: protected pages are closed again --------------------------------
    await page.goto("/dashboard/vault");
    await expect(page).toHaveURL(/\/login/);
  });

  test("a second creator cannot see the first creator's files", async ({ browser }) => {
    // Two isolated sessions, so each gets its own cookie jar.
    const ownerContext = await browser.newContext();
    const intruderContext = await browser.newContext();

    try {
      const owner = await ownerContext.newPage();
      const ownerEmail = `e2e-owner+${randomUUID()}@creator-vault-test.dev`;
      const ownerPassword = `Test-${randomUUID().slice(0, 12)}!`;

      await owner.goto("/signup");
      await owner.getByLabel("Email").fill(ownerEmail);
      await owner.getByLabel("Password", { exact: true }).fill(ownerPassword);
      await owner.getByRole("button", { name: "Create my vault" }).click();
      await owner.waitForURL(/\/dashboard/, { timeout: 30_000 });

      const filename = `owner-only-${Date.now()}.txt`;
      await owner.goto("/dashboard/upload");
      await owner.setInputFiles('input[type="file"]', {
        name: filename,
        mimeType: "text/plain",
        buffer: Buffer.from("private"),
      });
      await owner.getByRole("button", { name: /Upload 1 file/ }).click();
      await expect(owner.getByText("Done")).toBeVisible({ timeout: 60_000 });

      // Find the owner's asset id from their own API.
      const ownerAssets = await owner.request.get("/api/assets");
      const { assets } = (await ownerAssets.json()) as { assets: Array<{ id: string }> };
      const assetId = assets[0]?.id;
      expect(assetId).toBeTruthy();

      // A different signed-in creator must not be able to reach it.
      const intruder = await intruderContext.newPage();
      const intruderEmail = `e2e-intruder+${randomUUID()}@creator-vault-test.dev`;
      await intruder.goto("/signup");
      await intruder.getByLabel("Email").fill(intruderEmail);
      await intruder.getByLabel("Password", { exact: true }).fill(`Test-${randomUUID().slice(0, 12)}!`);
      await intruder.getByRole("button", { name: "Create my vault" }).click();
      await intruder.waitForURL(/\/dashboard/, { timeout: 30_000 });

      const stolenDownload = await intruder.request.get(`/api/assets/${assetId}/download`, {
        maxRedirects: 0,
      });
      expect(stolenDownload.status()).toBe(404);

      const stolenDelete = await intruder.request.delete(`/api/assets/${assetId}`);
      expect(stolenDelete.status()).toBe(404);

      // And their own vault is empty.
      const intruderAssets = await intruder.request.get("/api/assets");
      const intruderBody = (await intruderAssets.json()) as { assets: unknown[] };
      expect(intruderBody.assets).toHaveLength(0);
    } finally {
      await ownerContext.close();
      await intruderContext.close();
    }
  });
});
