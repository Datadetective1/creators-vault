import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

import { expect, test, type Page } from "@playwright/test";

import {
  canProvisionUsers,
  createTestUser,
  deleteTestUser,
  deleteUsersByEmail,
  leftoversFor,
  type TestUser,
} from "./support/supabase-admin";

/**
 * The creator journey against a live Supabase project, with production
 * settings: "Confirm email" stays ON.
 *
 * Skipped unless E2E_SUPABASE_READY=1:
 *
 *   E2E_SUPABASE_READY=1 npm run test:e2e
 *
 * The journey tests need SUPABASE_SERVICE_ROLE_KEY (from the environment or
 * .env.local). With confirmation on, a sign-up cannot reach the dashboard
 * without a mailbox, so each test provisions its own confirmed throwaway
 * accounts through the admin API, then logs in, uploads, lists, downloads and
 * deletes through the real UI — and removes every account, row and stored
 * object afterwards. The public sign-up form is covered separately below.
 */

const READY = process.env.E2E_SUPABASE_READY === "1";

const NEUTRAL_SIGNUP_NOTICE =
  "Check your email for a confirmation link to finish setting up your vault.";

async function logInThroughUi(page: Page, user: TestUser) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
}

async function uploadThroughUi(page: Page, filename: string, contents: string) {
  await page.goto("/dashboard/upload");
  await page.setInputFiles('input[type="file"]', {
    name: filename,
    mimeType: "text/plain",
    buffer: Buffer.from(contents),
  });
  await page.getByRole("button", { name: /Upload 1 file/ }).click();
  await expect(page.getByText("Done")).toBeVisible({ timeout: 60_000 });
}

async function removeAndProveGone(users: Array<TestUser | undefined>) {
  for (const user of users) {
    if (!user) continue;
    await deleteTestUser(user);
    expect(await leftoversFor(user.id)).toEqual({ assets: 0, objects: 0, userExists: false });
  }
}

test.describe("creator journey", () => {
  test.skip(!READY, "Set E2E_SUPABASE_READY=1 with a live Supabase project to run this.");

  // Uploads are slow; give the whole journey room.
  test.setTimeout(120_000);

  test("sign-up form answers neutrally and grants no session", async ({ page }) => {
    // A fresh address, and one that is already registered, must get the same
    // answer: anything else tells an outsider which emails have accounts.
    // A real confirmation email is sent for this address, so it must be one
    // that accepts mail: Resend's test inbox takes it and discards it. An
    // undeliverable address would bounce and cost the sending domain reputation.
    const freshEmail = `delivered+cl-signup-${randomUUID().slice(0, 12)}@resend.dev`;
    let existing: TestUser | undefined;

    try {
      for (const email of [freshEmail, "existing"]) {
        let address = email;
        if (email === "existing") {
          test.skip(!canProvisionUsers, "Needs SUPABASE_SERVICE_ROLE_KEY for the registered-address case.");
          existing = await createTestUser("registered");
          address = existing.email;
        }

        await page.goto("/signup");
        await page.getByLabel("Email").fill(address);
        await page.getByLabel("Password", { exact: true }).fill(`Pw-${randomUUID()}`);
        await page.getByRole("button", { name: "Create my vault" }).click();

        await expect(page.getByText(NEUTRAL_SIGNUP_NOTICE)).toBeVisible({ timeout: 30_000 });
        await expect(page).toHaveURL(/\/signup$/);

        // Confirmation is on, so no session was issued.
        await page.goto("/dashboard");
        await expect(page).toHaveURL(/\/login/);
      }
    } finally {
      if (canProvisionUsers) {
        await deleteUsersByEmail(freshEmail);
        await removeAndProveGone([existing]);
      }
    }
  });

  test.describe("with provisioned accounts", () => {
    test.skip(!canProvisionUsers, "Needs SUPABASE_SERVICE_ROLE_KEY to provision confirmed test accounts.");

    test("log in, upload, download, delete, log out", async ({ page }) => {
      let creator: TestUser | undefined;
      try {
        creator = await createTestUser("creator");

        // --- log in and reach the dashboard -----------------------------------
        await logInThroughUi(page, creator);
        await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();

        // A brand-new account starts on Free with nothing stored.
        await expect(page.getByText("Free", { exact: true }).first()).toBeVisible();

        // --- upload -------------------------------------------------------------
        await page.goto("/dashboard");
        await page.getByRole("link", { name: "Upload", exact: true }).click();
        await expect(page).toHaveURL(/\/dashboard\/upload/);

        const filename = `vault-e2e-${Date.now()}.txt`;
        const contents = `Creator Lock end-to-end test asset ${randomUUID()}.`;
        await uploadThroughUi(page, filename, contents);

        // --- it appears in My Vault -------------------------------------------
        await page.getByRole("link", { name: "My Vault" }).click();
        await expect(page.getByRole("cell", { name: filename })).toBeVisible();

        // --- download returns the original bytes ------------------------------
        const row = page.getByRole("row", { name: new RegExp(filename.replace(/\./g, "\\.")) });
        const downloadPromise = page.waitForEvent("download");
        await row.getByRole("link", { name: "Download" }).click();
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain(filename.slice(0, 20));
        const downloadedPath = await download.path();
        expect(await readFile(downloadedPath, "utf8")).toBe(contents);

        // --- delete -------------------------------------------------------------
        page.once("dialog", (dialog) => dialog.accept());
        await row.getByRole("button", { name: "Delete" }).click();
        await expect(page.getByRole("cell", { name: filename })).toHaveCount(0, { timeout: 20_000 });

        // The row and the stored object are both gone, not just hidden.
        expect(await leftoversFor(creator.id)).toMatchObject({ assets: 0, objects: 0 });

        // --- log out ------------------------------------------------------------
        await page.getByRole("button", { name: "Log out" }).click();
        await page.waitForURL("/", { timeout: 20_000 });

        // --- protected pages are closed again ---------------------------------
        await page.goto("/dashboard/vault");
        await expect(page).toHaveURL(/\/login/);
      } finally {
        await removeAndProveGone([creator]);
      }
    });

    test("a second creator cannot see the first creator's files", async ({ browser }) => {
      // Two isolated sessions, so each gets its own cookie jar.
      const ownerContext = await browser.newContext();
      const intruderContext = await browser.newContext();
      let owner: TestUser | undefined;
      let intruder: TestUser | undefined;

      try {
        [owner, intruder] = await Promise.all([createTestUser("owner"), createTestUser("intruder")]);

        const ownerPage = await ownerContext.newPage();
        await logInThroughUi(ownerPage, owner);
        await uploadThroughUi(ownerPage, `owner-only-${Date.now()}.txt`, "private");

        // Find the owner's asset id from their own API.
        const ownerAssets = await ownerPage.request.get("/api/assets");
        const { assets } = (await ownerAssets.json()) as { assets: Array<{ id: string }> };
        const assetId = assets[0]?.id;
        expect(assetId).toBeTruthy();

        // A different signed-in creator must not be able to reach it.
        const intruderPage = await intruderContext.newPage();
        await logInThroughUi(intruderPage, intruder);

        const stolenDownload = await intruderPage.request.get(`/api/assets/${assetId}/download`, {
          maxRedirects: 0,
        });
        expect(stolenDownload.status()).toBe(404);

        const stolenDelete = await intruderPage.request.delete(`/api/assets/${assetId}`);
        expect(stolenDelete.status()).toBe(404);

        // And their own vault is empty.
        const intruderAssets = await intruderPage.request.get("/api/assets");
        const intruderBody = (await intruderAssets.json()) as { assets: unknown[] };
        expect(intruderBody.assets).toHaveLength(0);

        // The owner's file survived the attempts.
        const stillThere = await ownerPage.request.get("/api/assets");
        const ownerBody = (await stillThere.json()) as { assets: Array<{ id: string }> };
        expect(ownerBody.assets.map((asset) => asset.id)).toContain(assetId);
      } finally {
        await ownerContext.close();
        await intruderContext.close();
        await removeAndProveGone([owner, intruder]);
      }
    });
  });
});
