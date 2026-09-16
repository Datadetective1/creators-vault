import type { Metadata } from "next";
import Link from "next/link";

import { AuthForm, Field } from "@/components/auth-form";
import { signInAction } from "@/app/actions/auth";
import { NotConfiguredNotice } from "@/components/not-configured";
import { isSupabaseConfigured } from "@/lib/env";
import { safeNextPath } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(next);

  return (
    <div className="card">
      <h1 className="text-2xl font-semibold tracking-tight text-cream-50">Welcome back</h1>
      <p className="mt-1.5 text-sm text-muted">Log in to open your vault.</p>

      {!isSupabaseConfigured() && <NotConfiguredNotice />}

      <div className="mt-6">
        <AuthForm action={signInAction} submitLabel="Log in">
          <input type="hidden" name="next" value={nextPath} />
          <Field
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
          />
          <Field label="Password" name="password" type="password" autoComplete="current-password" />
        </AuthForm>
      </div>

      <div className="mt-5 flex flex-col gap-2 text-center text-sm">
        <Link href="/forgot-password" className="text-muted hover:text-cream-50">
          Forgot your password?
        </Link>
        <p className="text-muted">
          New here?{" "}
          <Link href="/signup" className="font-medium text-gold-400 hover:text-gold-300">
            Create a vault
          </Link>
        </p>
      </div>
    </div>
  );
}
