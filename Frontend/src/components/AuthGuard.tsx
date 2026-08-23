"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "../stores/auth-store";
import { AuthGate } from "./AuthGate";

/** Waits for persisted auth to load, then keeps account-owned UI private for guests. */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(useAuthStore.persist.hasHydrated());
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070e0a] text-amber-300 font-title font-bold">
        Loading…
      </div>
    );
  }

  if (!accessToken || !user) {
    return (
      <div className="min-h-screen bg-[#070e0a]">
        <AuthGate
          open
          next={pathname}
          onClose={() => router.replace("/home")}
          title="Your account is needed"
          message="Log in or create an account to open this page. You can still play the game as a guest."
        />
      </div>
    );
  }

  return <>{children}</>;
}
