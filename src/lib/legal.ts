import { PRODUCT_NAME } from "@/components/brand";

/**
 * Facts the Terms, Privacy Policy and Refund Policy depend on.
 *
 * Confirmed business details are filled in. Anything still `null` is a fact
 * only the business owner can supply; until then the policy pages show a
 * clearly marked "[To be confirmed: …]" placeholder instead of an invented
 * value. Each page reads from this one object.
 */
export const LEGAL = {
  productName: PRODUCT_NAME,
  siteUrl: "https://www.creatorlock.app",
  lastUpdated: "26 September 2026",

  /** The legal entity that operates Creator Lock and contracts with customers. */
  operatorName: "MERIDIAN VERTEX LLC" as string | null,
  /** Where that entity is registered. */
  operatorJurisdiction: "Texas, United States" as string | null,
  /**
   * Business mailing address. Shown only where a legal/business address is
   * appropriate (the "who we are" sections of the Terms and Privacy Policy),
   * never in marketing areas of the site.
   */
  mailingAddress: "817 S MacArthur Blvd, Ste 115 #1040, Coppell, TX 75019, USA" as string | null,
  /**
   * Contact addresses, confirmed by the owner and verified on 26 September 2026
   * to be accepted by creatorlock.app's Cloudflare Email Routing.
   */
  supportEmail: "support@creatorlock.app" as string | null,
  privacyEmail: "privacy@creatorlock.app" as string | null,
  billingEmail: "billing@creatorlock.app" as string | null,
  refundsEmail: "refunds@creatorlock.app" as string | null,
  legalEmail: "legal@creatorlock.app" as string | null,
  securityEmail: "security@creatorlock.app" as string | null,
  /**
   * The law that governs the Terms. No county or exclusive court venue has
   * been chosen, so none is stated.
   */
  governingLaw: "the laws of the State of Texas, United States" as string | null,

  /** Service facts, taken from the running configuration. */
  freeStorage: "5 GB",
  creatorStorage: "100 GB",
  creatorPrice: "US$4 per month",
  maxFileSize: "5 GB",
} as const;

/**
 * Policy choices that were proposed while drafting but have NOT been decided
 * by the business owner. The pages show each one with a visible "proposed —
 * pending confirmation" marker. When one is decided, set `confirmed: true`
 * (and change `value` if the decision differs) and the marker disappears.
 */
export const PROPOSED_TERMS = {
  minimumAge: { value: "16", confirmed: false },
  priceChangeNoticeDays: { value: "30 days", confirmed: false },
  closureNoticeDays: { value: "30 days", confirmed: false },
  accountDeletionDays: { value: "30 days", confirmed: false },
  liabilityCap: {
    value: "the amount you paid us in the 12 months before it arose, or US$50, whichever is greater",
    confirmed: false,
  },
  refundWindowDays: { value: "14", confirmed: false },
  privacyResponseDays: { value: "30 days", confirmed: false },
} as const;

export type ProposedTermKey = keyof typeof PROPOSED_TERMS;

export type LegalPlaceholderKey =
  | "operatorName"
  | "operatorJurisdiction"
  | "mailingAddress"
  | "supportEmail"
  | "privacyEmail"
  | "billingEmail"
  | "refundsEmail"
  | "legalEmail"
  | "securityEmail"
  | "governingLaw";

export const PLACEHOLDER_LABELS: Record<LegalPlaceholderKey, string> = {
  operatorName: "legal name of the business that operates Creator Lock",
  operatorJurisdiction: "where that business is registered",
  mailingAddress: "business mailing address",
  supportEmail: "support email",
  privacyEmail: "privacy email",
  billingEmail: "billing email",
  refundsEmail: "refunds email",
  legalEmail: "legal notices email",
  securityEmail: "security reports email",
  governingLaw: "governing law",
};

/** Keys whose value is an email address, rendered as mailto links. */
export const EMAIL_FIELDS = new Set<LegalPlaceholderKey>([
  "supportEmail",
  "privacyEmail",
  "billingEmail",
  "refundsEmail",
  "legalEmail",
  "securityEmail",
]);

/** Which details are still missing — handy for a pre-launch check. */
export function missingLegalDetails(): LegalPlaceholderKey[] {
  return (Object.keys(PLACEHOLDER_LABELS) as LegalPlaceholderKey[]).filter(
    (key) => LEGAL[key] === null,
  );
}

/** Which proposed policy choices still await a decision. */
export function unconfirmedPolicyChoices(): ProposedTermKey[] {
  return (Object.keys(PROPOSED_TERMS) as ProposedTermKey[]).filter(
    (key) => !PROPOSED_TERMS[key].confirmed,
  );
}
