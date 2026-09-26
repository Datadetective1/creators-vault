import type { Metadata } from "next";
import Link from "next/link";

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
  title: "Terms of Service",
  description: `The terms that apply when you use ${LEGAL.productName}.`,
};

export default function TermsPage() {
  const name = LEGAL.productName;

  return (
    <LegalDocument
      title="Terms of Service"
      summary={`These terms are the agreement between you and us when you use ${name}. We have kept them in plain English. Please read them — by creating an account or using ${name}, you agree to them.`}
    >
      <Section id="who" title="1. Who we are">
        <p>
          {name} ({LEGAL.siteUrl}) is a product and service operated by <Operator />, a limited
          liability company registered in <Detail field="operatorJurisdiction" />. In these terms,
          &ldquo;we&rdquo;, &ldquo;us&rdquo; and &ldquo;our&rdquo; mean <Operator />, and
          &ldquo;you&rdquo; means the person using {name}.
        </p>
        <p>
          Our mailing address is <Detail field="mailingAddress" />. For help with your account,
          email <Detail field="supportEmail" />. Formal legal notices should be sent to{" "}
          <Detail field="legalEmail" />.
        </p>
      </Section>

      <Section id="service" title="2. What Creator Lock is">
        <p>
          {name} is private online storage for creators. You upload copies of your own files —
          videos, photos, thumbnails, audio, documents and similar work — and you can download or
          delete them whenever you like.
        </p>
        <p>
          {name} does not connect to Instagram, YouTube, TikTok or any other platform, does not
          import anything automatically, and never publishes or shares your files. You choose what
          to upload.
        </p>
        <p>
          {name} is in early access. We are still improving it, and features may change. We will
          tell you in advance about changes that materially reduce what you are paying for.
        </p>
      </Section>

      <Section id="eligibility" title="3. Your account">
        <List>
          <li>
            You must be at least <Proposed term="minimumAge" /> years old to use {name}, and old
            enough to enter a binding contract where you live to buy a paid plan.
          </li>
          <li>Give us a real email address you control. We use it to confirm your account and to
            contact you about the service.</li>
          <li>
            Keep your password private. You are responsible for activity on your account. Tell us
            straight away if you think someone else has access to it.
          </li>
          <li>One person per account. Do not share or resell access.</li>
        </List>
      </Section>

      <Section id="plans" title="4. Plans, payment and renewal">
        <List>
          <li>
            <strong className="text-cream-50">Free</strong> includes {LEGAL.freeStorage} of storage
            at no charge.
          </li>
          <li>
            <strong className="text-cream-50">Creator</strong> includes up to{" "}
            {LEGAL.creatorStorage} of storage for {LEGAL.creatorPrice}, plus any tax that applies
            where you live. Tax is calculated and shown at checkout before you pay.
          </li>
          <li>Individual files can be up to {LEGAL.maxFileSize}.</li>
        </List>
        <p>
          Our order process is conducted by our online reseller Paddle.com. Paddle is the Merchant
          of Record for all our orders: it takes your payment, handles tax and invoicing, and
          provides customer service for billing questions and returns. When you buy a paid plan
          you also agree to{" "}
          <ExternalLink href="https://www.paddle.com/legal/checkout-buyer-terms">
            Paddle&rsquo;s Buyer Terms
          </ExternalLink>
          . We never see or store your full card details. For billing questions, you can also
          email us at <Detail field="billingEmail" />.
        </p>
        <p>
          Creator renews automatically every month on the same day, and Paddle charges the payment
          method you chose, until you cancel. If a renewal payment fails, Paddle may retry it; if
          it cannot be collected, your account moves to the Free plan.
        </p>
        <p>
          We may change the price of a paid plan. If we do, we will email you at least{" "}
          <Proposed term="priceChangeNoticeDays" /> before the new price applies to you, and you
          can cancel before then.
        </p>
      </Section>

      <Section id="cancel" title="5. Cancelling and downgrading">
        <p>
          You can cancel at any time from the <strong className="text-cream-50">Plan</strong> page
          using <strong className="text-cream-50">Manage or cancel subscription</strong>, or from
          any Paddle receipt email. You keep Creator until the end of the period you have already
          paid for, then your account moves to Free. You will not be charged again.
        </p>
        <p>
          Moving to Free never deletes your files. If you are storing more than{" "}
          {LEGAL.freeStorage} when that happens, everything stays in your vault and you can still
          view, download and delete it — you just cannot upload more until you are back under the
          Free limit or upgrade again.
        </p>
        <p>
          Refunds are covered by our <Link href="/refunds" className="text-gold-400 underline-offset-4 hover:underline">Refund Policy</Link>.
        </p>
      </Section>

      <Section id="content" title="6. Your files belong to you">
        <p>
          You keep full ownership of everything you upload. We do not claim any rights to your
          work.
        </p>
        <p>
          You give us only the permission we need to run {name} for you: to store your files,
          keep them secure, and send them back to you when you ask. That permission ends when you
          delete the file or your account, except for copies that briefly remain in backups as
          described in our <Link href="/privacy" className="text-gold-400 underline-offset-4 hover:underline">Privacy Policy</Link>.
        </p>
        <p>
          Only upload files you own or have the right to store. You are responsible for the
          content of your vault.
        </p>
      </Section>

      <Section id="acceptable-use" title="7. What you must not do">
        <p>You must not use {name} to:</p>
        <List>
          <li>store or share anything illegal, including child sexual abuse material, which we
            report to the authorities;</li>
          <li>store material that infringes someone else&rsquo;s copyright, trademark or other
            rights;</li>
          <li>upload malware, or use the service to attack, probe or disrupt {name} or anyone
            else;</li>
          <li>get around storage limits, security controls or another person&rsquo;s account;</li>
          <li>use {name} as public file hosting or a content-delivery network, or resell it.</li>
        </List>
        <p>
          If you break these rules we may remove the content concerned and suspend or close your
          account. Where it is safe and lawful to do so, we will tell you why and give you a chance
          to respond first.
        </p>
        <p>
          If you believe material in {name} infringes your rights, write to{" "}
          <Detail field="legalEmail" /> with the details and we will look into it promptly.
        </p>
      </Section>

      <Section id="availability" title="8. Keeping your files safe">
        <p>
          We work hard to keep {name} available and your files safe, but no online service can
          promise to be uninterrupted or error-free. {name} should be one of the places your work
          lives, not the only one — please keep your own copies of anything irreplaceable.
        </p>
        <p>
          We may occasionally need to pause the service for maintenance, security or reasons
          outside our control. We will try to give notice of planned downtime.
        </p>
      </Section>

      <Section id="ending" title="9. Closing your account">
        <p>
          You can stop using {name} at any time. To close your account and delete everything in
          it, email <Detail field="supportEmail" /> from the address you signed up with.
        </p>
        <p>
          If we close your account for any reason other than a serious breach of these terms, we
          will give you at least <Proposed term="closureNoticeDays" /> notice so you can download
          your files, and refund any unused part of a paid period.
        </p>
      </Section>

      <Section id="liability" title="10. Our responsibility to you">
        <p>
          We provide {name} with reasonable care and skill. Apart from that, and to the extent the
          law allows, it is provided &ldquo;as is&rdquo; without other promises about fitness for
          a particular purpose.
        </p>
        <p>
          To the extent the law allows, we are not liable for indirect or consequential losses,
          such as lost income or business opportunities, and our total liability to you for any
          claim is limited to <Proposed term="liabilityCap" />.
        </p>
        <p>
          Nothing in these terms limits liability that cannot be limited by law, or takes away
          rights you have as a consumer under the law where you live.
        </p>
      </Section>

      <Section id="changes" title="11. Changes to these terms">
        <p>
          We may update these terms as {name} develops. If a change matters, we will email you
          before it takes effect. If you do not agree to it, you can cancel and close your account.
          The date at the top shows when these terms last changed.
        </p>
      </Section>

      <Section id="law" title="12. Law and disputes">
        <p>
          These terms are governed by <Detail field="governingLaw" />. If you have a problem,
          please contact us first at <Detail field="supportEmail" /> — most things can be sorted
          out quickly. If you are a consumer, you may also be able to bring a claim in the courts
          where you live.
        </p>
      </Section>
    </LegalDocument>
  );
}
