"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "../lib/hooks/useAuth";
import { AuthGuard } from "./AuthGuard";

/** Nests inside AuthGuard: once we know who's logged in, also require role === ADMIN. */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <RoleCheck>{children}</RoleCheck>
    </AuthGuard>
  );
}

function RoleCheck({ children }: { children: React.ReactNode }) {
  const { data: profile, isLoading } = useProfile();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && profile && profile.role !== "ADMIN") {
      router.replace("/home");
    }
  }, [isLoading, profile, router]);

  if (isLoading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--color-text-dim)]">
        Loading…
      </div>
    );
  }
  if (profile.role !== "ADMIN") {
    return null;
  }

  return <>{children}</>;
}
