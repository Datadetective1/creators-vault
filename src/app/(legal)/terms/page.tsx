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
          &ldquo;we&rdquo;, &ldquo;us&rdquo; and &ldquo;our&rdquo; mean {name} and that company, and
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
        <p>
          You may use {name} to keep private copies of your own creative and business work, and
          to download and delete them. It is a personal storage service, not a way to publish,
          distribute or stream files to other people.
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
          <li>
            Before your first upload, we ask you to accept these terms and our Privacy Policy, and
            to confirm that you own, or have the rights to store, what you upload. We keep a record
            of that acceptance, with the version of each document and the time. If we make a
            material change to either document, we will ask you to accept the new version before
            you upload again.
          </li>
        </List>
      </Section>

      <Section id="plans" title="4. The Creator plan, payment and renewal">
        <List>
          <li>
            {name} has one plan, <strong className="text-cream-50">Creator</strong>: up to{" "}
            {LEGAL.creatorStorage} of private storage for {LEGAL.creatorPrice}.
          </li>
          <li>
            Creating an account is free, but storing files needs an active Creator subscription.
            Without one you cannot upload.
          </li>
          <li>Individual files can be up to {LEGAL.maxFileSize}.</li>
          <li>
            Outside India, checkout may show the price in your local currency. You pay the
            amount and currency shown at checkout. Depending on your country, tax is either already
            included in that price or added at checkout. If you pay in a currency other than your
            card&rsquo;s, your bank may add its own conversion fees.
          </li>
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
          it cannot be collected, the subscription ends as described in section 5.
        </p>
        <p>
          We may change the price of the Creator plan. If we do, we will email you at least{" "}
          <Proposed term="priceChangeNoticeDays" /> before the new price applies to you, and you
          can cancel before then.
        </p>
      </Section>

      <Section id="cancel" title="5. Cancelling, and when a subscription ends">
        <p>
          You can cancel at any time from the <strong className="text-cream-50">Plan</strong> page
          using <strong className="text-cream-50">Manage or cancel subscription</strong>, or from
          any Paddle receipt email. You keep Creator until the end of the period you have already
          paid for, and you will not be charged again.
        </p>
        <p>
          When a subscription ends — because you cancelled, a refund was made, or a renewal could
          not be collected — we do not delete your account or your files. You can still sign in
          and view, download and delete what you stored, but you cannot upload anything new until
          you subscribe again.
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
          You give us only a limited, non-exclusive, royalty-free permission to do what is needed
          to run {name} for you: to store your files, make the technical copies storage requires
          (such as backups), keep them secure, and send them back to you when you ask. We do not
          use your files for anything else — not for advertising, and not to train AI models. That permission ends when you
          delete the file or your account, except for copies that briefly remain in backups as
          described in our <Link href="/privacy" className="text-gold-400 underline-offset-4 hover:underline">Privacy Policy</Link>.
        </p>
        <p>
          Only upload files you own or have the necessary rights and permission to store. That
          includes making sure you are allowed to keep copies of anything featuring other people,
          or work made with or licensed from others. You are responsible for what you upload, and
          we do not review it in advance.
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
          account. We may also suspend an account straight away where we need to protect the
          service or other people, or where the law requires it. Where it is safe and lawful to do
          so, we will tell you why and give you a chance to respond first.
        </p>
        <p>
          To report abuse of {name}, email <Detail field="legalEmail" />. To report a security
          problem, email <Detail field="securityEmail" />.
        </p>
      </Section>

      <Section id="ip-complaints" title="8. Copyright and other rights complaints">
        <p>
          If you believe material stored in {name} infringes your copyright or other rights, write
          to <Detail field="legalEmail" /> with: your name and contact details; the work you
          believe is infringed; enough information for us to identify the material and the account
          (for example, where you saw it shared); a statement that you believe in good faith the
          use is not authorised; and a statement that your notice is accurate and that you are the
          rights holder or authorised to act for them.
        </p>
        <p>
          Files in {name} are private, so we will act on a complaint that identifies the material
          clearly. We may remove or restrict access to it and will tell the account holder, who can
          reply with their side. We close the accounts of people who repeatedly infringe.
        </p>
      </Section>

      <Section id="availability" title="9. Keeping your files safe">
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

      <Section id="ending" title="10. Closing your account">
        <p>
          You can stop using {name} at any time. To close your account and delete everything in
          it, email <Detail field="supportEmail" /> from the address you signed up with.
        </p>
        <p>
          If we close your account for any reason other than a serious breach of these terms, we
          will give you at least <Proposed term="closureNoticeDays" /> notice so you can download
          your files, and refund any unused prepaid period where applicable.
        </p>
        <p>
          When an account is closed, we delete its files and account data within{" "}
          <Proposed term="accountDeletionDays" />, except for records we must keep by law (such as
          billing records held by Paddle) and copies in backups that expire shortly afterwards, as
          described in our{" "}
          <Link href="/privacy" className="text-gold-400 underline-offset-4 hover:underline">
            Privacy Policy
          </Link>
          . Deleted files cannot be recovered, so download anything you want to keep first.
        </p>
      </Section>

      <Section id="liability" title="11. Our responsibility to you">
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

      <Section id="changes" title="12. Changes to these terms">
        <p>
          We may update these terms as {name} develops. If a change matters, we will email you
          before it takes effect and ask you to accept the new version before your next upload. If
          you do not agree to it, you can cancel, download your files and close your account. The
          date at the top shows when these terms last changed.
        </p>
      </Section>

      <Section id="law" title="13. Law and disputes">
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
