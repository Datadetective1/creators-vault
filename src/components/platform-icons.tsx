/**
 * Simplified platform glyphs.
 *
 * These are deliberately NOT the official logos: single-colour, redrawn, no
 * brand palette, no wordmarks. They are used nominatively — to say "the work
 * you publish over there" — and every surface that renders them also carries
 * the disclaimer in `en.marquee.disclaimer`. Nothing on the page states or
 * implies a partnership, integration or endorsement, and the product does not
 * connect to any of these platforms (see the FAQ).
 *
 * Keep them monochrome. The moment one of these is drawn in its brand colours
 * it stops looking like a reference and starts looking like a badge.
 */

export interface Platform {
  id: string;
  name: string;
  Icon: (props: { className?: string }) => React.JSX.Element;
}

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function InstagramGlyph({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" {...stroke} />
      <circle cx="12" cy="12" r="4.2" {...stroke} />
      <circle cx="17.1" cy="6.9" r="1.05" fill="currentColor" />
    </svg>
  );
}

function SnapchatGlyph({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 3.6c2.6 0 4.3 1.9 4.3 4.5 0 1.1-.1 2-.1 2.5.5.3 1.2.1 1.7-.2.6.5.2 1.4-1.2 1.9.5 1.6 1.8 3 3.1 3.3.3.4-.6 1.1-2.4 1.4-.2.4-.2 1-.4 1.2-.3.2-1.2-.2-2.3-.2-1 0-1.6.9-2.7.9s-1.7-.9-2.7-.9c-1.1 0-2 .4-2.3.2-.2-.2-.2-.8-.4-1.2-1.8-.3-2.7-1-2.4-1.4 1.3-.3 2.6-1.7 3.1-3.3-1.4-.5-1.8-1.4-1.2-1.9.5.3 1.2.5 1.7.2 0-.5-.1-1.4-.1-2.5 0-2.6 1.7-4.5 4.3-4.5z"
        {...stroke}
      />
    </svg>
  );
}

function TelegramGlyph({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M21 4.5L2.9 11.4c-.5.2-.5.8 0 1l4.5 1.5L19 6.3 9.8 14.6l-.3 4.6c.4 0 .6-.2.8-.4l2.1-2 4.4 3.2c.5.3 1 .1 1.1-.5L21.9 5.3c.1-.6-.3-.9-.9-.8z" {...stroke} />
    </svg>
  );
}

function YouTubeGlyph({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="2.6" y="5.4" width="18.8" height="13.2" rx="4.2" {...stroke} />
      <path d="M10.4 9.3l4.7 2.7-4.7 2.7V9.3z" {...stroke} />
    </svg>
  );
}

function TikTokGlyph({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="9" cy="16.6" r="3.6" {...stroke} />
      <path d="M12.6 16.6V4.2c.6 2.3 2.3 3.9 4.7 4.1" {...stroke} />
    </svg>
  );
}

/**
 * The platforms Ravi named. Order is the order they appear around the lock.
 */
export const PLATFORMS: Platform[] = [
  { id: "instagram", name: "Instagram", Icon: InstagramGlyph },
  { id: "snapchat", name: "Snapchat", Icon: SnapchatGlyph },
  { id: "telegram", name: "Telegram", Icon: TelegramGlyph },
  { id: "youtube", name: "YouTube", Icon: YouTubeGlyph },
  { id: "tiktok", name: "TikTok", Icon: TikTokGlyph },
];
