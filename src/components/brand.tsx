import Link from "next/link";

export function VaultMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="2.5" y="4.5" width="27" height="23" rx="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="16" r="6.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M16 12.2v3.8l2.4 1.6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M23.5 16h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M5.5 16h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2.5 text-cream-50 transition-opacity hover:opacity-85"
    >
      <span className="text-gold-400">
        <VaultMark />
      </span>
      <span className="whitespace-nowrap text-[1.0625rem] font-semibold tracking-tight">
        Creator Vault
      </span>
    </Link>
  );
}
