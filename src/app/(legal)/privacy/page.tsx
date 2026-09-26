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
  title: "Privacy Policy",
  description: `How ${LEGAL.productName} handles your personal data and your files.`,
};

export default function PrivacyPage() {
  const name = LEGAL.productName;

  return (
    <LegalDocument
      title="Privacy Policy"
      summary={`${name} exists to keep your work private, and we apply the same standard to your personal data. This policy explains what we collect, why, who helps us run the service, and the choices you have.`}
    >
      <Section id="controller" title="1. Who is responsible for your data">
        <p>
          {name} is operated by <Operator />, a limited liability company registered in{" "}
          <Detail field="operatorJurisdiction" />, which is responsible for the personal data
          described here.
        </p>
        <p>
          Our mailing address is <Detail field="mailingAddress" />. For any privacy question or
          request, contact <Detail field="contactEmail" />.
        </p>
      </Section>

      <Section id="collect" title="2. What we collect">
        <List>
          <li>
            <strong className="text-cream-50">Account details</strong> — your email address, the
            name you choose to give us (optional), and your password, which is stored only as a
            one-way hash.
          </li>
          <li>
            <strong className="text-cream-50">Your files</strong> — the files you upload, and
            information about them: file name, type, size and when you uploaded them.
          </li>
          <li>
            <strong className="text-cream-50">Subscription details</strong> — your plan, its
            status and renewal date, and the customer and subscription references Paddle gives us.
            Paddle, not us, handles your card or other payment details.
          </li>
          <li>
            <strong className="text-cream-50">Technical information</strong> — like most websites,
            our hosting and sign-in providers record your IP address, browser type and the time of
            requests, to keep the service running and secure.
          </li>
        </List>
        <p>
          We do not use advertising or analytics trackers, and we do not build profiles of you.
        </p>
      </Section>

      <Section id="use" title="3. How we use it">
        <List>
          <li>to create and secure your account, and let you sign in;</li>
          <li>to store your files and give them back to you when you ask;</li>
          <li>to apply your plan&rsquo;s storage allowance and manage your subscription;</li>
          <li>to send account emails, such as confirming your address or resetting your password,
            and important notices about the service or your plan;</li>
          <li>to prevent abuse, investigate security problems, and meet our legal obligations.</li>
        </List>
        <p>
          Where laws such as the GDPR apply, we rely on: performing our contract with you (running
          your account and vault), our legitimate interest in keeping {name} secure, and our legal
          obligations. We do not send marketing emails unless you have agreed to receive them.
        </p>
      </Section>

      <Section id="files" title="4. Your files stay private">
        <List>
          <li>Your files are stored in private storage. Each file is tied to your account, and
            access rules enforced by the database stop any other user from listing, opening or
            downloading them.</li>
          <li>Downloads use short-lived links issued only to you.</li>
          <li>Files travel over encrypted connections and are stored with a provider that
            encrypts data at rest.</li>
          <li>We do not browse, analyse, sell or share your files. Technical access is limited to
            what is needed to run the service, investigate abuse or a security problem, or comply
            with the law.</li>
        </List>
      </Section>

      <Section id="processors" title="5. Who helps us run Creator Lock">
        <p>
          We use a small number of trusted providers. Each processes data only to provide its part
          of the service:
        </p>
        <List>
          <li>
            <strong className="text-cream-50">Supabase</strong> — database, sign-in and file
            storage. Your account data and files are stored in its Mumbai, India region.{" "}
            <ExternalLink href="https://supabase.com/privacy">Privacy policy</ExternalLink>
          </li>
          <li>
            <strong className="text-cream-50">Vercel</strong> — hosts the website and app; requests
            are processed in the United States.{" "}
            <ExternalLink href="https://vercel.com/legal/privacy-policy">Privacy policy</ExternalLink>
          </li>
          <li>
            <strong className="text-cream-50">Resend</strong> — sends account emails, such as
            confirmation and password-reset messages.{" "}
            <ExternalLink href="https://resend.com/legal/privacy-policy">Privacy policy</ExternalLink>
          </li>
          <li>
            <strong className="text-cream-50">Paddle</strong> — our Merchant of Record for
            payments, tax and invoicing. When you buy a plan, Paddle collects your payment details
            directly, under its own privacy policy. Paddle&rsquo;s checkout script loads only on
            the Plan page.{" "}
            <ExternalLink href="https://www.paddle.com/legal/privacy">Privacy policy</ExternalLink>
          </li>
          <li>
            <strong className="text-cream-50">Cloudflare</strong> — provides the domain name
            service for creatorlock.app.
          </li>
        </List>
        <p>
          Because these providers operate in different countries, your data may be processed
          outside the country where you live. Where the law requires it, we rely on appropriate
          safeguards such as standard contractual clauses.
        </p>
        <p>We never sell your personal data.</p>
      </Section>

      <Section id="cookies" title="6. Cookies">
        <p>
          We use only the cookies needed to keep you signed in. They are essential for the service
          to work, so there is no cookie banner. We do not use advertising or tracking cookies.
        </p>
      </Section>

      <Section id="retention" title="7. How long we keep data">
        <List>
          <li>Your files stay until you delete them or close your account. When you delete a file,
            it is removed from active storage straight away.</li>
          <li>When you close your account, we delete your account data and files within{" "}
            <Proposed term="accountDeletionDays" />. Encrypted backups kept by our providers may
            take a short while longer to expire.</li>
          <li>Paddle keeps payment and tax records for as long as the law requires.</li>
          <li>Technical logs are kept only for as long as needed to operate and secure the
            service.</li>
        </List>
      </Section>

      <Section id="rights" title="8. Your choices and rights">
        <p>
          You can download or delete any of your files yourself, at any time. Depending on where
          you live — including under the GDPR in the EU and UK and India&rsquo;s Digital Personal
          Data Protection Act — you may also have the right to access, correct, or delete your
          personal data, to object to or restrict how it is used, and to receive a copy of it.
        </p>
        <p>
          To use any of these rights, or to close your account, email{" "}
          <Detail field="contactEmail" /> from the address you signed up with. We will reply within{" "}
          <Proposed term="privacyResponseDays" />. If you are unhappy with our answer, you can complain to your local data
          protection authority.
        </p>
      </Section>

      <Section id="children" title="9. Children">
        <p>
          {name} is not intended for anyone under <Proposed term="minimumAge" />, and we do not
          knowingly collect their data.
          If you believe a child has created an account, contact us and we will delete it.
        </p>
      </Section>

      <Section id="changes" title="10. Changes to this policy">
        <p>
          If we change this policy in a way that matters, we will email you before the change
          takes effect. The date at the top shows when it last changed.
        </p>
      </Section>
    </LegalDocument>
  );
}
