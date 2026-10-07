/**
 * English copy for the landing page — the base language.
 *
 * The strings reviewed and dictated by Ravi are reproduced here EXACTLY as he
 * wrote them. Do not "improve", shorten or re-voice them without asking: the
 * wording is the deliverable, not a first draft.
 *
 * Marked `VERBATIM` below:
 *   hero.equation, hero.support, hero.steps, risk.*, solution.heading,
 *   solution.*.title, steps.items
 *
 * A translation is a sibling file (../hi/landing.ts, ../bn/landing.ts)
 * annotated `: LandingMessages`. The shape is declared explicitly rather than
 * inferred from the English object — inferring it with `as const` would give
 * every field a *literal* type, so the only value assignable to the type
 * would be the English text itself and no translation could ever compile.
 */

import { PRODUCT_NAME } from "@/lib/brand";
import type { MediaKind } from "@/lib/media";

export interface LandingMessages {
  hero: {
    eyebrow: string;
    equation: readonly string[];
    support: string;
    steps: readonly string[];
    ctaPrimary: string;
    ctaPrimarySignedIn: string;
    ctaSecondary: string;
    /** Chip floating over the hero collage. */
    protectedChip: string;
  };
  marquee: {
    /** Accessible name of the marquee band. */
    ariaLabel: string;
    lead: string;
    disclaimer: string;
    /** Short qualifier shown with the platform marks in the hero. */
    heroNote: string;
  };
  /** Screen-reader description of the platforms-into-the-lock animation. */
  platformLock: {
    summary: string;
  };
  risk: {
    eyebrow: string;
    heading: string;
    points: readonly { lead: string; body: string }[];
  };
  solution: {
    heading: string;
    blocks: readonly { title: string; lead: string; body: string }[];
  };
  steps: {
    eyebrow: string;
    heading: string;
    intro: string;
    items: readonly { number: string; label: string; body: string }[];
    /** Chips inside the step illustrations. */
    securedBadge: string;
    downloadBadge: string;
  };
  contentWall: {
    eyebrow: string;
    heading: string;
    intro: string;
    /** `{row}` and `{total}` are filled in. */
    railLabel: string;
    swipeHint: string;
  };
  /**
   * The content-wall catalogue lives in src/lib/media.ts with English alt
   * text. `kinds` labels the chip on each tile; `alts` is keyed by the tile's
   * `src`, and a missing entry falls back to the English alt.
   */
  media: {
    kinds: Record<MediaKind, string>;
    alts: Record<string, string>;
  };
  trust: {
    /** Order matches the lock / download / sliders icons. */
    items: readonly { title: string; body: string }[];
  };
  faq: {
    eyebrow: string;
    heading: string;
    items: readonly { q: string; a: string }[];
  };
  finalCta: {
    heading: string;
    body: string;
    login: string;
  };
}

export const landing: LandingMessages = {
  hero: {
    eyebrow: "Early access for creators",
    /** VERBATIM — Ravi's three lines, in order. */
    equation: ["Content = $$$", "Content = Time", "Content = Brand"],
    /** VERBATIM. */
    support: "Secure your content from platform censorship and shifting regulations",
    /** VERBATIM — reads as a process: Upload → Secure → Retrieve anytime. */
    steps: ["Upload", "Secure", "Retrieve anytime"],
    ctaPrimary: "Protect My Content",
    ctaPrimarySignedIn: "Go to my files",
    ctaSecondary: "See how it works",
    protectedChip: "Protected in your private library",
  },

  marquee: {
    ariaLabel: "Platforms this is built for",
    /**
     * Truthful framing only. Ravi sketched "Join thousands of other content
     * creators from other major platforms" — we have no verified user count, so
     * the banner names the platforms the work comes FROM and claims nothing
     * about adoption.
     */
    lead: "For the work you publish on",
    disclaimer:
      `Platform names and logos are the property of their respective owners. ${PRODUCT_NAME} is an independent product and is not affiliated with, endorsed by, or partnered with any of them.`,
    /**
     * The hero animation shows platform marks converging on the lock, which
     * reads as an import if nothing says otherwise — and the product explicitly
     * does not import. This travels with the marks so the qualifier is on
     * screen with the picture, not three sections below it.
     */
    heroNote: `You upload your own copies. ${PRODUCT_NAME} never connects to these platforms.`,
  },

  platformLock: {
    /**
     * The animation reads as an import, so the description says whose copies
     * these are and states the denial here rather than leaving it to the FAQ.
     */
    summary: `Work a creator publishes on Instagram, Snapchat, Telegram, YouTube and TikTok, kept as their own copy in a lock they control. Files are uploaded by the creator; ${PRODUCT_NAME} does not connect to these platforms.`,
  },

  risk: {
    eyebrow: "Why it matters",
    /** VERBATIM. */
    heading: "Why your business is at risk right now:",
    /** VERBATIM — lead sentence is emphasised, the rest follows. */
    points: [
      {
        lead: "Your content is a vital business asset.",
        body: "It drives your revenue, branding, and audience growth, yet it lives on borrowed land.",
      },
      {
        lead: "You surrender exclusive ownership upon upload.",
        body: "The moment you post to social media, you give up control to major tech corporations.",
      },
      {
        lead: "Platform censorship and regulations can freeze you out instantly.",
        body: "A sudden policy shift, arbitrary censorship, or platform ban can wipe out your account overnight.",
      },
      {
        lead: "You are one glitch away from losing everything.",
        body: "Most creators keep only one copy of their best work, leaving no backup if things go wrong.",
      },
    ],
  },

  solution: {
    /** VERBATIM. */
    heading: "The Solution",
    blocks: [
      {
        /** VERBATIM — the heading stays exactly as Ravi wrote it. */
        title: "Sovereign Security",
        /**
         * The paragraph does NOT. Ravi's original asserted hosting in an
         * independent jurisdiction "completely insulated from restrictive local
         * regulations and unpredictable domestic laws", reached via "off-shore,
         * privacy-first infrastructure" and "safe from regulatory overreach".
         * The pilot is a single Supabase project — README.md recommends Mumbai
         * ap-south-1 for Indian creators — so every one of those clauses was
         * unsupportable, and the last one implies customer data is legally
         * unreachable, which no hosting arrangement delivers.
         *
         * This replacement was supplied by the client and keeps the intended
         * message — an independent copy, away from the platforms — while
         * claiming only what the product actually does. Do not re-add legal
         * guarantees here.
         */
        lead: "Keep an independent copy of your content outside the social platforms where you publish it.",
        body: "Your archive is stored separately from your social accounts, helping you reduce dependence on platform policy changes, account restrictions, and unexpected takedowns.",
      },
      {
        /** VERBATIM. */
        title: "On-Demand Freedom",
        lead: "Maintain absolute ownership with the power to download and reclaim your entire archive at a moment's notice.",
        body: "You will never have to worry about losing your lifework. Pull your data back whenever you want—instantly, effortlessly, and with zero strings attached.",
      },
    ],
  },

  steps: {
    eyebrow: "How it works",
    heading: "Upload. Secure. Retrieve.",
    intro:
      `You choose what to protect and upload it yourself. ${PRODUCT_NAME} never connects to Instagram, YouTube or TikTok, and never posts anything anywhere.`,
    /** VERBATIM labels — the numbers and words must not drift from the hero. */
    items: [
      {
        number: "01",
        label: "Upload",
        body: "A creator selects and uploads the content they want to preserve.",
      },
      {
        number: "02",
        label: "Secure",
        body: "The content moves into the protected lock environment.",
      },
      {
        number: "03",
        label: "Retrieve",
        body: "The creator can access and retrieve the content later.",
      },
    ],
    securedBadge: "Secured",
    downloadBadge: "Download",
  },

  contentWall: {
    eyebrow: "What you can protect",
    heading: "All of this can live in your private library.",
    intro: "Video, photos, audio, artwork, documents — whatever your business would miss.",
    railLabel: "Content you can protect, row {row} of {total}",
    swipeHint: "Swipe or scroll to see more →",
  },

  media: {
    kinds: {
      Reel: "Reel",
      Video: "Video",
      Photo: "Photo",
      Podcast: "Podcast",
      Thumbnail: "Thumbnail",
      "Brand Kit": "Brand Kit",
      Script: "Script",
    },
    // English alt text is the catalogue's own; nothing to override.
    alts: {},
  },

  trust: {
    items: [
      {
        title: "Private by default",
        body: "Your files are yours alone. No other user can list, open or download them.",
      },
      {
        title: "Yours to download",
        body: "Every file comes back out whenever you want it, in the format you put in.",
      },
      {
        title: "You control what is stored",
        body: "Upload what matters, delete what does not. Nothing is kept without you choosing it.",
      },
    ],
  },

  faq: {
    eyebrow: "FAQ",
    heading: "Questions creators ask first.",
    items: [
      {
        q: "Does this automatically back up my Instagram or YouTube?",
        a: `No. ${PRODUCT_NAME} does not connect to social platforms and does not import anything automatically. You choose the files you want protected and upload them yourself.`,
      },
      {
        q: "Can anyone else see my files?",
        a: "No. Your files are private. They are stored in a private location and each file is locked to your account, so no other user can list, open or download them.",
      },
      {
        q: "What kinds of files can I upload?",
        a: "Videos, photos, thumbnails, audio, PDFs and documents, plus text files like scripts and subtitles. Individual files can be up to 5 GB.",
      },
      {
        q: "Can I download my files whenever I want?",
        a: "Yes. Every file you upload can be downloaded at any time, and you can delete anything permanently whenever you choose.",
      },
      {
        q: "What happens if I stop paying?",
        a: "Your account and files stay. You can still view, download and delete them, but you can't upload new files until you subscribe again.",
      },
      {
        q: "How do I pay?",
        /**
         * Facts only: Paddle is the Merchant of Record. India has a rupee price
         * (a Paddle unit_price_overrides entry on the live price); elsewhere
         * the price is US dollars. Payment methods are whatever Paddle Checkout
         * offers in the buyer's country. UPI and card were confirmed in the live India
         * checkout on 6 Oct 2026; re-check before claiming any other method.
         */
        a: "Payments are processed by Paddle, our Merchant of Record. Creator is ₹399 a month in India, including GST, and you can pay by UPI or card. Outside India, checkout may show the price in your local currency, with any tax that applies.",
      },
    ],
  },

  finalCta: {
    heading: "Keep your own copy of your best work.",
    body: "Upload what matters. Get it back whenever you need it.",
    login: "I already have an account",
  },
};
