"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "../lib/hooks/useWallet";
import { useLogout, useProfile } from "../lib/hooks/useAuth";
import { useBalanceSocket } from "../lib/hooks/useBalanceSocket";
import { formatUsdt } from "../lib/money";

const NAV_LINKS = [
  { href: "/home", label: "Home" },
  { href: "/tournaments", label: "Tournaments" },
  { href: "/wallet", label: "Wallet" },
  { href: "/history", label: "History" },
  { href: "/profile", label: "Profile" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({
  children,
  fullWidth = false,
}: {
  children: React.ReactNode;
  /** The game screen wants the board to fill most of the viewport width, well beyond the
   * normal dashboard-page reading width every other page under this shell uses. */
  fullWidth?: boolean;
}) {
  const pathname = usePathname();
  const { data: wallet } = useWallet();
  const { data: profile } = useProfile();
  const logout = useLogout();
  useBalanceSocket();

  return (
    <div className="min-h-screen">
      <header className="surface sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/home" className="font-wordmark text-lg font-black tracking-tight text-[var(--color-accent)]">
            DESERT DUNE
          </Link>
          <nav className="hidden gap-4 sm:flex">
            {NAV_LINKS.map((link) => (
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
        <div className="flex items-center gap-4">
          {profile?.role === "ADMIN" && (
            <Link href="/admin" className="text-sm text-[var(--color-accent-2)] hover:underline">
              Admin
            </Link>
          )}
          <div className="rounded-md bg-[var(--color-surface-2)] px-3 py-1.5 text-sm font-medium tabular-nums">
            {wallet ? formatUsdt(wallet.balance) : "—"}
          </div>
          <button
            onClick={() => logout.mutate()}
            className="text-sm text-[var(--color-text-dim)] hover:text-[var(--color-danger)]"
          >
            Log out
          </button>
        </div>
      </header>
      <nav className="surface flex gap-4 overflow-x-auto px-6 py-2 sm:hidden">
        {NAV_LINKS.map((link) => (
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
      <main className={`mx-auto px-6 py-8 ${fullWidth ? "max-w-[1700px]" : "max-w-5xl"}`}>{children}</main>
    </div>
  );
}
