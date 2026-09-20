"use client";

import { usePathname } from "next/navigation";
import { AuthGuard } from "./AuthGuard";

const ACCOUNT_ROUTES = [
  "/avatar",
  "/avatar-styles",
  "/shop",
  "/history",
  "/settings",
  "/events",
];

function isAccountRoute(pathname: string): boolean {
  return ACCOUNT_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function ProtectedRouteBoundary({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return isAccountRoute(pathname) ? <AuthGuard>{children}</AuthGuard> : <>{children}</>;
}
