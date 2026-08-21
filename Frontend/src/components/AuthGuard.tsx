"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../stores/auth-store";

/** Client-side route guard: redirects to /login if there's no session. Zustand's persist
 * middleware hydrates from localStorage asynchronously on mount, so we wait one tick
 * before deciding — otherwise every protected page would flash-redirect on refresh. */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  // "Logged in" is decided by the persisted user, not the access token: the token is memory-only
  // now (#4) and is null on reload until it's silently re-minted from the refresh cookie.
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && !user) {
      router.replace("/login");
    }
  }, [hydrated, user, router]);

  if (!hydrated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--color-text-dim)]">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
