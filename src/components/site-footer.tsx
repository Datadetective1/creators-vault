import Link from "next/link";

import { Logo, PRODUCT_NAME } from "@/components/brand";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-ink-800 bg-ink-950">
      <div className="container-page py-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-3 text-sm leading-relaxed text-muted">
              An independent, private copy of the work behind your brand.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-12 gap-y-6 sm:grid-cols-3">
            <FooterColumn title="Product">
              <FooterLink href="/#how-it-works">How it works</FooterLink>
              <FooterLink href="/#what-you-can-protect">What you can protect</FooterLink>
              <FooterLink href="/#pricing">Pricing</FooterLink>
            </FooterColumn>

            <FooterColumn title="Account">
              <FooterLink href="/signup">Create account</FooterLink>
              <FooterLink href="/login">Login</FooterLink>
              <FooterLink href="/#faq">FAQ</FooterLink>
            </FooterColumn>

            <FooterColumn title="Support">
              <FooterLink href="/#faq">Help</FooterLink>
            </FooterColumn>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-ink-800 pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {year} {PRODUCT_NAME}. Early access pilot.
          </p>
          <p>Your files stay private. We never publish or share what you upload.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-cream-300">
        {title}
      </h3>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-sm text-muted transition-colors hover:text-cream-50">
        {children}
      </Link>
    </li>
  );
}
