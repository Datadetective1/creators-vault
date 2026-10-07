/**
 * English dashboard copy — the base language; defines the shape for hi and bn.
 *
 * Page titles reuse common.dashboardNav, so the tab title always matches the
 * nav label. {placeholders} are filled with fmt().
 */
export const dashboard = {
  status: {
    active: "Active",
    trialing: "Trial",
    past_due: "Payment overdue",
    paused: "Paused",
    canceled: "Cancelled",
    inactive: "Inactive",
  },
  uploadFiles: "Upload files",
  currentPlan: "Current plan",
  fileOne: "file",
  fileMany: "files",
  overview: {
    welcome: "Welcome back",
    welcomeNamed: "Welcome back, {name}",
    intro: "Here is everything you currently have protected.",
    filesProtected: "Files protected",
    storageUsed: "Storage used",
    ofTotal: "of {total}",
    recentFiles: "Recent files",
    viewAll: "View all",
    noPlan: "You don't have an active plan. Subscribe to Creator to start uploading.",
    subscribe: "See the Creator plan",
  },
  files: {
    empty: "Nothing here yet.",
    countOne: "{count} file protected.",
    countMany: "{count} files protected.",
  },
  upload: {
    intro: "Files are private to your account. Nobody else can see or download them.",
    subscribeTitle: "Subscribe to start uploading",
    subscribeBody: "Uploads are part of the Creator plan: 100 GB of private storage for {price}/month. Your account is free to keep — you only pay to store files.",
    subscribeCta: "See the Creator plan",
  },
  billing: {
    heading: "Your plan",
    intro: "One plan: 100 GB of private storage for a monthly price.",
    checkoutComplete:
      "Payment received. Your plan updates as soon as Paddle confirms it — usually within a minute. Refresh this page to see it.",
    cancelScheduled:
      "Cancelled — you keep {plan} until {date}. After that your files stay in your account, but you can't upload new ones unless you subscribe again. You will not be charged again.",
    renewsOn: "Renews on {date}.",
    accessEndsOn: "Access ends on {date}.",
    manageHeading: "Cancel or update payment",
    manageBody:
      "Your subscription is managed by Paddle, our payment provider. If you cancel, your files stay in your account and remain downloadable, but uploading stops at the end of your billing period.",
    manageButton: "Manage or cancel subscription",
    opening: "Opening…",
    portalFailed: "Could not open billing.",
  },
  planPicker: {
    notEnabled:
      "Subscriptions are not switched on for this deployment yet.",
    current: "Current",
    yourPlan: "Your plan",
    opening: "Opening…",
    loadingCheckout: "Loading checkout…",
    switchTo: "Subscribe to {plan}",
    loadFailed: "Checkout could not be loaded. Please refresh and try again.",
    startFailed: "Could not start checkout.",
    stillLoading: "Checkout is still loading. Please try again in a moment.",
    legalNote:
      "Payments are processed by Paddle, our Merchant of Record. Prices are shown in your local currency where Paddle offers one, and tax is either included or shown at checkout before you pay. {plan} renews monthly until you cancel, and any payment can be refunded within 14 days. See our {terms} and {refunds}.",
    billingQuestions: "Billing questions: {email}.",
  },
  storage: {
    label: "Storage used",
    ofTotal: "of {total}",
    nearLimit: "You are almost out of space. Delete files you no longer need.",
    noPlan: "No active plan",
  },
  table: {
    kinds: {
      image: "Photo",
      video: "Video",
      audio: "Audio",
      document: "Document",
      other: "File",
    },
    file: "File",
    type: "Type",
    size: "Size",
    uploaded: "Uploaded",
    actions: "Actions",
    download: "Download",
    delete: "Delete",
    deleting: "Deleting…",
    confirmDelete: "Delete \"{name}\" permanently? This cannot be undone.",
    deleteFailed: "Could not delete that file.",
    emptyTitle: "No files yet",
    emptyHint: "Upload the videos, photos and files your business would miss most.",
    uploadFirst: "Upload your first file",
  },
  uploader: {
    dropTitle: "Drag files here",
    dropHint: "Videos, photos, audio and documents. Up to 5 GB per file.",
    choose: "Choose files",
    uploading: "Uploading…",
    uploadOne: "Upload {count} file",
    uploadMany: "Upload {count} files",
    clear: "Clear list",
    doneCount: "{count} saved to My Files",
    ready: "Ready",
    done: "Done",
    failed: "Failed",
    startFailed: "Could not start that upload.",
    saveFailed: "Could not save that file.",
    uploadFailed: "Upload failed.",
    uploadFailedStatus: "Upload failed ({status}).",
    networkError: "Network error during upload.",
    cancelled: "Upload cancelled.",
    /** Client-side checks; mirrors checkFile() in src/lib/validation.ts. */
    unknownType: "unknown",
    fileErrors: {
      empty: "This file appears to be empty.",
      too_large: "This file is larger than the 5 GB per-file limit.",
      unsupported_type: "Files of type \"{type}\" are not supported.",
      no_extension: "The file name needs an extension, such as .mp4 or .jpg.",
      extension_mismatch: "The extension \".{extension}\" does not match the file type \"{type}\".",
    },
  },
  /** Chosen by the `code` on an API error body. */
  apiErrors: {
    not_found: "That file could not be found. Refresh the page and try again.",
    quota_exceeded:
      "This upload would go over your 100 GB. Delete some files to make room.",
    invalid: "That request was not valid. Please check and try again.",
    subscription_required: "Uploading needs an active Creator subscription.",
  },
};

export type DashboardMessages = typeof dashboard;
