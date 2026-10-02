"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isCollapsed } from "../../lib/collapse-latch";

/**
 * Keeps the browser bars down across navigation.
 *
 * Next scrolls to the top on every route change, and returning to scroll 0 is exactly what makes
 * Safari restore its bars — so arriving anywhere from anywhere undid the collapse. Individual links
 * were being given `scroll: false` one at a time, which could never cover browser back, or any link
 * on a page nobody had thought to patch.
 *
 * This restores the position after the navigation instead, in one place, for every route and every
 * way of reaching it. It only acts while the bars are actually down (the latch), so a page the
 * player never collapsed is left completely alone.
 *
 * Re-applied a couple of times after the change because Next's own scroll reset lands after the
 * effect, and on iOS the layout can settle a frame or two later still.
 */
export function ScrollKeeper() {
  const pathname = usePathname();

  useEffect(() => {
    if (!isCollapsed()) return;
    const restore = () => {
      const d = document.documentElement;
      const max = d.scrollHeight - d.clientHeight;
      if (max > 0 && window.scrollY < max) window.scrollTo(0, max);
    };
    restore();
    const a = setTimeout(restore, 60);
    const b = setTimeout(restore, 260);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [pathname]);

  return null;
}
