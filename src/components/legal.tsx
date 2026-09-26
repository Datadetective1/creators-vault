import Link from "next/link";

import { LEGAL, PLACEHOLDER_LABELS, type LegalPlaceholderKey } from "@/lib/legal";

/**
 * Building blocks for the policy pages. Plain, readable typography — these are
 * documents, not marketing.
 */

export function LegalDocument({
  title,
  summary,
  children,
}: {
  title: string;
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl">
      <p className="text-sm text-muted">Last updated {LEGAL.lastUpdated}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-cream-50 sm:text-4xl">
        {title}
      </h1>
      <p className="mt-4 text-base leading-relaxed text-cream-300">{summary}</p>
      <nav aria-label="Policies" className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <PolicyLink href="/terms">Terms of Service</PolicyLink>
        <PolicyLink href="/privacy">Privacy Policy</PolicyLink>
        <PolicyLink href="/refunds">Refund Policy</PolicyLink>
      </nav>
      <div className="mt-10 space-y-10">{children}</div>
    </article>
  );
}

function PolicyLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-medium text-gold-400 underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}

export function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-28">
      <h2 id={`${id}-heading`} className="text-xl font-semibold text-cream-50">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-[0.95rem] leading-relaxed text-cream-300">
        {children}
      </div>
    </section>
  );
}

export function List({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-1.5 pl-5 marker:text-gold-400">{children}</ul>;
}

export function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      rel="noopener noreferrer"
      target="_blank"
      className="text-gold-400 underline-offset-4 hover:underline"
    >
      {children}
    </a>
  );
}

/**
 * A business detail from LEGAL, or — until the owner fills it in — a visibly
 * marked placeholder. Never an invented value.
 */
export function Detail({ field }: { field: LegalPlaceholderKey }) {
  const value = LEGAL[field];
  if (value) {
    if (field === "contactEmail") {
      return (
        <a href={`mailto:${value}`} className="text-gold-400 underline-offset-4 hover:underline">
          {value}
        </a>
      );
    }
    return <>{value}</>;
  }
  return (
    <mark className="rounded bg-gold-400/15 px-1 py-0.5 font-medium text-gold-300">
      [To be confirmed: {PLACEHOLDER_LABELS[field]}]
    </mark>
  );
}

/** The legal entity behind Creator Lock, or its marked placeholder. */
export function Operator() {
  return <Detail field="operatorName" />;
}
