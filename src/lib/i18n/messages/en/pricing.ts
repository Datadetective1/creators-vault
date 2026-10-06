/** English pricing copy — the base language; defines the shape for hi and bn. */
export const pricing = {
  meta: {
    title: "Pricing",
    /** {product} is the product name; {price} is the Creator price with its period. */
    description:
      "{product} pricing: Free with 5 GB of private storage, or Creator with up to 100 GB for {price}.",
  },
  eyebrow: "Pricing",
  heading: "Start free. One simple paid plan.",
  subheadingLive: "Pilot pricing. Change plan at any time.",
  subheadingNotLive: "Pilot pricing, while we finish building. Nothing is charged yet.",
  /**
   * Per-plan display copy, keyed by plan id (src/lib/plans.ts). Numbers, limits
   * and the price figure itself stay in plans.ts; only the words live here.
   */
  plans: {
    free: {
      name: "Free",
      /** Shown where a price would be. */
      priceLabel: "Free",
      tagline: "Try it with your most important files.",
      storageLabel: "5 GB",
      storageCaption: "of private storage",
      features: [
        "5 GB of private storage",
        "Upload video, photos, audio and documents",
        "Download anything, any time",
        "Private by default",
      ],
      cta: "Start free",
    },
    creator: {
      name: "Creator",
      /** Follows the price figure, e.g. "$4" + "/month". */
      pricePeriod: "/month",
      /** Under the price: the currency and where tax is or is not included. */
      /**
       * Replaces taxNote when Paddle's pricing preview for the visitor's
       * country shows tax already inside the price. {tax} is Paddle's
       * formatted tax amount, {country} the country name.
       */
      localTaxIncluded: "Includes {tax} tax in {country}. The price at checkout is the same.",
      taxNote:
        "Shown in US dollars. In India, Creator is priced in Indian rupees. Depending on your country, tax is included or added at checkout.",
      tagline: "20 GB or 100 GB — the price is the same.",
      storageLabel: "Up to 100 GB",
      storageCaption: "Up to 100 GB — flat, however much you store",
      features: [
        "Up to 100 GB of private storage",
        "Upload video, photos, audio and documents",
        "Download anything, any time",
        "Private by default",
      ],
      cta: "Join the pilot",
    },
  },
  /** {terms} and {refunds} become links. */
  footnoteLive:
    "Pilot pricing is not final. Paid plans are billed through Paddle, our payment provider, with the price confirmed at checkout. See our {terms} and {refunds}.",
  footnoteNotLive:
    "Pilot pricing is not final and no card is charged today. Paid plans will be billed through Paddle, our payment provider, with the price confirmed at checkout. See our {terms} and {refunds}.",
  billing: {
    heading: "How billing works",
    /** {price} is the Creator price with its period, e.g. "$4/month". */
    price:
      "Creator is {price}. Paddle charges it in your local currency where one is set — Indian rupees in India, US dollars in most other countries. Depending on where you live, tax is either already included or calculated and shown at checkout before you pay.",
    paddle:
      "Payments are processed by Paddle, our Merchant of Record. In India you can pay by UPI or card; checkout shows the methods available in your country. Creator renews monthly until you cancel.",
    cancel:
      "Cancel any time from your Plan page. You keep Creator until the end of the month you have paid for, then move to Free — your files are never deleted.",
    /** {refunds} and {terms} become links. */
    refunds: "Any payment can be refunded within 14 days. See our {refunds} and {terms}.",
    /** {email} becomes a mailto link. */
    questions: "Billing questions: {email}.",
  },
};

export type PricingMessages = typeof pricing;
