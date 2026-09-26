import type { Metadata } from "next";

import {
  Detail,
  ExternalLink,
  LegalDocument,
  List,
  Operator,
  Proposed,
  Section,
} from "@/components/legal";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: `How refunds work for ${LEGAL.productName} paid plans.`,
};

export default function RefundsPage() {
  const name = LEGAL.productName;

  return (
    <LegalDocument
      title="Refund Policy"
      summary={`If ${name} is not right for you, we want refunds to be simple. Here is exactly how they work.`}
    >
      <Section id="window" title="1. Refund window">
        <p>
          {name} is operated by <Operator />. You can ask for a full refund of any Creator
          payment — your first one or a monthly renewal — within{" "}
          <Proposed term="refundWindowDays" /> days of being charged. You do not need to give a
          reason.
        </p>
        <p>
          After that window we do not refund the rest of a month you have started, but you can
          cancel at any time so you are not charged again. This does not affect any refund right
          you have under the law where you live.
        </p>
      </Section>

      <Section id="how" title="2. How to ask for a refund">
        <p>Use whichever is easiest:</p>
        <List>
          <li>
            Find your order at{" "}
            <ExternalLink href="https://paddle.net">paddle.net</ExternalLink> using the email on your
            receipt, and request a refund there; or
          </li>
          <li>reply to your Paddle receipt email; or</li>
          <li>
            email us at <Detail field="contactEmail" /> with the email address on your account.
          </li>
        </List>
        <p>
          Our payments are processed by Paddle, our Merchant of Record, so refunds are issued by
          Paddle to the payment method you used. They usually appear within 5–10 business days,
          depending on your bank or payment provider.
        </p>
      </Section>

      <Section id="after" title="3. What happens to your account">
        <p>
          When we refund a payment, we also cancel the subscription it belongs to, so you are not
          charged again, and your account moves to the Free plan. Your files are never deleted
          because of a refund or cancellation. If you are
          storing more than {LEGAL.freeStorage}, everything stays in your vault and you can still
          view, download and delete it — you just cannot upload more until you are back under the
          Free limit.
        </p>
      </Section>

      <Section id="cancel" title="4. Cancelling instead">
        <p>
          If you just want to stop future payments, cancel from the{" "}
          <strong className="text-cream-50">Plan</strong> page with{" "}
          <strong className="text-cream-50">Manage or cancel subscription</strong>. You keep
          Creator until the end of the month you have paid for, and you will not be charged again.
        </p>
      </Section>

      <Section id="exceptions" title="5. When we may refuse">
        <p>
          We may refuse a refund where there is clear evidence of fraud or abuse — for example,
          repeatedly buying and refunding to get around storage limits. We will always tell you why.
        </p>
      </Section>
    </LegalDocument>
  );
}
