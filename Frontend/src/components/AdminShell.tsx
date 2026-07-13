"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ADMIN_LINKS = [
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/models", label: "Math Models" },
  { href: "/admin/transactions", label: "Transactions" },
  { href: "/admin/audit-log", label: "Audit Log" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <header className="surface sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/admin/analytics" className="text-lg font-semibold tracking-tight text-[var(--color-accent)]">
            Aurora Ways — Admin
          </Link>
          <nav className="hidden gap-4 sm:flex">
            {ADMIN_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm ${
                  pathname === link.href
                    ? "text-[var(--color-text)]"
                    : "text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <Link href="/lobby" className="text-sm text-[var(--color-text-dim)] hover:text-[var(--color-text)]">
          Back to player app
        </Link>
      </header>
      <nav className="surface flex gap-4 overflow-x-auto px-6 py-2 sm:hidden">
        {ADMIN_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`whitespace-nowrap text-sm ${
              pathname === link.href ? "text-[var(--color-text)]" : "text-[var(--color-text-dim)]"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
