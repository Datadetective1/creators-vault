import type { Metadata } from "next";
import Link from "next/link";

import { AuthForm, Field } from "@/components/auth-form";
import { signUpAction } from "@/app/actions/auth";
import { NotConfiguredNotice } from "@/components/not-configured";
import { rich } from "@/components/rich-text";
import { isSupabaseConfigured } from "@/lib/env";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.auth.signup.metaTitle };
}

const linkClass = "text-cream-300 underline underline-offset-2 hover:text-cream-50";

export default async function SignUpPage() {
  const { t } = await getI18n();
  const copy = t.auth.signup;
  const fields = t.auth.fields;

  return (
    <div className="card">
      <h1 className="text-2xl font-semibold tracking-tight text-cream-50">{copy.title}</h1>
      <p className="mt-1.5 text-sm text-muted">{copy.subtitle}</p>

      {!isSupabaseConfigured() && <NotConfiguredNotice />}

      <div className="mt-6">
        <AuthForm action={signUpAction} submitLabel={copy.submit}>
          <Field
            label={fields.name}
            name="display_name"
            autoComplete="name"
            required={false}
            placeholder={fields.nameOptional}
          />
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
            autoComplete="new-password"
            hint={fields.passwordHint}
          />
        </AuthForm>
      </div>

      <p className="mt-4 text-center text-xs leading-relaxed text-muted">
        {rich(copy.agreement, {
          terms: (
            <Link href="/terms" className={linkClass}>
              {t.common.legalLinks.terms}
            </Link>
          ),
          privacy: (
            <Link href="/privacy" className={linkClass}>
              {t.common.legalLinks.privacy}
            </Link>
          ),
        })}
      </p>

      <p className="mt-6 text-center text-sm text-muted">
        {copy.haveAccount}{" "}
        <Link href="/login" className="font-medium text-gold-400 hover:text-gold-300">
          {copy.login}
        </Link>
      </p>
    </div>
  );
}
