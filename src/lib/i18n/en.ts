/**
 * English copy for the landing page — the base language.
 *
 * The strings reviewed and dictated by Ravi are reproduced here EXACTLY as he
 * wrote them. Do not "improve", shorten or re-voice them without asking: the
 * wording is the deliverable, not a first draft.
 *
 * Marked `VERBATIM` below:
 *   hero.equation, hero.support, hero.steps, risk.*, solution.*, steps.labels
 *
 * A translator should treat this file as the source of truth and add a sibling
 * (hi.ts, bn.ts) with the same shape. See locales.ts for why none exists yet.
 */

export const en = {
  hero: {
    eyebrow: "Early access for creators",
    /** VERBATIM — Ravi's three lines, in order. */
    equation: ["Content = $$$", "Content = Time", "Content = Brand"] as const,
    /** VERBATIM. */
    support: "Secure your content from platform censorship and shifting regulations",
    /** VERBATIM — reads as a process: Upload → Secure → Retrieve anytime. */
    steps: ["Upload", "Secure", "Retrieve anytime"] as const,
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
      "Platform names and logos are the property of their respective owners. Creator Vault is an independent product and is not affiliated with, endorsed by, or partnered with any of them.",
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
        /** VERBATIM. */
        title: "Sovereign Security",
        lead: "Your content is hosted in a secure, independent jurisdiction completely insulated from restrictive local regulations and unpredictable domestic laws.",
        body: "By utilizing off-shore, privacy-first infrastructure, your digital assets remain safe from regulatory overreach and arbitrary platform takedowns. Your content, your rules.",
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
      "You choose what to protect and upload it yourself. Creator Vault never connects to Instagram, YouTube or TikTok, and never posts anything anywhere.",
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
} as const;

export type Dictionary = typeof en;
