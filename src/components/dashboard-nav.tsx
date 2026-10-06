"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/brand";
import { LanguageSelect } from "@/components/language-select";
import { signOutAction } from "@/app/actions/auth";
import { useI18n } from "@/lib/i18n/client";

export function DashboardNav({ email }: { email: string }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const n = t.common.dashboardNav;
  const tabs = [
    { href: "/dashboard", label: n.dashboard },
    { href: "/dashboard/files", label: n.files },
    { href: "/dashboard/upload", label: n.upload },
    { href: "/dashboard/billing", label: n.plan },
  ];

  return (
    <header className="border-b border-ink-800 bg-ink-900">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo href="/dashboard" />

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSelect compact />
          <span className="hidden max-w-[16rem] truncate text-sm text-muted sm:inline">
            {email}
          </span>
          <form action={signOutAction}>
            <button type="submit" className="btn-secondary px-4 py-2 text-sm">
              {n.logout}
            </button>
          </form>
        </div>
      </div>

      <nav aria-label={n.label} className="container-page">
        <ul className="-mb-px flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const active =
              tab.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(tab.href);
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "inline-block whitespace-nowrap border-b-2 border-gold-400 px-4 py-3 text-sm font-semibold text-cream-50"
                      : "inline-block whitespace-nowrap border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted transition-colors hover:text-cream-50"
                  }
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
