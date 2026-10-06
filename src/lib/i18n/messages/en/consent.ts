/**
 * The Terms / Privacy / upload-rights gate shown before a first upload.
 *
 * `agreeTerms` and `uploadRights` are the exact consent statements. In the
 * translations the meaning must stay identical; {product}, {terms} and
 * {privacy} are placeholders ({terms} and {privacy} become links).
 */
export const consent = {
  heading: "Before your first upload",
  intro:
    "Please read and accept the following. You only need to do this once — we'll ask again only if these terms change in a way that matters.",
  updatedHeading: "Our Terms have changed",
  updatedIntro:
    "We've updated our Terms of Service or Privacy Policy. Please review and accept the current version to keep uploading.",
  agreeTerms: "I agree to {product}'s {terms} and {privacy}.",
  uploadRights:
    "I confirm that I own this content or have the necessary rights and permission to store it on {product}.",
  opensInNewTab: "(opens in a new tab)",
  accept: "Accept and continue",
  saving: "Saving…",
  cancel: "Not now",
  lockedNote: "Uploading stays locked until you accept both statements.",
  cancelledNote: "No problem. Uploading stays locked until you accept.",
  reopen: "Review and accept",
  versions: "Terms version {terms} · Privacy Policy version {privacy}",
  errors: {
    stale:
      "The Terms or Privacy Policy changed while this page was open. Reload the page to review the current version.",
    generic: "We couldn't save your acceptance. Please try again.",
  },
  /** Returned by the upload API when acceptance is missing. */
  required: "Accept the Terms of Service and Privacy Policy before uploading.",
};

export type ConsentMessages = typeof consent;
