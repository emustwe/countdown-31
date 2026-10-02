"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Sends a player who needs an account to the /login PAGE instead of opening a modal over the
 * current one.
 *
 * An overlay here sits on a page that carries the browser-bar scroll gap, and focusing a field in
 * it makes the browser scroll the page underneath — which is what made the name prompt unusable on
 * a phone and is why that one became its own route too. /login already exists, so there is nothing
 * to build around it.
 */
export function AuthRedirect({ open }: { open: boolean }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    router.push(`/login?next=${encodeURIComponent(pathname)}`, { scroll: false });
  }, [open, pathname, router]);

  return null;
}
