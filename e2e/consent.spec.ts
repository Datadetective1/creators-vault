import { expect, test, type Page } from "@playwright/test";

import { TERMS_VERSION, PRIVACY_VERSION, UPLOAD_RIGHTS_VERSION } from "../src/lib/legal";
import { en } from "../src/lib/i18n/messages/en";
import { hi } from "../src/lib/i18n/messages/hi";
import { bn } from "../src/lib/i18n/messages/bn";
import {
  canProvisionUsers,
  consentRowsFor,
  createTestUser,
  deleteTestUser,
  grantConsent,
  grantSubscription,
  userClient,
  type TestUser,
} from "./support/supabase-admin";

/**
 * The Terms / Privacy / upload-rights gate before a first upload.
 *
 * Runs against a live Supabase project with migration 0011 applied, like the
 * creator journey: E2E_SUPABASE_READY=1 plus SUPABASE_SERVICE_ROLE_KEY. Every
 * account is a throwaway created and removed here.
 */

const READY = process.env.E2E_SUPABASE_READY === "1";
const DICTS = { en, hi, bn } as const;

async function logIn(page: Page, user: TestUser) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(user.email);
  await page.locator('input[name="password"]').fill(user.password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
}

async function useLocale(page: Page, locale: keyof typeof DICTS) {
  const base = new URL(page.url());
  await page.context().addCookies([
    { name: "cl_locale", value: locale, domain: base.hostname, path: "/" },
  ]);
}

test.describe("upload consent gate", () => {
  test.skip(!READY || !canProvisionUsers, "Needs E2E_SUPABASE_READY=1 and SUPABASE_SERVICE_ROLE_KEY.");
  test.setTimeout(120_000);

  for (const locale of ["en", "hi", "bn"] as const) {
    test(`${locale}: a new user cannot upload until both statements are accepted`, async ({ page }) => {
      const t = DICTS[locale];
      let user: TestUser | undefined;
      try {
        user = await createTestUser(`consent-${locale}`);
        await grantSubscription(user.id);
        await logIn(page, user);
        await useLocale(page, locale);
        await page.goto("/dashboard/upload");

        await expect(page.locator("html")).toHaveAttribute("lang", locale);
        const gate = page.getByTestId("consent-gate");
        await expect(gate).toBeVisible();
        await expect(gate.getByRole("heading", { name: t.consent.heading })).toBeVisible();

        // Nothing to upload with: no file input, no drop zone.
        await expect(page.locator('input[type="file"]')).toHaveCount(0);

        // Both boxes start unchecked; one alone is not enough.
        const terms = page.getByTestId("consent-terms");
        const rights = page.getByTestId("consent-rights");
        const accept = page.getByTestId("consent-accept");
        await expect(terms).not.toBeChecked();
        await expect(rights).not.toBeChecked();
        await expect(accept).toBeDisabled();
        await terms.check();
        await expect(accept).toBeDisabled();
        await terms.uncheck();
        await rights.check();
        await expect(accept).toBeDisabled();

        // The policy links are real links to the documents.
        await expect(gate.getByRole("link", { name: new RegExp(t.common.legalLinks.terms) })).toHaveAttribute("href", "/terms");
        await expect(gate.getByRole("link", { name: new RegExp(t.common.legalLinks.privacy) })).toHaveAttribute("href", "/privacy");

        // Cancel leaves uploading locked and records nothing.
        await page.getByTestId("consent-cancel").click();
        await expect(page.getByTestId("consent-locked")).toBeVisible();
        await expect(page.locator('input[type="file"]')).toHaveCount(0);
        expect(await consentRowsFor(user.id)).toHaveLength(0);
        const blocked = await page.request.post("/api/assets/upload-url", {
          data: { filename: "a.txt", mimeType: "text/plain", sizeBytes: 5 },
        });
        expect(blocked.status()).toBe(403);
        expect((await blocked.json()).code).toBe("consent_required");

        // Reopen: boxes are unchecked again; accept both.
        await page.getByRole("button", { name: t.consent.reopen }).click();
        await expect(terms).not.toBeChecked();
        await expect(rights).not.toBeChecked();
        await terms.check();
        await rights.check();
        await accept.click();

        // Unlocked: the uploader is here, and the server agrees.
        await expect(page.locator('input[type="file"]')).toHaveCount(1, { timeout: 20_000 });
        const rows = await consentRowsFor(user.id);
        expect(rows.map((row) => `${row.consent_type}@${row.version}`).sort()).toEqual([
          `privacy@${PRIVACY_VERSION}`,
          `terms@${TERMS_VERSION}`,
          `upload_rights@${UPLOAD_RIGHTS_VERSION}`,
        ]);
        const allowed = await page.request.post("/api/assets/upload-url", {
          data: { filename: "a.txt", mimeType: "text/plain", sizeBytes: 5 },
        });
        expect(allowed.status()).toBe(200);

        // And it stays accepted: a reload does not ask again.
        await page.reload();
        await expect(page.getByTestId("consent-gate")).toHaveCount(0);
        await expect(page.locator('input[type="file"]')).toHaveCount(1);
      } finally {
        await deleteTestUser(user);
      }
    });
  }

  test("server refuses every upload path without acceptance", async ({ page }) => {
    let user: TestUser | undefined;
    try {
      user = await createTestUser("consent-bypass");
      await grantSubscription(user.id);
      await logIn(page, user);

      // App API: no upload target is minted, and finalize is refused.
      const target = await page.request.post("/api/assets/upload-url", {
        data: { filename: "x.txt", mimeType: "text/plain", sizeBytes: 5 },
      });
      expect(target.status()).toBe(403);
      expect((await target.json()).code).toBe("consent_required");

      const finalize = await page.request.post("/api/assets", {
        data: { storageKey: `${user.id}/x.txt`, filename: "x.txt", mimeType: "text/plain" },
      });
      expect(finalize.status()).toBe(403);

      // Accepting needs both statements to be true.
      const halfAccept = await page.request.post("/api/consent", {
        data: {
          termsVersion: TERMS_VERSION,
          privacyVersion: PRIVACY_VERSION,
          uploadRightsVersion: UPLOAD_RIGHTS_VERSION,
          agreeTerms: true,
          confirmRights: false,
        },
      });
      expect(halfAccept.status()).toBe(400);

      // A stale version is refused.
      const stale = await page.request.post("/api/consent", {
        data: {
          termsVersion: "2000-01-01",
          privacyVersion: PRIVACY_VERSION,
          uploadRightsVersion: UPLOAD_RIGHTS_VERSION,
          agreeTerms: true,
          confirmRights: true,
        },
      });
      expect(stale.status()).toBe(409);
      expect(await consentRowsFor(user.id)).toHaveLength(0);

      // Direct to Storage with the anon key and the user's own session — the
      // route a script would take to skip the app entirely.
      const client = await userClient(user);
      const direct = await client.storage
        .from("vault")
        .upload(`${user.id}/direct.txt`, new Blob(["hello"], { type: "text/plain" }));
      expect(direct.error).not.toBeNull();

      // A signed upload URL, as the app itself would mint it, still cannot land bytes.
      const signed = await client.storage.from("vault").createSignedUploadUrl(`${user.id}/signed.txt`);
      if (!signed.error && signed.data) {
        const put = await client.storage
          .from("vault")
          .uploadToSignedUrl(`${user.id}/signed.txt`, signed.data.token, new Blob(["hello"], { type: "text/plain" }));
        expect(put.error).not.toBeNull();
      }

      // A direct asset row is refused too.
      const row = await client.from("assets").insert({
        user_id: user.id,
        filename: "x.txt",
        storage_key: `${user.id}/x.txt`,
        mime_type: "text/plain",
        file_size_bytes: 5,
      });
      expect(row.error).not.toBeNull();

      // A user cannot forge an acceptance row directly.
      const forged = await client.from("legal_acceptances").insert({
        user_id: user.id,
        consent_type: "terms",
        version: TERMS_VERSION,
      });
      expect(forged.error).not.toBeNull();

      const listed = await client.storage.from("vault").list(user.id);
      expect(listed.data ?? []).toHaveLength(0);
    } finally {
      await deleteTestUser(user);
    }
  });

  test("a user who accepted the current version is not asked again", async ({ page }) => {
    let user: TestUser | undefined;
    try {
      user = await createTestUser("consent-current");
      await grantSubscription(user.id);
      await grantConsent(user.id);
      await logIn(page, user);
      await page.goto("/dashboard/upload");
      await expect(page.locator('input[type="file"]')).toHaveCount(1);
      await expect(page.getByTestId("consent-gate")).toHaveCount(0);
    } finally {
      await deleteTestUser(user);
    }
  });

  test("a user who accepted an older version must accept the new one", async ({ page }) => {
    let user: TestUser | undefined;
    try {
      user = await createTestUser("consent-old");
      await grantSubscription(user.id);
      await grantConsent(user.id, "2000-01-01");
      await logIn(page, user);
      await page.goto("/dashboard/upload");
      const gate = page.getByTestId("consent-gate");
      await expect(gate.getByRole("heading", { name: en.consent.updatedHeading })).toBeVisible();
      await expect(page.locator('input[type="file"]')).toHaveCount(0);

      const blocked = await page.request.post("/api/assets/upload-url", {
        data: { filename: "a.txt", mimeType: "text/plain", sizeBytes: 5 },
      });
      expect(blocked.status()).toBe(403);

      await page.getByTestId("consent-terms").check();
      await page.getByTestId("consent-rights").check();
      await page.getByTestId("consent-accept").click();
      await expect(page.locator('input[type="file"]')).toHaveCount(1, { timeout: 20_000 });
    } finally {
      await deleteTestUser(user);
    }
  });

  test("an account without a Creator subscription cannot upload, even after accepting", async ({ page }) => {
    let user: TestUser | undefined;
    try {
      user = await createTestUser("no-plan");
      await grantConsent(user.id);
      await logIn(page, user);
      await page.goto("/dashboard/upload");
      await expect(page.getByTestId("subscription-required")).toBeVisible();
      await expect(page.locator('input[type="file"]')).toHaveCount(0);

      const target = await page.request.post("/api/assets/upload-url", {
        data: { filename: "a.txt", mimeType: "text/plain", sizeBytes: 5 },
      });
      expect(target.status()).toBe(403);
      expect((await target.json()).code).toBe("subscription_required");

      const client = await userClient(user);
      const direct = await client.storage
        .from("vault")
        .upload(`${user.id}/direct.txt`, new Blob(["hello"], { type: "text/plain" }));
      expect(direct.error).not.toBeNull();
      expect((await client.storage.from("vault").list(user.id)).data ?? []).toHaveLength(0);
    } finally {
      await deleteTestUser(user);
    }
  });

  test("the database and the code agree on the current versions", async ({ page }) => {
    let user: TestUser | undefined;
    try {
      user = await createTestUser("consent-versions");
      await grantSubscription(user.id);
      await logIn(page, user);
      const status = await (await page.request.get("/api/consent")).json();
      expect(status).toMatchObject({
        accepted: false,
        termsVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_VERSION,
        uploadRightsVersion: UPLOAD_RIGHTS_VERSION,
      });
    } finally {
      await deleteTestUser(user);
    }
  });
});
