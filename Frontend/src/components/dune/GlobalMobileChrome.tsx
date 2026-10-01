"use client";

import { usePathname } from "next/navigation";
import { FullBleedPage } from "./FullBleedPage";

/** Pages that already mount their own — left exactly as they are. */
const OWN = ["/lobby", "/home"];

/**
 * Gives every other page the same collapse behaviour as the lobby and the game.
 *
 * Skipped on /admin (a dense desktop tool that wants its own scrolling) and on the pages that
 * already mount FullBleedPage themselves, so this cannot change what they do.
 *
 * The arrow is already global (mounted in layout), so this only adds the scroll gap and the lock.
 * FullBleedPage decides on its own whether locking is safe — a page with real scrollable content
 * keeps its scrolling, because freezing it would make the page unusable.
 */
export function GlobalMobileChrome() {
  const pathname = usePathname() ?? "/";
  if (pathname.startsWith("/admin")) return null;
  if (pathname.startsWith("/events")) return null; // tournament arena — mounts its own
  if (OWN.includes(pathname)) return null;
  if (pathname === "/") return null; // entry screen: one button, nothing to scroll
  return <FullBleedPage />;
}
