import type { Metadata } from "next";
import Link from "next/link";

import { AuthForm, Field } from "@/components/auth-form";
import { requestPasswordResetAction } from "@/app/actions/auth";
import { NotConfiguredNotice } from "@/components/not-configured";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <div className="card">
      <h1 className="text-2xl font-semibold tracking-tight text-cream-50">Reset your password</h1>
      <p className="mt-1.5 text-sm text-muted">
        Enter your email and we will send you a link to set a new password.
      </p>

      {!isSupabaseConfigured() && <NotConfiguredNotice />}

      <div className="mt-6">
        <AuthForm action={requestPasswordResetAction} submitLabel="Send reset link">
          <Field
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
          />
        </AuthForm>
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-gold-400 hover:text-gold-300">
          Back to login
        </Link>
      </p>
    </div>
  );
}
