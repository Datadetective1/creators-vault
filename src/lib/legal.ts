import { PRODUCT_NAME } from "@/components/brand";

/**
 * Facts the Terms, Privacy Policy and Refund Policy depend on.
 *
 * Every `null` is something only the business owner can confirm. Until it is
 * filled in, the policy pages show a clearly marked "[To be confirmed: …]"
 * placeholder in its place rather than an invented value. Fill these in here
 * — each page reads from this one object.
 */
export const LEGAL = {
  productName: PRODUCT_NAME,
  siteUrl: "https://www.creatorlock.app",
  lastUpdated: "26 September 2026",

  /** The legal entity that operates Creator Lock and contracts with customers. */
  operatorName: null as string | null,
  /** Where that entity is registered, e.g. "Delaware, United States". */
  operatorJurisdiction: null as string | null,
  /**
   * A monitored inbox for support, privacy and refund requests.
   * creatorlock.app currently has no inbound mail (no MX record), so an
   * address on that domain would bounce until mail receiving is set up.
   */
  contactEmail: null as string | null,
  /** The law that governs the Terms, e.g. "the laws of the State of Delaware". */
  governingLaw: null as string | null,

  /** Service facts, taken from the running configuration. */
  freeStorage: "5 GB",
  creatorStorage: "100 GB",
  creatorPrice: "US$4 per month",
  maxFileSize: "5 GB",
  refundWindowDays: 14,
} as const;

export type LegalPlaceholderKey =
  | "operatorName"
  | "operatorJurisdiction"
  | "contactEmail"
  | "governingLaw";

export const PLACEHOLDER_LABELS: Record<LegalPlaceholderKey, string> = {
  operatorName: "legal name of the business that operates Creator Lock",
  operatorJurisdiction: "where that business is registered",
  contactEmail: "support and privacy contact email",
  governingLaw: "governing law and courts",
};

/** Which details are still missing — handy for a pre-launch check. */
export function missingLegalDetails(): LegalPlaceholderKey[] {
  return (Object.keys(PLACEHOLDER_LABELS) as LegalPlaceholderKey[]).filter(
    (key) => LEGAL[key] === null,
  );
}
