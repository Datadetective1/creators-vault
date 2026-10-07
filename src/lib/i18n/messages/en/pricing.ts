/** English pricing copy — the base language; defines the shape for hi and bn. */
export const pricing = {
  meta: {
    title: "Pricing",
    /** {product} is the product name; {price} is the Creator price with its period. */
    description: "{product} has one plan: Creator, 100 GB of private storage for {price}.",
  },
  eyebrow: "Pricing",
  /** {price} is Paddle's advertised Creator price, e.g. "₹399". */
  heading: "One plan. 100 GB. {price}/month.",
  subheadingLive: "Everything you upload stays private. Cancel any time.",
  subheadingNotLive: "Everything you upload stays private. Nothing is charged yet.",
  plans: {
    /**
     * Not a plan: what an account without an active subscription shows on its
     * dashboard. It has no storage and cannot upload.
     */
    free: {
      name: "No active plan",
      storageLabel: "Subscribe to upload",
    },
    creator: {
      name: "Creator",
      /** Follows the price figure, e.g. "₹399" + "/month". */
      pricePeriod: "/month",
      /** Under the price. */
      taxNote: "Includes GST in India. Local currency may be shown at checkout outside India.",
      tagline: "Everything you need to keep your work safe.",
      storageLabel: "100 GB",
      storageCaption: "100 GB of private storage",
      features: [
        "100 GB of private storage",
        "Upload video, photos, audio and documents",
        "Download anything, any time",
        "Private by default",
      ],
      cta: "Get started",
    },
  },
  /** {terms} and {refunds} become links. */
  footnoteLive:
    "Billed monthly through Paddle, our Merchant of Record. The final price, including any tax, is confirmed at checkout before you pay. See our {terms} and {refunds}.",
  footnoteNotLive:
    "Nothing is charged yet. Creator will be billed monthly through Paddle, our Merchant of Record, with the final price confirmed at checkout. See our {terms} and {refunds}.",
  billing: {
    heading: "How billing works",
    /** {price} is the Creator price with its period, e.g. "₹399/month". */
    price:
      "Creator is {price} in India, including GST. Outside India, checkout may show the price in your local currency, with any tax that applies.",
    paddle:
      "Payments are processed by Paddle, our Merchant of Record. In India you can pay by UPI or card; checkout shows the methods available in your country. Creator renews monthly until you cancel.",
    cancel:
      "Cancel any time from your Plan page. You keep Creator until the end of the month you have paid for. After that your account and files stay — you can view, download and delete them — but you can't upload until you subscribe again.",
    /** {refunds} and {terms} become links. */
    refunds: "Any payment can be refunded within 14 days. See our {refunds} and {terms}.",
    /** {email} becomes a mailto link. */
    questions: "Billing questions: {email}.",
  },
};

export type PricingMessages = typeof pricing;
