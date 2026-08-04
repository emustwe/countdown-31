"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../stores/auth-store";

export default function RootPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const router = useRouter();

  useEffect(() => {
    // Signed-in players go straight to the app; everyone else sees the landing page.
    router.replace(accessToken ? "/home" : "/landing");
  }, [accessToken, router]);

  return null;
}
