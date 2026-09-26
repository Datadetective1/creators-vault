import { randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Throwaway, pre-confirmed test accounts for the live Supabase journey.
 *
 * Production keeps "Confirm email" ON, so a user created through the public
 * sign-up form cannot reach the dashboard without opening a mailbox. The
 * journey tests therefore provision their accounts through the admin API
 * (already confirmed, no email sent) and then do everything a creator does —
 * log in, upload, list, download, delete — through the real UI. The sign-up
 * form keeps its own coverage in vault-journey.spec.ts.
 *
 * The service-role key is read from the environment (or .env.local, the same
 * file `next start` loads) and never leaves this process: nothing here logs a
 * key, a token or a password.
 */

// Next loads .env.local for the web server; the Playwright runner does not.
// loadEnvFile never overwrites a variable that is already set.
const envFile = resolve(process.cwd(), ".env.local");
if (existsSync(envFile)) process.loadEnvFile(envFile);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const VAULT_BUCKET = "vault";

/** True when the runner can provision accounts through the admin API. */
export const canProvisionUsers = url !== "" && serviceRoleKey !== "";

let adminClient: SupabaseClient | undefined;

function admin(): SupabaseClient {
  if (!canProvisionUsers) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }
  adminClient ??= createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}

export type TestUser = { id: string; email: string; password: string };

/**
 * A confirmed account with a unique address.
 *
 * `.test` is reserved by RFC 2606, so the address can never belong to a real
 * person. The admin API sends no email for it. Only use these addresses where
 * no mail is sent: anything that triggers a real email must use a deliverable
 * test inbox instead, or the bounce is charged to the sending domain.
 */
export async function createTestUser(label: string): Promise<TestUser> {
  const email = `e2e-${label}-${randomUUID().slice(0, 12)}@creatorlock.test`;
  const password = `${randomBytes(18).toString("base64url")}!9a`;
  const { data, error } = await admin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`Could not create a test user (${error?.message ?? "no user returned"}).`);
  }
  return { id: data.user.id, email, password };
}

/**
 * Remove everything a test user left behind.
 *
 * Storage objects go first and through the Storage API: deleting the auth user
 * cascades to profiles, subscriptions, assets and checkout_sessions, but a row
 * delete never removes bytes from the bucket.
 */
export async function deleteTestUser(user: TestUser | undefined): Promise<void> {
  if (!user) return;
  const client = admin();

  for (;;) {
    const { data, error } = await client.storage
      .from(VAULT_BUCKET)
      .list(user.id, { limit: 100 });
    if (error) throw new Error(`Could not list test objects (${error.message}).`);
    if (!data || data.length === 0) break;
    const { error: removeError } = await client.storage
      .from(VAULT_BUCKET)
      .remove(data.map((object) => `${user.id}/${object.name}`));
    if (removeError) throw new Error(`Could not remove test objects (${removeError.message}).`);
  }

  const { error } = await client.auth.admin.deleteUser(user.id);
  if (error && !/not.?found/i.test(error.message)) {
    throw new Error(`Could not delete the test user (${error.message}).`);
  }
}

/**
 * Delete any account registered under exactly this address.
 *
 * The sign-up form test submits a fresh address; if Supabase created an
 * unconfirmed account for it, this makes sure it does not outlive the run.
 */
export async function deleteUsersByEmail(email: string): Promise<void> {
  const client = admin();
  for (let page = 1; ; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`Could not list users (${error.message}).`);
    for (const user of data.users) {
      if (user.email?.toLowerCase() === email.toLowerCase()) {
        await deleteTestUser({ id: user.id, email, password: "" });
      }
    }
    if (data.users.length < 200) break;
  }
}

/** What remains in the database and bucket for a user id — used to prove cleanup. */
export async function leftoversFor(userId: string) {
  const client = admin();
  const [assets, objects, user] = await Promise.all([
    client.from("assets").select("id", { count: "exact", head: true }).eq("user_id", userId),
    client.storage.from(VAULT_BUCKET).list(userId, { limit: 1 }),
    client.auth.admin.getUserById(userId),
  ]);
  return {
    assets: assets.count ?? 0,
    objects: objects.data?.length ?? 0,
    userExists: Boolean(user.data?.user),
  };
}
