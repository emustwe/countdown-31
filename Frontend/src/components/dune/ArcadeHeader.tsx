"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Crown,
  Handshake,
  History as HistoryIcon,
  Home,
  Volume2,
  VolumeX,
  Sparkles,
  Dices,
  User,
  Wallet,
  ShoppingBag,
  Settings,
  LogIn,
  LogOut,
  ChevronRight,
  Trophy,
  ShieldAlert,
} from "lucide-react";
import { useSettingsStore } from "../../stores/settings-store";
import { useAuthStore } from "../../stores/auth-store";
import { useLogout, useProfile } from "../../lib/hooks/useAuth";
import { useWallet } from "../../lib/hooks/useWallet";
import { formatUsdt } from "../../lib/money";
import { soundManager } from "../../lib/soundManager";
import { type GameMode } from "../../lib/hooks/useCountdownLive";
import { useAvatarStore } from "../../stores/avatar-customization-store";
import { MasterAvatar } from "./MasterAvatar";
import { useGameConfig } from "../../lib/hooks/useGameConfig";
import type { MenuIconId } from "../../lib/game-config";
import { MobileBottomNav } from "./MobileBottomNav";

interface ArcadeHeaderProps {
  onOpenRules?: () => void;
  gameMode?: GameMode;
  onToggleMode?: (mode: GameMode) => void;
  showModeToggle?: boolean;
}

export function ArcadeHeader({
  onOpenRules,
  gameMode = "skills",
  onToggleMode,
  showModeToggle = false,
}: ArcadeHeaderProps) {
  const router = useRouter();
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const toggleSoundStore = useSettingsStore((s) => s.toggleSound);

  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = !!accessToken && !!user;
  const avatar = useAvatarStore();
  const { data: config } = useGameConfig();
  const logoutMutation = useLogout();

  const { data: profile } = useProfile();
  const { data: wallet } = useWallet();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    if (showProfileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProfileMenu]);

  useEffect(() => {
    if (!isAuthenticated) setShowProfileMenu(false);
  }, [isAuthenticated]);

  // Only show the game mode selector if explicitly enabled or if onToggleMode is supplied
  const canToggle = showModeToggle || !!onToggleMode;

  function toggleSound() {
    toggleSoundStore();
    const next = !soundEnabled;
    soundManager.setMuted(!next);
    if (next) soundManager.playClick();
  }

  function handleNavigate(path: string) {
    soundManager.playClick();
    setShowProfileMenu(false);
    router.push(path);
  }

  function handleMenuNavigate(path: string, requiresAuth: boolean) {
    handleNavigate(
      requiresAuth && !isAuthenticated ? `/login?next=${encodeURIComponent(path)}` : path,
    );
  }

  async function handleLogout() {
    soundManager.playClick();
    setShowProfileMenu(false);
    await logoutMutation.mutateAsync();
    router.replace("/login");
  }

  const displayName = profile?.fullName || user?.fullName || "Player";
  const userInitials = displayName.slice(0, 2).toUpperCase();
  const balanceDisplay = wallet ? formatUsdt(wallet.balance) : "0.00 USDT";
  const menuIcons: Record<MenuIconId, typeof Home> = {
    home: Home,
    cow: Crown,
    trophy: Trophy,
    sponsor: Handshake,
    shop: ShoppingBag,
    profile: User,
    wallet: Wallet,
    history: HistoryIcon,
    settings: Settings,
  };
  const menuItems = config.menuItems
    .filter((item) => item.enabled)
    .sort((a, b) => a.order - b.order);

  return (
    <>
    <header className={`arcade-arena-header ${canToggle ? "is-game-header" : "is-page-header"} relative z-30 flex h-32 w-full shrink-0 select-none items-start justify-between px-3 pb-2 pt-3 sm:h-36 sm:px-8`}>
      {/* Left Mode Selector Pill (Only in Arena) */}
      <div className="arcade-mode-selector flex items-center gap-2.5 z-20 pt-1">
        {/* Mode Selector Toggle Pill - ONLY rendered on Game Arena page */}
        {canToggle && (
          <div className="flex items-center bg-black/75 border border-amber-400/50 rounded-2xl p-1 shadow-lg backdrop-blur-md">
            <button
              onClick={() => {
                soundManager.playClick();
                onToggleMode?.("classic");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-title font-black transition-all cursor-pointer ${
                gameMode === "classic"
                  ? "bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.8)] scale-102"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Dices size={14} />
              <span>CLASSIC</span>
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                onToggleMode?.("skills");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-title font-black transition-all cursor-pointer ${
                gameMode === "skills"
                  ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-[0_0_14px_rgba(168,85,247,0.8)] scale-102"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Sparkles size={14} className="text-yellow-300 fill-yellow-300 animate-pulse" />
              <span>SKILL MODE</span>
            </button>
          </div>
        )}
      </div>

      {/* Center 3D Marquee Banner: COUNT DOWN 31 (Absolute Dead Center on Screen) */}
      <div className="arcade-brand absolute left-1/2 -translate-x-1/2 top-2 flex flex-col items-center pointer-events-none z-10">
        <div
          onClick={() => router.push("/home")}
          className="pointer-events-auto cursor-pointer relative flex items-center gap-2 bg-gradient-to-r from-amber-950 via-yellow-900 to-amber-950 px-6 sm:px-10 py-2 sm:py-2.5 rounded-2xl border-2 sm:border-3 border-amber-400 shadow-[0_8px_25px_rgba(0,0,0,0.8),0_0_25px_rgba(245,158,11,0.5),inset_0_1px_2px_rgba(255,255,255,0.5)] hover:brightness-110 transition-all"
        >
          {/* Decorative Corner Rivets */}
          <span className="absolute top-1 left-1.5 w-1.5 h-1.5 rounded-full bg-amber-200 border border-amber-900" />
          <span className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-200 border border-amber-900" />
          <span className="absolute bottom-1 left-1.5 w-1.5 h-1.5 rounded-full bg-amber-200 border border-amber-900" />
          <span className="absolute bottom-1 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-200 border border-amber-900" />

          <h1 className="font-title font-black text-xl sm:text-3xl md:text-4xl tracking-wider text-white drop-shadow-[0_3px_6px_rgba(0,0,0,0.9)]">
            {config.branding.gameTitle}
          </h1>

          {/* 3D Golden "31" Shield Badge */}
          <div className="flex items-center justify-center w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 border-2 border-white shadow-[0_4px_12px_rgba(245,158,11,0.9)] -mr-1">
            <span className="font-title font-black text-lg sm:text-2xl text-amber-950 drop-shadow-[0_1px_2px_rgba(255,255,255,0.6)]">
              31
            </span>
          </div>
        </div>

        {/* Subtitle Warning Pill - ONLY shown in Game Arena */}
        {canToggle && (
          <span className="mt-1.5 text-[10px] sm:text-xs font-title font-black tracking-widest text-amber-300 uppercase bg-black/80 px-3.5 py-0.5 rounded-full border border-amber-400/40 shadow pointer-events-auto">
            {gameMode === "skills"
              ? `⚡ ${config.branding.announcement}`
              : "🎲 Classic Pure Counting!"}
          </span>
        )}
      </div>

      {/* Right Action Icons: Sound Toggle + Round Profile Avatar Button */}
      <div className="arcade-header-actions flex items-center gap-2.5 z-20 pt-1 relative" ref={profileMenuRef}>
        {/* Sound Toggle Button */}
        <button
          onClick={toggleSound}
          className="arcade-sound-trigger w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-b from-[#1f2b23] to-[#0a140e] border-2 border-amber-400 shadow-[0_4px_12px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.4)] flex items-center justify-center text-amber-300 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
          title={soundEnabled ? "Mute sound" : "Enable sound"}
          aria-label="Sound Toggle"
        >
          {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} className="text-slate-400" />}
        </button>

        {/* One menu entry point for account and player navigation. */}
        <button
          onClick={() => {
            soundManager.playClick();
            setShowProfileMenu(!showProfileMenu);
          }}
          className="arcade-profile-trigger relative w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-b from-amber-400 via-yellow-500 to-amber-700 p-0.5 shadow-[0_0_15px_rgba(245,158,11,0.6)] hover:scale-105 active:scale-95 transition-transform cursor-pointer"
          title={isAuthenticated ? "Profile & Menu" : "Menu & Sign In"}
          aria-label={isAuthenticated ? "Profile Menu" : "Player Menu"}
        >
          {isAuthenticated ? (
            <div className="w-full h-full rounded-full bg-[#0d1a12] flex items-center justify-center overflow-hidden border border-amber-200">
              <MasterAvatar
                config={{ ...avatar, backgroundId: "none", frameId: "none" }}
                className="h-full w-full rounded-full"
              />
            </div>
          ) : (
            <div className="grid h-full w-full place-items-center rounded-full border border-amber-200 bg-[#0d1a12] text-amber-300">
              <User size={20} />
            </div>
          )}

          {isAuthenticated && (
            <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full text-[8px] font-title font-black bg-gradient-to-r from-emerald-400 to-green-600 text-slate-950 border border-black shadow">
              Lv.12
            </span>
          )}
        </button>

        {/* Profile Dropdown Menu Card */}
        <AnimatePresence>
          {showProfileMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-14 flex max-h-[calc(100vh-5rem)] w-80 max-w-[calc(100vw-1rem)] flex-col gap-3 overflow-y-auto rounded-3xl border-2 border-amber-400 bg-gradient-to-b from-[#18281e]/98 via-[#0e1a13]/98 to-[#050a07] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(245,158,11,0.3)] backdrop-blur-xl z-50"
            >
              {/* Header Info */}
              <div className="flex items-center gap-3 pb-3 border-b border-amber-500/30">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-700 border border-amber-200 flex items-center justify-center text-slate-950 font-title font-black text-lg shadow">
                  {user ? userInitials : "🐮"}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-title font-black text-sm text-white truncate">
                    {displayName}
                  </span>
                  <span className="text-[11px] font-title font-semibold text-emerald-400 truncate">
                    {user ? user.email : "Playing as Guest"}
                  </span>
                </div>
              </div>

              {/* Wallet Quick View */}
              {user && (
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-black/60 border border-amber-400/40">
                  <div className="flex items-center gap-2">
                    <Wallet size={16} className="text-emerald-400" />
                    <span className="text-xs font-title font-bold text-slate-300">Balance:</span>
                  </div>
                  <span className="font-title font-black text-xs text-amber-300">
                    {balanceDisplay}
                  </span>
                </div>
              )}

              {/* Admin-configured navigation items */}
              <div className="flex flex-col gap-1 text-xs font-title font-bold">
                {menuItems.map((item) => {
                  const Icon = menuIcons[item.icon];
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleMenuNavigate(item.path, item.requiresAuth)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-200 hover:text-white hover:bg-amber-400/10 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon size={15} className="text-amber-400" />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight size={14} className="text-slate-500" />
                    </button>
                  );
                })}

                {onOpenRules && (
                  <button
                    onClick={() => {
                      soundManager.playClick();
                      setShowProfileMenu(false);
                      onOpenRules();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-200 hover:text-white hover:bg-amber-400/10 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <BookOpen size={15} className="text-amber-400" />
                      <span>How to play</span>
                    </div>
                    <ChevronRight size={14} className="text-slate-500" />
                  </button>
                )}

                {user?.role === "ADMIN" && (
                  <button
                    onClick={() => handleNavigate("/admin")}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldAlert size={15} className="text-amber-400" />
                      <span className="font-title font-black">Admin Console</span>
                    </div>
                    <ChevronRight size={14} className="text-amber-400" />
                  </button>
                )}
              </div>

              {/* Bottom Auth CTA */}
              <div className="pt-2 border-t border-slate-800">
                {user ? (
                  <button
                    onClick={handleLogout}
                    className="w-full py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/40 text-rose-300 text-xs font-title font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <LogOut size={14} />
                    <span>SIGN OUT</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleNavigate("/login")}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 text-xs font-title font-black uppercase tracking-wider shadow-[0_0_15px_rgba(245,158,11,0.5)] hover:brightness-110 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <LogIn size={14} />
                    <span>SIGN IN / REGISTER</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
    <MobileBottomNav />
    </>
  );
}
