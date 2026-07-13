"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../stores/auth-store";

export default function RootPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const router = useRouter();

  useEffect(() => {
    router.replace(accessToken ? "/lobby" : "/login");
  }, [accessToken, router]);

  return null;
}
