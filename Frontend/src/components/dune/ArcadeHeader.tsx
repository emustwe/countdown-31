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
import { DEFAULT_GAME_CONFIG, type GameConfig } from "../../lib/game-config";

interface ArcadeHeaderProps {
  onOpenRules?: () => void;
  gameMode?: GameMode;
  onToggleMode?: (mode: GameMode) => void;
  showModeToggle?: boolean;
  isTournament?: boolean;
  config?: GameConfig;
}

export function ArcadeHeader({
  onOpenRules,
  gameMode = "skills",
  onToggleMode,
  showModeToggle = false,
  isTournament = false,
  config: passedConfig,
}: ArcadeHeaderProps) {
  const router = useRouter();
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const toggleSoundStore = useSettingsStore((s) => s.toggleSound);

  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = !!accessToken && !!user;
  const avatar = useAvatarStore();
  const { data: serverConfig } = useGameConfig();
  const config = passedConfig ?? (isTournament ? (serverConfig ?? DEFAULT_GAME_CONFIG) : DEFAULT_GAME_CONFIG);
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
    <header className="arcade-arena-header relative z-30 flex h-20 sm:h-24 md:h-28 w-full shrink-0 select-none items-center justify-between px-3 py-1.5 sm:px-6">
      {/* Left Mode Selector Pill (Rendered on Desktop lg+) */}
      <div className="arcade-mode-selector hidden lg:flex items-center gap-2.5 z-20">
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

      {/* Center Wide Single-Line 3D Marquee Logo Banner */}
      <div className="arcade-brand absolute left-1/2 -translate-x-1/2 top-1.5 flex flex-col items-center pointer-events-none z-10 w-full max-w-[320px] sm:max-w-[440px] md:max-w-[540px]">
        <div
          onClick={() => router.push("/home")}
          className="pointer-events-auto cursor-pointer relative w-full flex items-center justify-center gap-2 sm:gap-3 bg-gradient-to-r from-amber-950/95 via-yellow-900/95 to-amber-950/95 px-4 sm:px-8 py-1.5 sm:py-2 rounded-2xl border-2 sm:border-3 border-amber-400 shadow-[0_8px_25px_rgba(0,0,0,0.8),0_0_25px_rgba(245,158,11,0.5),inset_0_1px_2px_rgba(255,255,255,0.5)] hover:brightness-110 transition-all"
        >
          {/* Decorative Corner Rivets */}
          <span className="absolute top-1 left-1.5 w-1.5 h-1.5 rounded-full bg-amber-200 border border-amber-900" />
          <span className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-200 border border-amber-900" />
          <span className="absolute bottom-1 left-1.5 w-1.5 h-1.5 rounded-full bg-amber-200 border border-amber-900" />
          <span className="absolute bottom-1 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-200 border border-amber-900" />

          {/* Wide Single-Line Title */}
          <h1 className="font-title font-black text-lg sm:text-2xl md:text-3xl tracking-wide text-white drop-shadow-[0_3px_6px_rgba(0,0,0,0.9)] whitespace-nowrap">
            {config.branding.gameTitle}
          </h1>

          {/* 3D Golden "31" Coin Badge on the Same Line */}
          <div className="flex items-center justify-center w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 border-2 border-white shadow-[0_4px_12px_rgba(245,158,11,0.9)] shrink-0">
            <span className="font-title font-black text-sm sm:text-lg text-amber-950 drop-shadow-[0_1px_2px_rgba(255,255,255,0.6)]">
              31
            </span>
          </div>
        </div>

        {/* Subtitle Announcement Single-Line Pill */}
        {canToggle && (
          <span className="mt-1 text-[9px] sm:text-[11px] font-title font-black tracking-wider text-amber-300 uppercase bg-black/85 px-3 py-0.5 rounded-full border border-amber-400/40 shadow pointer-events-auto whitespace-nowrap truncate max-w-[90%]">
            {gameMode === "skills"
              ? `⚡ ${config.branding.announcement}`
              : "🎲 Classic Pure Counting!"}
          </span>
        )}
      </div>

      {/* Right Action Icons: Sound Toggle + Round Profile Avatar Button */}
      <div className="arcade-header-actions flex items-center gap-2.5 z-20 relative ml-auto" ref={profileMenuRef}>
        {/* Sound Toggle Button */}
        <button
          onClick={toggleSound}
          className="arcade-sound-trigger w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-b from-[#1f2b23] to-[#0a140e] border-2 border-amber-400 shadow-[0_4px_12px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.4)] flex items-center justify-center text-amber-300 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
          title={soundEnabled ? "Mute sound" : "Enable sound"}
          aria-label="Sound Toggle"
        >
          {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} className="text-slate-400" />}
        </button>

        {/* Desktop Profile Avatar Dropdown Trigger */}
        <button
          onClick={() => {
            soundManager.playClick();
            if (isAuthenticated) {
              setShowProfileMenu((v) => !v);
            } else {
              router.push("/login");
            }
          }}
          className="arcade-profile-trigger relative hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-gradient-to-b from-[#192b20] to-[#0a140e] border-2 border-amber-400/80 shadow-[0_4px_12px_rgba(0,0,0,0.6)] hover:border-amber-300 transition-all cursor-pointer"
          title={isAuthenticated ? "Open Profile Menu" : "Sign In"}
        >
          <div className="w-8 h-8 rounded-full overflow-hidden border border-amber-400/60 bg-black/60 flex items-center justify-center">
            {isAuthenticated ? (
              <MasterAvatar config={avatar} showLevel={false} showRarity={false} />
            ) : (
              <User size={16} className="text-slate-400" />
            )}
          </div>
          <span className="text-xs font-title font-bold text-white max-w-[80px] truncate">
            {isAuthenticated ? displayName : "Sign In"}
          </span>
        </button>

        {/* Desktop Dropdown Profile Menu */}
        <AnimatePresence>
          {showProfileMenu && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-14 w-72 rounded-3xl bg-gradient-to-b from-[#192b20]/98 via-[#0e1a13]/98 to-[#060c08] border-2 border-amber-400 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_25px_rgba(245,158,11,0.3)] p-3 text-white z-50 flex flex-col gap-2"
            >
              {/* User Header Profile Card */}
              <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-black/50 border border-white/10">
                <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-amber-400 bg-emerald-950 shrink-0">
                  <MasterAvatar config={avatar} showLevel={false} showRarity={false} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-title font-black text-sm text-white truncate">
                    {displayName}
                  </span>
                  <span className="text-[11px] font-title font-bold text-amber-300 truncate">
                    🏆 {avatar.title}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate">
                    {balanceDisplay}
                  </span>
                </div>
              </div>

              {/* Menu Navigation Links */}
              <div className="flex flex-col gap-1">
                {menuItems.map((item) => {
                  const Icon = menuIcons[item.icon] ?? Home;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleMenuNavigate(item.path, item.requiresAuth)}
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-title font-bold text-slate-200 hover:bg-amber-400/20 hover:text-amber-300 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon size={16} className="text-amber-400" />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight size={14} className="text-slate-500" />
                    </button>
                  );
                })}
              </div>

              {/* Logout Button */}
              <div className="pt-1 border-t border-white/10">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs font-title font-black hover:bg-rose-900/60 transition-colors cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>LOG OUT</span>
                </button>
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
