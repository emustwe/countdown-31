"use client";

import Link from "next/link";
import { usePlatformTheme } from "../lib/hooks/useTheme";
import { MonsterMascot } from "./MonsterMascot";

export const fieldLabel = "mb-1.5 block text-sm font-medium text-[var(--color-text-dim)]";
export const textInput =
  "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-accent)]";

/** Centered auth layout: a warm gradient panel on the left (brand) and the form card on the
 * right, collapsing to a single card on small screens. */
export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const { data } = usePlatformTheme();
  const monster = data?.themeFamily === "monster";
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-[var(--color-border)] shadow-[var(--shadow-pop)] md:grid-cols-2">
        {/* Brand panel */}
        <div
          className="relative hidden flex-col justify-between p-8 md:flex"
          style={{ background: "var(--gradient-brand)" }}
        >
          <Link href="/" className="font-wordmark text-2xl font-black text-white drop-shadow">
            DESERT DUNE
          </Link>
          {monster && (
            <div className="flex justify-center">
              <MonsterMascot size={170} />
            </div>
          )}
          <div>
            <p className="font-wordmark text-3xl leading-tight font-black text-white drop-shadow">
              {monster ? "Feed the beast." : "Play. Compete. Win."}
            </p>
            <p className="mt-3 max-w-xs text-sm text-white/85">
              Enter timed slot tournaments, climb the live leaderboard, and win the prize pool.
            </p>
          </div>
          <p className="text-xs text-white/70">Play responsibly. 18+.</p>
        </div>

        {/* Form panel */}
        <div className="bg-[var(--color-surface)] p-8">
          <div className="mb-6">
            <h1 className="font-wordmark text-2xl font-black text-[var(--color-accent)] md:hidden">
              DESERT DUNE
            </h1>
            <h2 className="mt-2 text-xl font-bold md:mt-0">{title}</h2>
            <p className="mt-1 text-sm text-[var(--color-text-dim)]">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
