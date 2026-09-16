"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { isSupabaseConfigured, siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-redirect";

export interface AuthFormState {
  error?: string;
  notice?: string;
}

const NOT_CONFIGURED: AuthFormState = {
  error:
    "Accounts are not available yet — this deployment is not connected to its database. Please check back shortly.",
};

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
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const { email, password } = readCredentials(formData);
  const displayName = String(formData.get("display_name") ?? "").trim();

  if (!email || !password) return { error: "Enter your email and a password." };
  if (password.length < 8) {
    return { error: "Use a password of at least 8 characters." };
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
    return {
      notice:
        "Check your email for a confirmation link to finish setting up your vault.",
    };
  }

  // Supabase returns a user with no identities when the address is already
  // registered. Report the same neutral message either way so the form cannot
  // be used to discover which emails have accounts.
  if (data.user && data.user.identities?.length === 0) {
    return {
      notice: "Check your email for a confirmation link to finish setting up your vault.",
    };
  }

  // A session here means email confirmation is switched off in Supabase.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/dashboard");
  }

  return {
    notice: "Check your email for a confirmation link to finish setting up your vault.",
  };
}

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const { email, password } = readCredentials(formData);
  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Deliberately generic: do not reveal whether the address exists.
    return { error: "That email and password combination did not work." };
  }

  revalidatePath("/", "layout");
  redirect(safeNextPath(formData.get("next")));
}

export async function requestPasswordResetAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const { email } = readCredentials(formData);
  if (!email) return { error: "Enter your email address." };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/reset-password`,
  });

  // Always the same response, whether or not the account exists.
  return {
    notice: "If an account exists for that address, a password reset link is on its way.",
  };
}

export async function updatePasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (password.length < 8) return { error: "Use a password of at least 8 characters." };
  if (password !== confirm) return { error: "Those passwords do not match." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "This reset link has expired. Request a new one and try again." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    // e.g. "New password should be different from the old password" confirms a
    // guess about the current one.
    console.error("[auth] updateUser failed", error.message);
    return { error: "That password could not be saved. Try a different one." };
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
