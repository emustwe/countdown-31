"use client";

import React, { useEffect } from "react";
import { useAuthStore } from "../stores/auth-store";
import { useLogin } from "../lib/hooks/useAuth";

/**
 * AdminGuard: Direct access wrapper for the Count Down 31 Master Administration Panel.
 * Ensures active admin session in the background for API queries while keeping the
 * UI directly accessible with zero redirects or login barriers.
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const loginMutation = useLogin();

  useEffect(() => {
    // If not authenticated as Admin, auto-authenticate in the background to supply admin bearer token
    if (!accessToken || user?.role !== "ADMIN") {
      loginMutation
        .mutateAsync({
          email: "admin@auroraways.demo",
          password: "Admin123!",
        })
        .catch(() => {
          // If backend auth is offline, mock admin session locally so UI renders seamlessly
          useAuthStore.getState().setSession({
            user: {
              id: "admin-master-id",
              email: "admin@countdown31.arcade",
              fullName: "Master Admin",
              avatarUrl: null,
              role: "ADMIN",
              status: "ACTIVE",
              createdAt: new Date().toISOString(),
              emailVerified: true,
              mfaEnabled: false,
            },
            accessToken: "dev-master-admin-token",
          });
        });
    }
  }, [accessToken, user?.role, loginMutation]);

  return <>{children}</>;
}
