/**
 * Shared chrome: navigation, footer, language picker, legal links and the
 * site-wide metadata. English is the base language; defines the shape for hi
 * and bn.
 */
export const common = {
  skipToContent: "Skip to content",
  meta: {
    title: "Secure your content from platform censorship",
    description:
      "Upload, secure and retrieve your own copy of the videos, photos and files your business is built on. Secure your content from platform censorship and shifting regulations.",
    ogDescription:
      "Upload. Secure. Retrieve anytime. Keep a private, independent copy of the content your business depends on.",
  },
  language: {
    label: "Language",
  },
  nav: {
    main: "Main",
    howItWorks: "How It Works",
    whatYouCanProtect: "What You Can Protect",
    pricing: "Pricing",
    faq: "FAQ",
    login: "Login",
    signupCta: "Protect My Content",
    signupCtaShort: "Sign up",
    goToFiles: "Go to my files",
  },
  dashboardNav: {
    label: "Dashboard",
    dashboard: "Dashboard",
    files: "My Files",
    upload: "Upload",
    plan: "Plan",
    logout: "Log out",
  },
  footer: {
    tagline: "An independent, private copy of the work behind your brand.",
    product: "Product",
    howItWorks: "How it works",
    whatYouCanProtect: "What you can protect",
    pricing: "Pricing",
    account: "Account",
    createAccount: "Create account",
    login: "Login",
    faq: "FAQ",
    support: "Support",
    help: "Help",
    emailSupport: "Email support",
    reportSecurity: "Report a security issue",
    legal: "Legal",
    rights: "All rights reserved.",
    privacyNote: "Your files stay private. We never publish or share what you upload.",
  },
  legalLinks: {
    terms: "Terms of Service",
    termsShort: "Terms",
    privacy: "Privacy Policy",
    privacyShort: "Privacy",
    refunds: "Refund Policy",
    refundsShort: "Refunds",
  },
  /** Shown above a legal document in every locale except English. */
  legalEnglishOnly:
    "This document is published in English, and the English version is the one that applies. A translation may be added later for convenience only.",
  backTo: "Back to {product}",
  errors: {
    generic: "Something went wrong. Please try again.",
    signedOut: "You must be signed in.",
  },
};

export type CommonMessages = typeof common;
