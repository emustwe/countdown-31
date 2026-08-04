"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Tournament management now lives on the main admin dashboard.
export default function AdminTournamentsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin");
  }, [router]);
  return null;
}
