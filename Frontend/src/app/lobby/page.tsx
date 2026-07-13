"use client";

import Link from "next/link";
import { AuthGuard } from "../../components/AuthGuard";
import { AppShell } from "../../components/AppShell";
import { useGameConfig } from "../../lib/hooks/useGame";
import { useProfile } from "../../lib/hooks/useAuth";

export default function LobbyPage() {
  return (
    <AuthGuard>
      <AppShell>
        <LobbyContent />
      </AppShell>
    </AuthGuard>
  );
}

function LobbyContent() {
  const { data: profile } = useProfile();
  const { data: config } = useGameConfig();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Welcome back{profile ? `, ${profile.email}` : ""}</h1>
      <p className="mb-8 text-[var(--color-text-dim)]">Pick a game and spin — it&apos;s all play money.</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/game/aurora-ways"
          className="surface group relative overflow-hidden rounded-lg p-6 transition hover:border-[var(--color-accent)]"
        >
          <div className="mb-4 flex h-32 items-center justify-center rounded-md bg-gradient-to-br from-[var(--color-accent-2)] to-[var(--color-accent)] text-4xl">
            🎰
          </div>
          <h2 className="font-semibold">{config?.displayName ?? "Aurora Ways"}</h2>
          <p className="mt-1 text-sm text-[var(--color-text-dim)]">
            5×5 ways-to-win slot with wilds, scatters, and free spins.
          </p>
        </Link>
      </div>
    </div>
  );
}
