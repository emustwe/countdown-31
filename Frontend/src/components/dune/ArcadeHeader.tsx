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
  Music,
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
  HeartHandshake,
  ExternalLink,
  Check,
  Disc,
  Zap,
  Sun,
  Gamepad2,
  Coffee,
  X,
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
import { DEFAULT_GAME_CONFIG, type GameConfig } from "../../lib/game-config";
import { TransparentVideo } from "./TransparentVideo";
import {
  campaignCauseProgress,
  resolveCampaignAssetUrl,
  sendCampaignEventsBatch,
  type TournamentCampaignManifest,
} from "../../lib/hooks/useTournamentCampaign";

interface ArcadeHeaderProps {
  onOpenRules?: () => void;
  gameMode?: GameMode;
  onToggleMode?: (mode: GameMode) => void;
  showModeToggle?: boolean;
  isTournament?: boolean;
  config?: GameConfig;
  campaign?: TournamentCampaignManifest | null;
  causePaused?: boolean;
  tournamentId?: string | null;
  campaignRevision?: number;
}

export function ArcadeHeader({
  onOpenRules,
  gameMode = "skills",
  onToggleMode,
  showModeToggle = false,
  isTournament = false,
  config: passedConfig,
  campaign = null,
  causePaused = false,
  tournamentId = null,
  campaignRevision,
}: ArcadeHeaderProps) {
  const router = useRouter();
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const toggleSoundStore = useSettingsStore((s) => s.toggleSound);
  const bgmEnabled = useSettingsStore((s) => s.bgmEnabled);
  const toggleBgmStore = useSettingsStore((s) => s.toggleBgm);
  const bgmTrack = useSettingsStore((s) => s.bgmTrack);
  const setBgmTrackStore = useSettingsStore((s) => s.setBgmTrack);
  const bgmVolume = useSettingsStore((s) => s.bgmVolume);
  const setBgmVolumeStore = useSettingsStore((s) => s.setBgmVolume);

  const [showMusicMenu, setShowMusicMenu] = useState(false);
  const musicMenuRef = useRef<HTMLDivElement>(null);

  function toggleBgm() {
    soundManager.playClick();
    toggleBgmStore();
  }

  useEffect(() => {
    soundManager.setBgmVolume(bgmVolume);
  }, [bgmVolume]);

  useEffect(() => {
    if (bgmEnabled && soundEnabled) {
      soundManager.startBgm(bgmTrack);
    } else {
      soundManager.stopBgm();
    }
  }, [bgmEnabled, soundEnabled, bgmTrack]);

  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = !!accessToken && !!user;
  const avatar = useAvatarStore();
  const { data: serverConfig } = useGameConfig();
  const config =
    passedConfig ?? (isTournament ? (serverConfig ?? DEFAULT_GAME_CONFIG) : DEFAULT_GAME_CONFIG);
  const logoutMutation = useLogout();

  const { data: profile } = useProfile();
  const { data: wallet } = useWallet();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showCause, setShowCause] = useState(false);
  const [showMobileModeMenu, setShowMobileModeMenu] = useState(false);
  const [campaignLogoFailed, setCampaignLogoFailed] = useState(false);
  const causeImpressionSent = useRef(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const mobileModeMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
        setShowCause(false);
      }
      if (musicMenuRef.current && !musicMenuRef.current.contains(event.target as Node)) {
        setShowMusicMenu(false);
      }
      if (mobileModeMenuRef.current && !mobileModeMenuRef.current.contains(event.target as Node)) {
        setShowMobileModeMenu(false);
      }
    }
    if (showProfileMenu || showCause || showMusicMenu || showMobileModeMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProfileMenu, showCause, showMusicMenu, showMobileModeMenu]);

  useEffect(() => {
    if (!isAuthenticated) setShowProfileMenu(false);
  }, [isAuthenticated]);

  // Show the game-mode selector ONLY when explicitly enabled. (Tournaments pass showModeToggle=false
  // because they are skills-only; they still pass onToggleMode, so we must not OR it in here.)
  const hasCampaign = Boolean(campaign);
  const canToggle = showModeToggle && !hasCampaign;
  const campaignCause = campaign?.cause?.enabled && !causePaused ? campaign.cause : null;
  const campaignLogoUrl = resolveCampaignAssetUrl(campaign?.logoTile.mediaUrl);

  useEffect(() => setCampaignLogoFailed(false), [campaignLogoUrl]);

  function campaignDeviceClass(): "desktop" | "tablet" | "mobile" {
    if (typeof window === "undefined") return "desktop";
    if (window.innerWidth < 640) return "mobile";
    if (window.innerWidth < 1024) return "tablet";
    return "desktop";
  }

  function recordCauseEvent(eventType: "rendered_impression" | "cause_expand" | "cta_click") {
    if (!tournamentId) return;
    void sendCampaignEventsBatch(tournamentId, {
      revision: campaignRevision,
      deviceClass: campaignDeviceClass(),
      events: [{ placement: "causeCard", eventType, count: 1 }],
    });
  }

  function toggleCause() {
    soundManager.playClick();
    const opening = !showCause;
    setShowCause(opening);
    setShowProfileMenu(false);
    if (opening) {
      if (!causeImpressionSent.current) {
        recordCauseEvent("rendered_impression");
        causeImpressionSent.current = true;
      }
      recordCauseEvent("cause_expand");
    }
  }

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
    <header
      className={`arcade-arena-header ${canToggle || hasCampaign ? "is-game-header" : "is-page-header"} relative z-30 flex h-20 w-full shrink-0 select-none items-start justify-between px-2 sm:px-8 pb-1 pt-1.5 sm:h-36`}
    >
      {/* Left Slot: Mode Selector (Desktop Arena) OR Single Heart Cause Button (Tournament) */}
      <div className="arcade-mode-selector flex items-center gap-1.5 sm:gap-2 z-20 pt-0.5 sm:pt-1">
        {/* Mode Selector - ONLY rendered on Game Arena page */}
        {canToggle && (
          <>
            {/* Desktop Mode Selector Toggle Pill */}
            <div className="desktop-mode-switch hidden sm:flex items-center bg-black/75 border border-amber-400/50 rounded-2xl p-1 shadow-lg backdrop-blur-md">
              <button
                type="button"
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
                type="button"
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

            {/* Mobile Top-Left Mode Selector Icon Button & Dropdown */}
            <div ref={mobileModeMenuRef} className="mobile-mode-picker relative sm:hidden">
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setShowMobileModeMenu(!showMobileModeMenu);
                }}
                className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-md ${
                  gameMode === "skills"
                    ? "bg-purple-950/90 border-purple-400 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.4)]"
                    : "bg-black/85 border-amber-400/80 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                }`}
                title={`Game Mode: ${gameMode === "skills" ? "Tactical Skills" : "Classic 31"}`}
                aria-label="Toggle game mode selector"
              >
                {gameMode === "skills" ? (
                  <Sparkles size={17} className="text-yellow-300 fill-yellow-300" />
                ) : (
                  <Dices size={17} className="text-amber-400" />
                )}
              </button>

              <AnimatePresence>
                {showMobileModeMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.94 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-11 z-50 flex flex-col gap-1 p-1.5 bg-black/95 backdrop-blur-xl border-2 border-amber-400/80 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.95)] min-w-[155px]"
                  >
                    <span className="text-[9px] font-title font-bold text-slate-400 px-2 py-0.5 uppercase tracking-wider">
                      GAME MODE
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        onToggleMode?.("classic");
                        setShowMobileModeMenu(false);
                      }}
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-title font-black transition-all cursor-pointer ${
                        gameMode === "classic"
                          ? "bg-amber-400 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.8)]"
                          : "bg-white/5 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Dices size={14} />
                        <span>Classic 31</span>
                      </div>
                      {gameMode === "classic" && <Check size={12} strokeWidth={3} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        onToggleMode?.("skills");
                        setShowMobileModeMenu(false);
                      }}
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-title font-black transition-all cursor-pointer ${
                        gameMode === "skills"
                          ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.8)]"
                          : "bg-white/5 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Sparkles size={14} className="text-yellow-300 fill-yellow-300" />
                        <span>Skill Mode</span>
                      </div>
                      {gameMode === "skills" && <Check size={12} strokeWidth={3} />}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}

        {/* Single Cause Heart Icon strictly on the Left */}
        {campaignCause && (
          <button
            type="button"
            onClick={toggleCause}
            className={`tournament-header-action is-cause ${showCause ? "is-open" : ""}`}
            title="Campaign cause"
            aria-label="Open campaign cause"
            aria-expanded={showCause}
          >
            <HeartHandshake size={18} />
          </button>
        )}
      </div>

      {/* Center marquee: Separate Sponsor Themed Card & Standalone '31' Badge */}
      <div className="arcade-brand absolute left-1/2 -translate-x-1/2 top-1 sm:top-2 flex flex-col items-center pointer-events-none z-10">
        {campaign ? (
          /* SPONSOR CAMPAIGN MODE: Separate Sponsor Themed Box + Standalone 3D '31' Badge */
          <div
            onClick={() => router.push("/home")}
            className="pointer-events-auto cursor-pointer flex items-center gap-2 sm:gap-3.5 select-none"
          >
            {/* Sponsor Themed Card (e.g. Moomorrow Black Card) */}
            <div
              className={`tournament-sponsor-card relative flex items-center justify-center px-4 sm:px-8 py-2 sm:py-2.5 rounded-2xl border-2 sm:border-3 border-amber-400/90 shadow-[0_8px_30px_rgba(0,0,0,0.9),0_0_25px_rgba(245,158,11,0.35),inset_0_1px_2px_rgba(255,255,255,0.3)] hover:brightness-110 transition-all bg-gradient-to-b from-[#1c1f1d] via-[#101311] to-[#080a09]`}
            >
              {/* Corner Rivets (Desktop) */}
              <span className="hidden sm:block absolute top-1 left-1.5 w-1.5 h-1.5 rounded-full bg-amber-300 border border-amber-950" />
              <span className="hidden sm:block absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-300 border border-amber-950" />
              <span className="hidden sm:block absolute bottom-1 left-1.5 w-1.5 h-1.5 rounded-full bg-amber-300 border border-amber-950" />
              <span className="hidden sm:block absolute bottom-1 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-300 border border-amber-950" />

              <div
                className={`tournament-header-sponsor sponsor-motion-${campaign.logoTile.animationPreset}`}
                aria-label={campaign.identity.sponsorName}
              >
                {campaignLogoUrl && !campaignLogoFailed ? (
                  campaign.logoTile.mediaType === "video" ? (
                    <video
                      src={campaignLogoUrl}
                      muted
                      loop
                      autoPlay
                      playsInline
                      onError={() => setCampaignLogoFailed(true)}
                    />
                  ) : (
                    <img
                      src={campaignLogoUrl}
                      alt={campaign.identity.sponsorName}
                      onError={() => setCampaignLogoFailed(true)}
                    />
                  )
                ) : (
                  <span>{campaign.logoTile.logoText || campaign.identity.sponsorName}</span>
                )}
              </div>
            </div>

            {/* Standalone 3D Golden "31" Shield Badge */}
            <div className="flex items-center justify-center w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 border-2 sm:border-3 border-white shadow-[0_6px_20px_rgba(245,158,11,0.95),inset_0_1px_2px_rgba(255,255,255,0.7)] hover:scale-105 transition-transform shrink-0">
              <span className="font-title font-black text-base sm:text-2xl text-amber-950 drop-shadow-[0_1px_2px_rgba(255,255,255,0.6)]">
                31
              </span>
            </div>
          </div>
        ) : (
          /* STANDARD CLASSIC ARENA MODE: Unified Title Box */
          <div
            onClick={() => router.push("/home")}
            className="pointer-events-auto cursor-pointer relative flex items-center justify-center gap-2 sm:gap-2.5 bg-gradient-to-r from-amber-950 via-yellow-900 to-amber-950 px-6 sm:px-10 py-2 sm:py-2.5 rounded-2xl border-2 sm:border-3 border-amber-400 shadow-[0_8px_25px_rgba(0,0,0,0.8),0_0_25px_rgba(245,158,11,0.5),inset_0_1px_2px_rgba(255,255,255,0.5)] hover:brightness-110 transition-all"
          >
            {/* Decorative Corner Rivets (Desktop) */}
            <span className="hidden sm:block absolute top-1 left-1.5 w-1.5 h-1.5 rounded-full bg-amber-200 border border-amber-900" />
            <span className="hidden sm:block absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-200 border border-amber-900" />
            <span className="hidden sm:block absolute bottom-1 left-1.5 w-1.5 h-1.5 rounded-full bg-amber-200 border border-amber-900" />
            <span className="hidden sm:block absolute bottom-1 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-200 border border-amber-900" />

            <h1 className="font-title font-black text-xl sm:text-3xl md:text-4xl tracking-wider text-white drop-shadow-[0_3px_6px_rgba(0,0,0,0.9)]">
              {config.branding.gameTitle}
            </h1>

            {/* 3D Golden "31" Shield Badge */}
            <div className="flex items-center justify-center w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 border-2 border-white shadow-[0_4px_12px_rgba(245,158,11,0.9)] -mr-1 shrink-0">
              <span className="font-title font-black text-base sm:text-2xl text-amber-950 drop-shadow-[0_1px_2px_rgba(255,255,255,0.6)]">
                31
              </span>
            </div>
          </div>
        )}

        {/* Subtitle Warning Pill - ONLY shown in Game Arena */}
        {(canToggle || campaign) && (
          <span className="mt-1 text-[10px] sm:text-xs font-title font-black tracking-wider text-amber-300 uppercase bg-black/85 px-3.5 py-0.5 rounded-full border border-amber-400/40 shadow pointer-events-auto whitespace-nowrap">
            {campaign
              ? `${campaign.identity.disclosureLabel} ${campaign.identity.sponsorName}`
              : gameMode === "skills"
                ? `⚡ ${config.branding.announcement}`
                : "🎲 Classic Pure Counting!"}
          </span>
        )}
      </div>

      {/* Right Action Icons: Mode Switch + Sound Toggle + Round Profile Avatar Button */}
      <div
        className="arcade-header-actions flex items-center gap-2.5 z-20 pt-1 relative"
        ref={profileMenuRef}
      >
        {hasCampaign && showModeToggle && (
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              onToggleMode?.(gameMode === "skills" ? "classic" : "skills");
            }}
            className={`tournament-header-action ${gameMode === "skills" ? "is-skills" : "is-classic"}`}
            title={`Game mode: ${gameMode === "skills" ? "Skills" : "Classic"}. Click to switch.`}
            aria-label={`Game mode: ${gameMode === "skills" ? "Skills" : "Classic"}`}
          >
            {gameMode === "skills" ? <Sparkles size={20} /> : <Dices size={20} />}
          </button>
        )}

        {/* Music (BGM) Button & Interactive Track / Volume Popover */}
        <div className="relative" ref={musicMenuRef}>
          <button
            onClick={() => {
              soundManager.playClick();
              setShowMusicMenu((prev) => !prev);
            }}
            className={`arcade-bgm-trigger w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer select-none ${
              bgmEnabled && soundEnabled
                ? "bg-gradient-to-b from-emerald-900 via-emerald-800 to-black border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.7),inset_0_1px_2px_rgba(255,255,255,0.4)]"
                : "bg-gradient-to-b from-[#1f2b23] to-[#0a140e] border-amber-400/40 text-slate-400 shadow-[0_4px_12px_rgba(0,0,0,0.6)] opacity-70"
            }`}
            title="Music Settings & Tracks"
            aria-label="Music Settings"
          >
            <Music
              size={19}
              className={
                bgmEnabled && soundEnabled ? "animate-pulse text-emerald-300" : "text-slate-500"
              }
            />
          </button>

          <AnimatePresence>
            {showMusicMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 8 }}
                className="absolute right-0 top-[calc(100%+10px)] z-50 w-72 sm:w-80 rounded-2xl border-2 border-amber-400/80 bg-gradient-to-b from-[#16271c] via-[#0c1811] to-[#050b07] p-4 text-white shadow-[0_12px_36px_rgba(0,0,0,0.9)] backdrop-blur-xl select-none flex flex-col gap-3.5"
                role="dialog"
                aria-label="Music and Sound Controls"
              >
                {/* Header: Title & Quick Master Mute */}
                <div className="flex items-center justify-between border-b border-amber-400/30 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Music size={16} className="text-amber-400" />
                    <span className="font-title font-black text-sm tracking-wider text-amber-300">
                      MUSIC & AUDIO
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      toggleBgmStore();
                    }}
                    className={`px-2.5 py-1 rounded-full text-xs font-title font-bold transition-all cursor-pointer ${
                      bgmEnabled
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/60 shadow-[0_0_10px_rgba(52,211,153,0.3)]"
                        : "bg-slate-800 text-slate-400 border border-slate-700"
                    }`}
                  >
                    {bgmEnabled ? "MUSIC ON" : "MUTED"}
                  </button>
                </div>

                {/* BGM Volume Slider */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs font-title">
                    <span className="text-slate-300 font-bold">MUSIC VOLUME</span>
                    <span className="text-amber-300 font-black">
                      {Math.round(bgmVolume * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <VolumeX size={15} className="text-slate-500 shrink-0" />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={Math.round(bgmVolume * 100)}
                      onChange={(e) => {
                        const val = Number(e.target.value) / 100;
                        setBgmVolumeStore(val);
                        soundManager.setBgmVolume(val);
                      }}
                      className="w-full h-2 bg-black/60 rounded-lg appearance-none cursor-pointer accent-emerald-400 border border-amber-400/40"
                    />
                    <Volume2 size={16} className="text-amber-400 shrink-0" />
                  </div>
                </div>

                {/* BGM Track Selector */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-title font-bold text-slate-300">
                      SELECT MUSIC TRACK
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono">7 SOUNDTRACKS</span>
                  </div>

                  <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1">
                    {[
                      {
                        id: "arcade" as const,
                        name: "Arcade Party Groove",
                        desc: "136 BPM Mastered Party Beat",
                        icon: Disc,
                        activeBorder: "border-emerald-400",
                        activeBg: "bg-gradient-to-r from-emerald-950/80 to-emerald-900/60",
                        activeText: "text-emerald-200",
                        iconColor: "text-emerald-400",
                        shadow: "shadow-[0_0_12px_rgba(52,211,153,0.35)]",
                      },
                      {
                        id: "vegas" as const,
                        name: "Vegas Casino Funk",
                        desc: "128 BPM Disco House & Slap Bass",
                        icon: Sparkles,
                        activeBorder: "border-amber-400",
                        activeBg: "bg-gradient-to-r from-amber-950/80 to-amber-900/60",
                        activeText: "text-amber-200",
                        iconColor: "text-amber-400",
                        shadow: "shadow-[0_0_12px_rgba(251,191,36,0.35)]",
                      },
                      {
                        id: "synthwave" as const,
                        name: "Cyber Synthwave 80s",
                        desc: "125 BPM Retro Synth & Running Bass",
                        icon: Zap,
                        activeBorder: "border-cyan-400",
                        activeBg: "bg-gradient-to-r from-cyan-950/80 to-blue-900/60",
                        activeText: "text-cyan-200",
                        iconColor: "text-cyan-400",
                        shadow: "shadow-[0_0_12px_rgba(34,211,238,0.35)]",
                      },
                      {
                        id: "tropical" as const,
                        name: "Tropical Beach Party",
                        desc: "120 BPM Calypso Marimba & Bouncy Bass",
                        icon: Sun,
                        activeBorder: "border-yellow-400",
                        activeBg: "bg-gradient-to-r from-yellow-950/80 to-orange-900/60",
                        activeText: "text-yellow-200",
                        iconColor: "text-yellow-400",
                        shadow: "shadow-[0_0_12px_rgba(250,204,21,0.35)]",
                      },
                      {
                        id: "vip" as const,
                        name: "High-Stakes VIP Club",
                        desc: "130 BPM Electro House & Saw Stabs",
                        icon: Crown,
                        activeBorder: "border-fuchsia-400",
                        activeBg: "bg-gradient-to-r from-fuchsia-950/80 to-purple-900/60",
                        activeText: "text-fuchsia-200",
                        iconColor: "text-fuchsia-400",
                        shadow: "shadow-[0_0_12px_rgba(232,121,249,0.35)]",
                      },
                      {
                        id: "chiptune" as const,
                        name: "8-Bit Retro Chiptune",
                        desc: "144 BPM Fast Gamified Pixel Arcade",
                        icon: Gamepad2,
                        activeBorder: "border-rose-400",
                        activeBg: "bg-gradient-to-r from-rose-950/80 to-red-900/60",
                        activeText: "text-rose-200",
                        iconColor: "text-rose-400",
                        shadow: "shadow-[0_0_12px_rgba(251,113,133,0.35)]",
                      },
                      {
                        id: "lofi" as const,
                        name: "Lofi Chill Hop Pasture",
                        desc: "90 BPM Warm Jazz Rhodes & Vinyl Swing",
                        icon: Coffee,
                        activeBorder: "border-teal-400",
                        activeBg: "bg-gradient-to-r from-teal-950/80 to-emerald-900/60",
                        activeText: "text-teal-200",
                        iconColor: "text-teal-400",
                        shadow: "shadow-[0_0_12px_rgba(45,212,191,0.35)]",
                      },
                    ].map((trackItem) => {
                      const IconComponent = trackItem.icon;
                      const isActive = bgmTrack === trackItem.id;
                      return (
                        <button
                          key={trackItem.id}
                          type="button"
                          onClick={() => {
                            soundManager.playClick();
                            setBgmTrackStore(trackItem.id);
                          }}
                          className={`p-2 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                            isActive
                              ? `${trackItem.activeBg} ${trackItem.activeBorder} ${trackItem.activeText} ${trackItem.shadow}`
                              : "bg-black/40 border-slate-700/60 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <IconComponent
                              size={16}
                              className={
                                isActive ? `${trackItem.iconColor} animate-pulse` : "text-slate-500"
                              }
                            />
                            <div>
                              <p className="font-title font-bold text-xs text-white leading-tight">
                                {trackItem.name}
                              </p>
                              <p className="text-[10px] text-slate-400 font-medium leading-tight">
                                {trackItem.desc}
                              </p>
                            </div>
                          </div>
                          {isActive && (
                            <Check size={15} className={`${trackItem.iconColor} shrink-0`} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sound SFX Toggle Button */}
        <button
          onClick={toggleSound}
          className="arcade-sound-trigger w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-b from-[#1f2b23] to-[#0a140e] border-2 border-amber-400 shadow-[0_4px_12px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.4)] flex items-center justify-center text-amber-300 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
          title={soundEnabled ? "Mute Sound SFX" : "Enable Sound SFX"}
          aria-label="Sound Toggle"
        >
          {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} className="text-slate-400" />}
        </button>

        <AnimatePresence>
          {showCause && campaignCause && campaign && (
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 8 }}
              className="tournament-cause-popover"
              role="dialog"
              aria-modal="false"
              aria-label={campaignCause.title}
            >
              <button
                type="button"
                className="tournament-cause-close"
                onClick={toggleCause}
                aria-label="Close campaign cause"
              >
                <X size={15} />
              </button>
              <small>{campaignCause.label}</small>
              <strong>{campaignCause.title}</strong>
              <span>For {campaignCause.beneficiaryName}</span>
              <p>{campaignCause.message}</p>
              {campaignCause.showProgress && (
                <div className="tournament-cause-progress">
                  <div>
                    <i style={{ width: `${campaignCauseProgress(campaignCause)}%` }} />
                  </div>
                  <b>
                    {campaignCause.raisedAmount.toLocaleString()} /{" "}
                    {campaignCause.targetAmount.toLocaleString()} {campaignCause.currency}
                  </b>
                </div>
              )}
              {campaignCause.ctaUrl && (
                <a
                  href={campaignCause.ctaUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  onClick={() => recordCauseEvent("cta_click")}
                >
                  {campaignCause.ctaLabel}
                  <ExternalLink size={12} />
                </a>
              )}
              <em>Information only · Opens an external site</em>
            </motion.div>
          )}
        </AnimatePresence>

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
  );
}
