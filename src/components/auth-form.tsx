"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import type { AuthFormState } from "@/app/actions/auth";

type Action = (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;

export function AuthForm({
  action,
  submitLabel,
  children,
}: {
  action: Action;
  submitLabel: string;
  children: React.ReactNode;
}) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {children}

      {state.error && (
        <p
          role="alert"
          className="rounded-xl border border-rose-400/40 bg-rose-400/10 px-4 py-3 text-sm text-rose-400"
        >
          {state.error}
        </p>
      )}

      {state.notice && (
        <p
          role="status"
          className="rounded-xl border border-mint-400/40 bg-mint-400/10 px-4 py-3 text-sm text-mint-400"
        >
          {state.notice}
        </p>
      )}

      <SubmitButton label={submitLabel} />
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full py-3" disabled={pending}>
      {pending ? "Working…" : label}
    </button>
  );
}

export function Field({
  label,
  name,
  type = "text",
  autoComplete,
  required = true,
  placeholder,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  const hintId = hint ? `${name}-hint` : undefined;
  return (
    <div>
      <label htmlFor={name} className="field-label">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-describedby={hintId}
        className="field-input"
      />
      {hint && (
        <p id={hintId} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
