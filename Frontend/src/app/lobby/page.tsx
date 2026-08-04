"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// The lobby was removed — the game is played only inside tournaments now.
export default function LobbyRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/tournaments");
  }, [router]);
  return null;
}
