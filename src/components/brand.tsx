import Link from "next/link";

/**
 * The product mark: a padlock.
 *
 * Ravi asked for a lock specifically because it needs no explanation — a
 * visitor reads "your things are safe here" before reading a word. Drawn on a
 * 32x32 grid with a 2px stroke so it stays crisp at nav size (28px) and still
 * reads as a lock at favicon size (16px), where the keyhole is the only
 * interior detail small enough to survive.
 *
 * It is also the destination of the platform animation on the landing page, so
 * the shackle and body are proportioned to read at ~96px too.
 */
export function LockMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* shackle */}
      <path
        d="M10.5 13.5V10a5.5 5.5 0 0111 0v3.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* body */}
      <rect
        x="5.5"
        y="13.5"
        width="21"
        height="14.5"
        rx="4"
        stroke="currentColor"
        strokeWidth="2.4"
      />
      {/* keyhole — one detail, so it survives the downscale to 16px */}
      <circle cx="16" cy="19.8" r="1.9" fill="currentColor" />
      <path
        d="M16 21.4v2.6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Wordmark.
 *
 * "Creator Vault" is still a PLACEHOLDER. Ravi raised Content Wall / Content
 * Block and others; no name has been chosen, so nothing here should be treated
 * as final branding. Change it in one place when the decision lands.
 */
export const PRODUCT_NAME = "Creator Vault";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2.5 text-cream-50 transition-opacity hover:opacity-85"
    >
      <span className="text-gold-400">
        <LockMark />
      </span>
      <span className="whitespace-nowrap text-[1.0625rem] font-semibold tracking-tight">
        {PRODUCT_NAME}
      </span>
    </Link>
  );
}
