import type { Metadata } from "next";

import { AuthForm, Field } from "@/components/auth-form";
import { updatePasswordAction } from "@/app/actions/auth";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.auth.resetPassword.metaTitle };
}

/**
 * Reached through the emailed reset link, which lands on /auth/callback and is
 * exchanged for a session before redirecting here. updatePasswordAction
 * re-checks that a session exists, so opening this page directly does nothing.
 */
export default async function ResetPasswordPage() {
  const { t } = await getI18n();
  const copy = t.auth.resetPassword;
  const fields = t.auth.fields;

  return (
    <div className="card">
      <h1 className="text-2xl font-semibold tracking-tight text-cream-50">{copy.title}</h1>
      <p className="mt-1.5 text-sm text-muted">{copy.subtitle}</p>

      <div className="mt-6">
        <AuthForm action={updatePasswordAction} submitLabel={copy.submit}>
          <Field
            label={fields.newPassword}
            name="password"
            type="password"
            autoComplete="new-password"
            hint={fields.passwordHint}
          />
          <Field
            label={fields.confirmPassword}
            name="confirm_password"
            type="password"
            autoComplete="new-password"
          />
        </AuthForm>
      </div>
    </div>
  );
}
