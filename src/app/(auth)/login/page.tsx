import type { Metadata } from "next";
import Link from "next/link";

import { AuthForm, Field } from "@/components/auth-form";
import { signInAction } from "@/app/actions/auth";
import { NotConfiguredNotice } from "@/components/not-configured";
import { isSupabaseConfigured } from "@/lib/env";
import { getI18n } from "@/lib/i18n/server";
import { safeNextPath } from "@/lib/safe-redirect";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.auth.login.metaTitle };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(next);
  const { t } = await getI18n();
  const copy = t.auth.login;
  const fields = t.auth.fields;

  return (
    <div className="card">
      <h1 className="text-2xl font-semibold tracking-tight text-cream-50">{copy.title}</h1>
      <p className="mt-1.5 text-sm text-muted">{copy.subtitle}</p>

      {!isSupabaseConfigured() && <NotConfiguredNotice />}

      <div className="mt-6">
        <AuthForm action={signInAction} submitLabel={copy.submit}>
          <input type="hidden" name="next" value={nextPath} />
          <Field
            label={fields.email}
            name="email"
            type="email"
            autoComplete="email"
            placeholder={fields.emailPlaceholder}
          />
          <Field
            label={fields.password}
            name="password"
            type="password"
            autoComplete="current-password"
          />
        </AuthForm>
      </div>

      <div className="mt-5 flex flex-col gap-2 text-center text-sm">
        <Link href="/forgot-password" className="text-muted hover:text-cream-50">
          {copy.forgotPassword}
        </Link>
        <p className="text-muted">
          {copy.newHere}{" "}
          <Link href="/signup" className="font-medium text-gold-400 hover:text-gold-300">
            {copy.createAccount}
          </Link>
        </p>
      </div>
    </div>
  );
}
