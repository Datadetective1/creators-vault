import type { Metadata } from "next";
import Link from "next/link";

import { AuthForm, Field } from "@/components/auth-form";
import { requestPasswordResetAction } from "@/app/actions/auth";
import { NotConfiguredNotice } from "@/components/not-configured";
import { isSupabaseConfigured } from "@/lib/env";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.auth.forgotPassword.metaTitle };
}

export default async function ForgotPasswordPage() {
  const { t } = await getI18n();
  const copy = t.auth.forgotPassword;

  return (
    <div className="card">
      <h1 className="text-2xl font-semibold tracking-tight text-cream-50">{copy.title}</h1>
      <p className="mt-1.5 text-sm text-muted">{copy.subtitle}</p>

      {!isSupabaseConfigured() && <NotConfiguredNotice />}

      <div className="mt-6">
        <AuthForm action={requestPasswordResetAction} submitLabel={copy.submit}>
          <Field
            label={t.auth.fields.email}
            name="email"
            type="email"
            autoComplete="email"
            placeholder={t.auth.fields.emailPlaceholder}
          />
        </AuthForm>
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-gold-400 hover:text-gold-300">
          {copy.backToLogin}
        </Link>
      </p>
    </div>
  );
}
