"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Home, User, Trophy, ShoppingBag, Handshake, Settings, Users, Crown, History } from "lucide-react";
import { soundManager } from "../../lib/soundManager";
import { useAuthStore } from "../../stores/auth-store";
import { useAvatarStore } from "../../stores/avatar-customization-store";
import { useGameConfig } from "../../lib/hooks/useGameConfig";
import { DEFAULT_GAME_CONFIG } from "../../lib/game-config";
import { MasterAvatar } from "./MasterAvatar";
import type { LivePlayer } from "../../lib/hooks/useCountdownLive";

// Icon lookup for the admin-configured menu items — SAME source & icons as the desktop profile menu
// (ArcadeHeader), so the mobile arena menu lists exactly the same destinations everywhere.
const MENU_ICONS: Record<string, typeof Home> = {
  home: Home,
  cow: Crown,
  trophy: Trophy,
  sponsor: Handshake,
  shop: ShoppingBag,
  profile: User,
  history: History,
  settings: Settings,
};

/**
 * The mobile arena's fixed chrome — a top-right nav MENU and a single-column player ROSTER. These are
 * rendered through a PORTAL to <body> so they sit OUTSIDE the arena's CSS auto-rotate transform, which
 * means they always land at the correct SCREEN corners in both portrait and landscape (otherwise the
 * rotate transform drags them to the wrong edge). Mobile-only (`lg:hidden`).
 */
export function MobileArenaOverlay({
  players,
  currentId,
  hidden = false,
  hideRoster = false,
  onOpenChange,
}: {
  players: LivePlayer[];
  currentId: string | null;
  hidden?: boolean;
  // The classic arc board already shows the full turn order, so it suppresses this roster panel
  // (the top-right menu stays). Other boards keep it.
  hideRoster?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const avatar = useAvatarStore();
  const { data: config } = useGameConfig();
  const isAuthenticated = !!user;
  const menuItems = (config ?? DEFAULT_GAME_CONFIG).menuItems
    .filter((item) => item.enabled)
    .sort((a, b) => a.order - b.order);
  useEffect(() => setMounted(true), []);
  useEffect(() => { onOpenChange?.(open); }, [open, onOpenChange]);
  if (!mounted || hidden) return null;

  function navigate(path: string, requiresAuth: boolean) {
    soundManager.playClick();
    setOpen(false);
    router.push(requiresAuth && !isAuthenticated ? `/login?next=${encodeURIComponent(path)}` : path);
  }

  const alive = players.filter((p) => !p.eliminated).length;

  return createPortal(
    <div className="lg:hidden">
      {/* Top-right profile/menu button — styled to look EXACTLY like the desktop profile trigger
          (amber avatar ring), so the profile, sound and music icons all match desktop on mobile. */}
      <button
        type="button"
        onClick={() => { soundManager.playClick(); setOpen((o) => !o); }}
        className="fixed top-2 right-2 z-[210] w-11 h-11 rounded-full bg-gradient-to-b from-amber-400 via-yellow-500 to-amber-700 p-0.5 shadow-[0_0_15px_rgba(245,158,11,0.6)] hover:scale-105 active:scale-95 transition-transform"
        aria-label={isAuthenticated ? "Profile Menu" : "Player Menu"}
      >
        {isAuthenticated ? (
          <div className="w-full h-full rounded-full bg-[#0d1a12] flex items-center justify-center overflow-hidden border border-amber-200">
            <MasterAvatar config={{ ...avatar, backgroundId: "none", frameId: "none" }} className="h-full w-full rounded-full" />
          </div>
        ) : (
          <div className="grid h-full w-full place-items-center rounded-full border border-amber-200 bg-[#0d1a12] text-amber-300">
            <User size={20} />
          </div>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[208]" onClick={() => setOpen(false)} />
          <div className="fixed top-14 right-2 z-[211] w-52 max-h-[80vh] overflow-y-auto rounded-2xl bg-gradient-to-b from-[#15241b] to-[#070e0a] border-2 border-amber-400/70 shadow-2xl p-2 flex flex-col gap-0.5">
            {menuItems.map((m) => {
              const Icon = MENU_ICONS[m.icon] ?? Home;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => navigate(m.path, m.requiresAuth)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:bg-amber-400/15 hover:text-amber-300 font-title font-bold text-sm text-left transition-colors cursor-pointer"
                >
                  <span className="text-amber-400"><Icon size={16} /></span> {m.label}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* SINGLE-COLUMN player roster (desktop shows two columns; mobile one). Anchored to the bottom-
          right corner, low enough to clear the rival profile, and SCROLLABLE (pointer-events-auto) so
          any number of players — 5 or 100 — can be scrolled through. */}
      {!hideRoster && players.length > 1 && (
        <div className="fixed bottom-1 right-1 z-[150] w-[122px] max-h-[42vh] rounded-xl border border-amber-400/25 bg-black/75 backdrop-blur-sm p-1 flex flex-col pointer-events-auto overflow-hidden">
          <span className="flex items-center gap-1 text-[9px] font-title font-black uppercase tracking-wider text-amber-300/90 px-1 pb-1 shrink-0">
            <Users size={10} /> Roster · {alive}/{players.length}
          </span>
          <div className="flex flex-col gap-1 overflow-y-auto pr-0.5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-amber-400/40 [&::-webkit-scrollbar-thumb]:rounded-full">
            {players.map((pl) => (
              <span
                key={pl.id}
                className={`flex items-center gap-1 px-1.5 py-1 rounded-md border text-[10px] font-title font-black leading-none shrink-0 ${
                  pl.id === currentId
                    ? "border-amber-400 bg-amber-400/25 text-amber-100"
                    : pl.eliminated
                      ? "border-slate-700 bg-black/50 text-slate-500 line-through"
                      : "border-emerald-500/30 bg-black/60 text-emerald-200"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${pl.eliminated ? "bg-slate-600" : "bg-emerald-400"}`} />
                <span className="truncate">{pl.name}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
