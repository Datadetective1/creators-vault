import type { Metadata } from "next";
import Link from "next/link";

import { AuthForm, Field } from "@/components/auth-form";
import { signUpAction } from "@/app/actions/auth";
import { NotConfiguredNotice } from "@/components/not-configured";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Create your vault" };

export default function SignUpPage() {
  return (
    <div className="card">
      <h1 className="text-2xl font-semibold tracking-tight text-cream-50">Create your vault</h1>
      <p className="mt-1.5 text-sm text-muted">
        Start free with 5&nbsp;GB of private storage. No card required.
      </p>

      {!isSupabaseConfigured() && <NotConfiguredNotice />}

      <div className="mt-6">
        <AuthForm action={signUpAction} submitLabel="Create my vault">
          <Field
            label="Your name"
            name="display_name"
            autoComplete="name"
            required={false}
            placeholder="Optional"
          />
          <Field
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
          />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            hint="At least 8 characters."
          />
        </AuthForm>
      </div>

      <p className="mt-4 text-center text-xs leading-relaxed text-muted">
        By creating an account you agree to our{" "}
        <Link href="/terms" className="text-cream-300 underline underline-offset-2 hover:text-cream-50">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-cream-300 underline underline-offset-2 hover:text-cream-50">
          Privacy Policy
        </Link>
        .
      </p>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-gold-400 hover:text-gold-300">
          Log in
        </Link>
      </p>
    </div>
  );
}
