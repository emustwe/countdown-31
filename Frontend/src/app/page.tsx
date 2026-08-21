"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../stores/auth-store";

export default function RootPage() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  useEffect(() => {
    // Signed-in players go straight to the app; everyone else sees the landing page.
    // Gate on the persisted user (the access token is memory-only now — see auth-store #4).
    router.replace(user ? "/home" : "/landing");
  }, [user, router]);

  return null;
}
