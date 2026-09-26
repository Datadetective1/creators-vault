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
 * A translator adds a sibling (hi.ts, bn.ts) annotated `: Dictionary` and
 * registers it in index.ts. The shape is declared explicitly rather than
 * inferred from the English object — inferring it with `as const` would give
 * every field a *literal* type, so the only value assignable to `Dictionary`
 * would be the English text itself and no translation could ever compile.
 */

import { PRODUCT_NAME } from "@/lib/brand";

export interface Dictionary {
  hero: {
    eyebrow: string;
    equation: readonly string[];
    support: string;
    steps: readonly string[];
    ctaPrimary: string;
    ctaPrimarySignedIn: string;
    ctaSecondary: string;
  };
  marquee: {
    lead: string;
    disclaimer: string;
    /** Short qualifier shown with the platform marks in the hero. */
    heroNote: string;
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
  };
}

export const en: Dictionary = {
  hero: {
    eyebrow: "Early access for creators",
    /** VERBATIM — Ravi's three lines, in order. */
    equation: ["Content = $$$", "Content = Time", "Content = Brand"],
    /** VERBATIM. */
    support: "Secure your content from platform censorship and shifting regulations",
    /** VERBATIM — reads as a process: Upload → Secure → Retrieve anytime. */
    steps: ["Upload", "Secure", "Retrieve anytime"],
    ctaPrimary: "Protect My Content",
    ctaPrimarySignedIn: "Go to my vault",
    ctaSecondary: "See how it works",
  },

  marquee: {
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
  },
};
