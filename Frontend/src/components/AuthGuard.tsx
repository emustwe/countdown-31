"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "../stores/auth-store";
import { AuthGate } from "./AuthGate";
import { ArcadeHeader } from "./dune/ArcadeHeader";
import { User, LogIn, UserPlus } from "lucide-react";

/** Waits for persisted auth to load, then keeps account-owned UI private for guests in the Arcade theme. */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const [hydrated, setHydrated] = useState(() => (typeof window !== "undefined" ? useAuthStore.persist.hasHydrated() : false));

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
    }
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
      <div className="friendly-page relative w-full min-h-screen bg-[#070e0a] overflow-x-hidden flex flex-col justify-between p-2 sm:p-6 select-none text-white">
        {/* Background Pasture Atmosphere */}
        <div
          className="fixed inset-0 pointer-events-none bg-cover bg-center opacity-40 mix-blend-luminosity"
          style={{ backgroundImage: "url('/assets/barnaby/barnaby-field.jpg')" }}
        />
        <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.3)_0%,#040906_90%)]" />

        {/* Top Header */}
        <div className="relative z-20">
          <ArcadeHeader />
        </div>

        {/* Informative Arcade Card */}
        <main className="relative z-10 w-full max-w-lg mx-auto flex-1 mt-6 sm:mt-10 mb-6 flex flex-col items-center justify-center text-center p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#192b20]/95 via-[#0e1a13]/98 to-[#060c08] border-2 border-amber-400 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-300 mb-4 shadow-xl">
            <User size={32} />
          </div>
          <h1 className="font-title font-black text-2xl sm:text-3xl text-amber-300 mb-2">
            ACCOUNT REQUIRED
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
            Log in or create a player account to access live tournaments, avatar customizations, the market bazaar, and your Solana USDT vault.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
            <button
              onClick={() => router.push(`/login?next=${encodeURIComponent(pathname)}`)}
              className="flex-1 btn-arcade-3d btn-arcade-amber py-3 rounded-2xl text-sm flex items-center justify-center gap-1.5"
            >
              <LogIn size={16} />
              <span>SIGN IN</span>
            </button>
            <button
              onClick={() => router.push(`/register?next=${encodeURIComponent(pathname)}`)}
              className="flex-1 btn-arcade-3d btn-arcade-green py-3 rounded-2xl text-sm flex items-center justify-center gap-1.5"
            >
              <UserPlus size={16} />
              <span>REGISTER</span>
            </button>
          </div>
        </main>

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
