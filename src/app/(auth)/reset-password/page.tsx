import type { Metadata } from "next";

import { AuthForm, Field } from "@/components/auth-form";
import { updatePasswordAction } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Choose a new password" };

/**
 * Reached through the emailed reset link, which lands on /auth/callback and is
 * exchanged for a session before redirecting here. updatePasswordAction
 * re-checks that a session exists, so opening this page directly does nothing.
 */
export default function ResetPasswordPage() {
  return (
    <div className="card">
      <h1 className="text-2xl font-semibold tracking-tight text-cream-50">
        Choose a new password
      </h1>
      <p className="mt-1.5 text-sm text-muted">
        Pick something you have not used elsewhere.
      </p>

      <div className="mt-6">
        <AuthForm action={updatePasswordAction} submitLabel="Save new password">
          <Field
            label="New password"
            name="password"
            type="password"
            autoComplete="new-password"
            hint="At least 8 characters."
          />
          <Field
            label="Confirm new password"
            name="confirm_password"
            type="password"
            autoComplete="new-password"
          />
        </AuthForm>
      </div>
    </div>
  );
}
