"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { isSupabaseConfigured, siteUrl } from "@/lib/env";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-redirect";

export interface AuthFormState {
  error?: string;
  notice?: string;
}

/**
 * The visitor's auth copy. Messages are returned in their language; what they
 * say — and so what they reveal about which accounts exist — is the same in
 * every locale.
 */
async function authCopy() {
  return (await getI18n()).t.auth;
}

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  };
}



export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const copy = await authCopy();
  if (!isSupabaseConfigured()) return { error: copy.errors.notConfigured };

  const { email, password } = readCredentials(formData);
  const displayName = String(formData.get("display_name") ?? "").trim();

  if (!email || !password) return { error: copy.errors.signUpMissing };
  if (password.length < 8) {
    return { error: copy.errors.passwordTooShort };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/callback`,
      data: displayName ? { display_name: displayName } : undefined,
    },
  });

  if (error) {
    // Never surface the raw message: with email confirmation off, Supabase
    // returns "User already registered", which is exactly the enumeration
    // oracle the identities check below exists to prevent.
    console.error("[auth] signUp failed", error.message);
    return { notice: copy.notices.confirmEmail };
  }

  // Supabase returns a user with no identities when the address is already
  // registered. Report the same neutral message either way so the form cannot
  // be used to discover which emails have accounts.
  if (data.user && data.user.identities?.length === 0) {
    return { notice: copy.notices.confirmEmail };
  }

  // A session here means email confirmation is switched off in Supabase.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/dashboard");
  }

  return { notice: copy.notices.confirmEmail };
}

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const copy = await authCopy();
  if (!isSupabaseConfigured()) return { error: copy.errors.notConfigured };

  const { email, password } = readCredentials(formData);
  if (!email || !password) return { error: copy.errors.signInMissing };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Deliberately generic: do not reveal whether the address exists.
    return { error: copy.errors.signInFailed };
  }

  revalidatePath("/", "layout");
  redirect(safeNextPath(formData.get("next")));
}

export async function requestPasswordResetAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const copy = await authCopy();
  if (!isSupabaseConfigured()) return { error: copy.errors.notConfigured };

  const { email } = readCredentials(formData);
  if (!email) return { error: copy.errors.emailMissing };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/reset-password`,
  });

  // Always the same response, whether or not the account exists.
  return { notice: copy.notices.resetSent };
}

export async function updatePasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const copy = await authCopy();
  if (!isSupabaseConfigured()) return { error: copy.errors.notConfigured };

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (password.length < 8) return { error: copy.errors.passwordTooShort };
  if (password !== confirm) return { error: copy.errors.passwordMismatch };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: copy.errors.resetExpired };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    // e.g. "New password should be different from the old password" confirms a
    // guess about the current one.
    console.error("[auth] updateUser failed", error.message);
    return { error: copy.errors.passwordNotSaved };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signOutAction(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect("/");
}
