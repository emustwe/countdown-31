"use client";

import React from "react";
import {
  Trophy,
  Crown,
  Skull,
  Swords,
  Flame,
  RotateCcw,
  Zap,
  Shield,
  Moon,
  Award,
} from "lucide-react";
import { MasterAvatar } from "./MasterAvatar";
import { useAvatarStore, type AvatarConfig } from "../../stores/avatar-customization-store";
import { type LivePlayer, type SkillType, type GameMode } from "../../lib/hooks/useCountdownLive";
import { useGameConfig } from "../../lib/hooks/useGameConfig";

interface BotProfile {
  title: string;
  streak: number;
  config: Partial<AvatarConfig>;
  trophies: number;
  level: number;
  skills: { type: SkillType; name: string; icon: React.ReactNode; badge: string; color: string }[];
}

const ALL_SKILL_META: Record<
  SkillType,
  { type: SkillType; name: string; icon: React.ReactNode; badge: string; color: string }
> = {
  rewind: {
    type: "rewind",
    name: "Chrono Rewind",
    icon: <RotateCcw size={14} className="text-cyan-300" />,
    badge: "-2 STEPS",
    color: "border-cyan-400/80 bg-cyan-950/90 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.4)]",
  },
  turbo: {
    type: "turbo",
    name: "Turbo Leap",
    icon: <Zap size={14} className="text-amber-300 fill-amber-300" />,
    badge: "+3 LEAP",
    color:
      "border-amber-400/80 bg-amber-950/90 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.4)]",
  },
  shield: {
    type: "shield",
    name: "Bovine Barrier",
    icon: <Shield size={14} className="text-purple-300 fill-purple-300" />,
    badge: "IMMUNITY",
    color:
      "border-purple-400/80 bg-purple-950/90 text-purple-300 shadow-[0_0_12px_rgba(192,132,252,0.4)]",
  },
  nudge: {
    type: "nudge",
    name: "Pasture Snooze",
    icon: <Moon size={14} className="text-emerald-300 fill-emerald-300" />,
    badge: "SKIP TURN",
    color:
      "border-emerald-400/80 bg-emerald-950/90 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.4)]",
  },
  double: {
    type: "double",
    name: "Double Trouble",
    icon: <Zap size={14} className="text-rose-300 fill-rose-300" />,
    badge: "FORCE +2",
    color: "border-rose-400/80 bg-rose-950/90 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.4)]",
  },
};

const BOT_PROFILES: Record<string, BotProfile> = {
  cpu_bessie: {
    title: "The Pasture Slayer",
    streak: 4,
    config: {
      variantId: "rusty_v1_cowboy_glasses",
      skinId: "base_bull",
      backgroundId: "lava",
      frameId: "lava_core",
      hasGlasses: true,
      hasMustache: false,
      hasCrown: false,
    },
    trophies: 1380,
    level: 15,
    skills: [ALL_SKILL_META.turbo, ALL_SKILL_META.rewind],
  },
  cpu_daisy: {
    title: "Modulo Queen 🌸",
    streak: 2,
    config: {
      variantId: "daisy_v1_cowboy",
      skinId: "base_bull",
      backgroundId: "candy",
      frameId: "candy_pop",
      hasGlasses: false,
      hasMustache: false,
      hasCrown: true,
    },
    trophies: 1190,
    level: 11,
    skills: [ALL_SKILL_META.shield, ALL_SKILL_META.nudge],
  },
  cpu_barnaby: {
    title: "Grand Champion 👑",
    streak: 7,
    config: {
      variantId: "moss_v1_cowboy_glasses",
      skinId: "base_bull",
      backgroundId: "meadow",
      frameId: "forest_vine",
      hasGlasses: true,
      hasMustache: true,
      hasCrown: true,
    },
    trophies: 1850,
    level: 25,
    skills: [ALL_SKILL_META.turbo, ALL_SKILL_META.shield],
  },
};

export function ArcadePlayerCard({
  myPlayer,
  myTurn,
  onJoinClick,
  amIn,
  gameMode = "skills",
}: {
  myPlayer: LivePlayer | null;
  myTurn: boolean;
  onJoinClick?: () => void;
  amIn: boolean;
  gameMode?: GameMode;
}) {
  const avatar = useAvatarStore();
  const { data: gameConfig } = useGameConfig();
  const isSkillMode = gameMode === "skills";

  if (!amIn || !myPlayer) {
    return (
      <div
        onClick={onJoinClick}
        className="w-full h-full min-h-[380px] flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[#192b20]/90 to-black border-2 border-amber-400/80 rounded-3xl shadow-2xl cursor-pointer hover:scale-105 transition-transform"
      >
        <div className="w-20 h-20 rounded-3xl bg-amber-500/20 border-2 border-dashed border-amber-400 flex items-center justify-center text-amber-300 font-title font-black text-2xl mb-2">
          +
        </div>
        <span className="text-xs font-title font-bold text-amber-300 uppercase tracking-widest flex items-center gap-1">
          <Crown size={14} className="text-yellow-400 fill-yellow-400" />
          <span>LOCAL PLAYER</span>
        </span>
        <span className="font-title font-black text-lg text-white mt-1">JOIN ARENA ⚔️</span>
      </div>
    );
  }

  const equipped =
    myPlayer.equippedSkills && myPlayer.equippedSkills.length > 0
      ? myPlayer.equippedSkills
      : ["rewind" as SkillType, "turbo" as SkillType];

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Top Section: Big 3D Avatar Frame + Attached Side Skills (if Skill Mode) */}
      <div className="flex items-center gap-2 sm:gap-3 justify-center h-44 sm:h-48 md:h-52">
        {/* BIG Full 3D Battle Card Avatar Showcase */}
        <div
          className={`relative w-44 h-44 sm:w-48 sm:h-48 md:w-52 md:h-52 rounded-3xl overflow-hidden shadow-[0_15px_35px_rgba(0,0,0,0.8)] border-3 transition-all ${
            myTurn
              ? "border-emerald-400 shadow-[0_0_35px_rgba(52,211,153,0.8)] scale-[1.02]"
              : "border-amber-400/70"
          }`}
        >
          <MasterAvatar
            config={avatar}
            showLevel={true}
            level={12}
            showRarity={true}
            rarityText={
              avatar.skinId === "golden_emperor"
                ? "Mythic"
                : avatar.skinId === "barnaby"
                  ? "Epic"
                  : "Common"
            }
            rarityColor={
              avatar.skinId === "golden_emperor"
                ? "#f59e0b"
                : avatar.skinId === "barnaby"
                  ? "#ef4444"
                  : "#22c55e"
            }
          />
        </div>

        {/* Attached Right Side Skills (Only displayed in Skill Mode) */}
        {isSkillMode && (
          <div className="flex flex-col gap-2 shrink-0">
            {equipped.map((skType) => {
              const baseMeta = ALL_SKILL_META[skType] ?? ALL_SKILL_META.rewind;
              const configured = gameConfig.skills.find((skill) => skill.id === skType);
              const meta = configured
                ? { ...baseMeta, name: configured.name, badge: configured.shortLabel }
                : baseMeta;
              const available = (myPlayer.skills?.[skType] ?? 0) > 0;
              return (
                <div
                  key={skType}
                  className={`flex flex-col items-center justify-center p-2 rounded-2xl border-2 transition-all select-none w-14 sm:w-16 h-20 sm:h-24 ${
                    available
                      ? `${meta.color} hover:scale-105 cursor-pointer`
                      : "border-slate-800 bg-slate-950/60 opacity-40 grayscale"
                  }`}
                  title={`${meta.name} (${available ? "Ready" : "Used"})`}
                >
                  <div className="p-1 rounded-xl bg-black/50 mb-1">{meta.icon}</div>
                  <span className="text-[9px] sm:text-[10px] font-title font-black text-center leading-tight">
                    {meta.badge}
                  </span>
                  <span className="text-[8px] font-title font-bold text-slate-400 mt-0.5">
                    {available ? "1x" : "0x"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Middle Section: Nameplate, Streak & Prestige Titles */}
      <div
        className={`w-full flex flex-col gap-1.5 bg-gradient-to-b from-[#192b20]/95 via-[#0e1a13]/98 to-[#060c08] border-2 rounded-3xl p-3 sm:p-3.5 shadow-2xl transition-all ${
          myTurn
            ? "border-emerald-400 shadow-[0_0_25px_rgba(91,227,72,0.5)]"
            : "border-amber-400/60"
        }`}
      >
        {/* Top Header Row: Crown YOU & Win Streak */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/50">
            <Crown size={12} className="text-yellow-400 fill-yellow-400" />
            <span className="text-[10px] font-title font-black text-amber-300 uppercase tracking-wider">
              YOU {myTurn && "· ⚡ TURN"}
            </span>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-950/80 border border-rose-500/50 text-rose-300 text-[10px] font-title font-black shadow">
            <Flame size={11} className="text-rose-400 fill-rose-400 animate-pulse" />
            <span>5 STREAK</span>
          </div>
        </div>

        {/* Player Name, Prestige Title & Trophies */}
        <div className="flex flex-col mt-0.5">
          <span className="font-title font-black text-base sm:text-lg text-white truncate drop-shadow">
            {myPlayer.name}
          </span>
          <span className="text-[11px] font-title font-bold text-emerald-400/90 truncate -mt-0.5">
            🏆 {avatar.title}
          </span>

          <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-white/10">
            <div className="flex items-center gap-1 text-xs font-title font-black text-amber-300 bg-black/60 px-2 py-0.5 rounded-lg border border-amber-400/30">
              <Trophy size={12} className="text-yellow-400 fill-yellow-400" />
              <span>1,250</span>
            </div>
            <span className="text-[10px] font-title font-bold text-slate-400">
              Rank #1 Champion
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Equalizer Box: Player Match Stats Dock (Matches Right Column Roster Height perfectly) */}
      <div className="w-full p-2.5 rounded-2xl bg-black/60 border border-emerald-500/30 flex flex-col gap-1.5 shadow-md">
        <div className="flex items-center justify-between px-1">
          <span className="text-[9px] font-title font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1">
            <Award size={12} />
            <span>LOCAL PASSPORT</span>
          </span>
          <span className="text-[9px] font-title text-amber-300 font-bold">
            {isSkillMode ? "🔮 SKILL MODE" : "🎲 CLASSIC 31"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 text-[11px] font-title font-bold text-slate-300">
          <div className="flex items-center justify-between px-2 py-1.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <span>Win Rate</span>
            <span className="text-emerald-400">82%</span>
          </div>
          <div className="flex items-center justify-between px-2 py-1.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <span>Best Streak</span>
            <span className="text-amber-400">🔥 9</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ArcadeOpponentCard({
  opponentPlayer,
  status,
  isOpponentTurn,
  allPlayers = [],
  currentId,
  gameMode = "skills",
}: {
  opponentPlayer: LivePlayer | null;
  status: "waiting" | "playing" | "over";
  isOpponentTurn: boolean;
  allPlayers?: LivePlayer[];
  currentId?: string | null;
  gameMode?: GameMode;
}) {
  const { data: gameConfig } = useGameConfig();
  const activeP =
    allPlayers.find((p) => p.id === currentId && p.id !== "player_local") ?? opponentPlayer;
  const oppId = activeP?.id ?? "cpu_daisy";
  const oppName = activeP?.name ?? "Daisy Cow 🌸";
  const configuredBot = gameConfig.bots.find(
    (bot) => `cpu_${bot.id}` === oppId || bot.name === activeP?.name,
  );
  const fallbackProfile = BOT_PROFILES[oppId] ?? BOT_PROFILES.cpu_daisy!;
  const profile: BotProfile = configuredBot
    ? {
        ...fallbackProfile,
        title: configuredBot.title,
        config: {
          ...fallbackProfile.config,
          variantId: configuredBot.avatarVariantId as AvatarConfig["variantId"],
        },
      }
    : fallbackProfile;
  const isSkillMode = gameMode === "skills";

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Top Section: Opponent Big 3D Avatar Frame + Attached Side Skills (if Skill Mode) */}
      <div className="flex items-center gap-2 sm:gap-3 justify-center h-44 sm:h-48 md:h-52">
        {/* BIG Full 3D Rival Battle Card Avatar Showcase */}
        <div
          className={`relative w-44 h-44 sm:w-48 sm:h-48 md:w-52 md:h-52 rounded-3xl overflow-hidden shadow-[0_15px_35px_rgba(0,0,0,0.8)] border-3 transition-all ${
            isOpponentTurn
              ? "border-cyan-400 shadow-[0_0_35px_rgba(6,182,212,0.8)] scale-[1.02]"
              : "border-purple-400/60"
          }`}
        >
          <MasterAvatar
            config={profile.config}
            showLevel={true}
            level={profile.level}
            showRarity={true}
            rarityText={profile.config.skinId === "golden_emperor" ? "Mythic" : "Epic"}
            rarityColor={profile.config.skinId === "golden_emperor" ? "#f59e0b" : "#22d3ee"}
          />
        </div>

        {/* Attached Right Side Skills for Opponent (Only in Skill Mode) */}
        {isSkillMode && (
          <div className="flex flex-col gap-2 shrink-0">
            {profile.skills.map((s) => (
              <div
                key={s.badge}
                className={`flex flex-col items-center justify-center p-2 rounded-2xl border-2 transition-all select-none w-14 sm:w-16 h-20 sm:h-24 ${s.color}`}
                title={`${s.name}`}
              >
                <div className="p-1 rounded-xl bg-black/50 mb-1">{s.icon}</div>
                <span className="text-[9px] sm:text-[10px] font-title font-black text-center leading-tight">
                  {s.badge}
                </span>
                <span className="text-[8px] font-title font-bold text-slate-400 mt-0.5">READY</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Middle Section: Nameplate & Trophies */}
      <div
        className={`w-full flex flex-col gap-1.5 bg-gradient-to-b from-[#1d1628]/95 via-[#110d1c]/98 to-[#07050b] border-2 rounded-3xl p-3 sm:p-3.5 shadow-2xl transition-all ${
          isOpponentTurn
            ? "border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.5)]"
            : "border-purple-400/50"
        }`}
      >
        {/* Top Header Row: Active Turn Banner & Streak */}
        <div className="flex items-center justify-between">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-title font-black uppercase tracking-wider ${
              isOpponentTurn
                ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                : "bg-purple-500/20 border-purple-400/50 text-purple-300"
            }`}
          >
            <Swords
              size={12}
              className={isOpponentTurn ? "text-cyan-300 animate-spin" : "text-purple-300"}
            />
            <span>{isOpponentTurn ? "⚡ ACTIVE TURN" : "ON DECK"}</span>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-950/80 border border-rose-500/50 text-rose-300 text-[10px] font-title font-black shadow">
            <Flame size={11} className="text-rose-400 fill-rose-400 animate-pulse" />
            <span>{profile.streak} STREAK</span>
          </div>
        </div>

        {/* Name, Title & Rating */}
        <div className="flex flex-col mt-0.5">
          <span className="font-title font-black text-base sm:text-lg text-white truncate drop-shadow">
            {oppName}
          </span>
          <span className="text-[11px] font-title font-bold text-cyan-300/90 truncate -mt-0.5">
            ✨ {profile.title}
          </span>

          <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-white/10">
            <div className="flex items-center gap-1 text-xs font-title font-black text-amber-300 bg-black/60 px-2 py-0.5 rounded-lg border border-amber-400/30">
              <Trophy size={12} className="text-yellow-400 fill-yellow-400" />
              <span>{profile.trophies}</span>
            </div>
            <span className="text-[10px] font-title font-bold text-slate-400">
              {isOpponentTurn ? "Thinking..." : "Ready"}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Section: 4-Player Match Roster Pill Dock */}
      {allPlayers.length > 0 && (
        <div className="w-full p-2.5 rounded-2xl bg-black/60 border border-amber-500/30 flex flex-col gap-1.5 shadow-md">
          <div className="flex items-center justify-between px-1">
            <span className="text-[9px] font-title font-black text-amber-400/80 uppercase tracking-widest flex items-center gap-1">
              <span>👥 ARENA ROSTER</span>
            </span>
            <span className="text-[9px] font-title text-emerald-400 font-bold">
              {allPlayers.filter((p) => !p.eliminated).length}/{allPlayers.length} ALIVE
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {allPlayers.map((p) => {
              const isTurn = p.id === currentId && status === "playing";
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between px-2 py-1.5 rounded-xl text-[11px] font-title font-bold border transition-colors ${
                    p.eliminated
                      ? "bg-rose-950/40 text-rose-400/60 border-rose-900/30 line-through"
                      : isTurn
                        ? "bg-emerald-950/80 text-emerald-300 border-emerald-400 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                        : "bg-slate-900/70 text-slate-300 border-slate-800"
                  }`}
                >
                  <span className="truncate max-w-[80px]">
                    {p.name.replace(/[^a-zA-Z0-9 ]/g, "")}
                  </span>
                  {p.eliminated ? (
                    <Skull size={12} className="text-rose-400 shrink-0" />
                  ) : isTurn ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shadow-[0_0_6px_#4ade80]" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
