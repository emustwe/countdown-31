"use client";

import React, { useState } from "react";
import { Crown, Sparkles, RefreshCw, Check, Flame, Trophy, Shield, Zap, Sliders, Move, Maximize2, RotateCw } from "lucide-react";
import Link from "next/link";
import { useAvatarStore, type AvatarConfig } from "../../stores/avatar-customization-store";

interface BaseSkinOption {
  id: AvatarConfig["skinId"];
  name: string;
  image: string;
  rarity: "Common" | "Epic" | "Mythic";
  color: string;
  isCustomizable: boolean;
}

interface TransformOffset {
  x: number; // percentage offset X
  y: number; // percentage offset Y
  scale: number; // scale multiplier
  rotate: number; // degrees
}

const BASE_SKINS: BaseSkinOption[] = [
  {
    id: "base_bull",
    name: "Classic Bull (Customizable)",
    image: "/assets/master/base_bull_1024.png",
    rarity: "Common",
    color: "#22c55e",
    isCustomizable: true,
  },
  {
    id: "golden_emperor",
    name: "The Golden Emperor 👑",
    image: "/assets/Avatar1",
    rarity: "Mythic",
    color: "#f59e0b",
    isCustomizable: false,
  },
  {
    id: "barnaby",
    name: "Barnaby Champion 🐮",
    image: "/assets/barnaby/barnaby-field.jpg",
    rarity: "Epic",
    color: "#ef4444",
    isCustomizable: false,
  },
];

const BACKGROUND_OPTIONS: { id: AvatarConfig["backgroundId"]; name: string; gradient: string }[] = [
  { id: "emerald", name: "Emerald Pasture", gradient: "bg-gradient-to-b from-[#0e2a1b] via-[#08170e] to-[#040c07]" },
  { id: "golden", name: "Golden Sunburst", gradient: "bg-gradient-to-b from-[#3a2806] via-[#1a1203] to-[#0a0701]" },
  { id: "cyber", name: "Cyber Neon Grid", gradient: "bg-gradient-to-b from-[#0a1f2e] via-[#040e16] to-[#010508]" },
  { id: "inferno", name: "Crimson Magma", gradient: "bg-gradient-to-b from-[#350d14] via-[#170508] to-[#0a0203]" },
  { id: "obsidian", name: "Obsidian Void", gradient: "bg-gradient-to-b from-[#161616] via-[#0a0a0a] to-[#000000]" },
];

const FRAME_OPTIONS: { id: AvatarConfig["frameId"]; name: string; src: string }[] = [
  { id: "mythic_gold", name: "Mythic Gold Dragon 👑", src: "/assets/master/frame_mythic_gold_1024.png" },
  { id: "neon_glacier", name: "Diamond Frost Glacier ❄️", src: "/assets/master/frame_neon_glacier_1024.png" },
  { id: "inferno", name: "Inferno Magma Flame 🔥", src: "/assets/master/frame_inferno_1024.png" },
  { id: "emerald", name: "Emerald Royale 🍀", src: "/assets/master/frame_emerald_1024.png" },
];

const DEFAULT_OFFSETS: Record<"crown" | "glasses" | "mustache", TransformOffset> = {
  crown: { x: 0, y: 0, scale: 1.0, rotate: 0 },
  glasses: { x: 0, y: 0, scale: 1.0, rotate: 0 },
  mustache: { x: 0, y: 0, scale: 1.0, rotate: 0 },
};

export function AvatarStudio() {
  const avatar = useAvatarStore();
  const [activeTab, setActiveTab] = useState<"wearables" | "fine_tune" | "backgrounds" | "skins" | "frames">("wearables");
  const [activeRigItem, setActiveRigItem] = useState<"crown" | "glasses" | "mustache">("glasses");

  // Fine-tuning offsets for live adjustment
  const [offsets, setOffsets] = useState(DEFAULT_OFFSETS);

  const isCustomizable = avatar.skinId === "base_bull";
  const currentBg = BACKGROUND_OPTIONS.find((b) => b.id === avatar.backgroundId) ?? BACKGROUND_OPTIONS[0]!;
  const currentFrame = FRAME_OPTIONS.find((f) => f.id === avatar.frameId) ?? FRAME_OPTIONS[0]!;

  function updateOffset(item: "crown" | "glasses" | "mustache", field: keyof TransformOffset, val: number) {
    setOffsets((prev) => ({
      ...prev,
      [item]: {
        ...prev[item],
        [field]: val,
      },
    }));
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-3 sm:p-6 flex flex-col gap-5 text-white select-none">
      {/* Header Marquee */}
      <div className="flex items-center justify-between bg-black/75 border-2 border-amber-500/40 rounded-3xl px-5 sm:px-6 py-4 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
            <Crown size={24} className="fill-yellow-400 text-yellow-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-title font-black text-amber-300 tracking-wide flex items-center gap-2 flex-wrap">
              <span>AVATAR STUDIO & CALIBRATION</span>
              <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black">
                MASTER ENGINE
              </span>
            </h1>
            <p className="text-xs text-amber-200/80 font-semibold">
              Master 1024×1024 Compositor with Live Transform & Scale Gizmo!
            </p>
          </div>
        </div>

        <Link
          href="/home"
          className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 border border-emerald-300 text-slate-950 font-title font-black text-xs sm:text-sm shadow-[0_4px_15px_rgba(34,197,94,0.6)] hover:brightness-110 active:scale-95 transition-all shrink-0 flex items-center gap-1.5"
        >
          <span>ENTER ARENA ⚔️</span>
        </Link>
      </div>

      {/* Main Studio Workspace: 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* Left Column: Live 1024x1024 Master Battle Card Preview */}
        <div className="lg:col-span-5 flex flex-col items-center gap-4 bg-gradient-to-b from-[#132019]/90 via-[#0a1410]/95 to-[#050b08]/98 border-2 border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl">
          <span className="text-xs font-title font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles size={14} className="text-yellow-400 fill-yellow-400" />
            <span>LIVE BATTLE CARD PREVIEW</span>
          </span>

          {/* Master 1:1 Aspect-Ratio Canvas Container */}
          <div
            className={`relative w-64 sm:w-72 md:w-80 aspect-square rounded-3xl overflow-hidden shadow-2xl ${currentBg.gradient}`}
          >
            {/* Layer 0: Background Radial Glow */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.18)_0%,transparent_70%)]" />

            {/* Layer 1: Base Character Skin */}
            {avatar.skinId === "base_bull" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/assets/master/base_bull_1024.png"
                alt="Base Bull"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              />
            )}
            {avatar.skinId === "golden_emperor" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/assets/Avatar1"
                alt="The Golden Emperor"
                className="absolute inset-0 w-full h-full object-cover object-top pointer-events-none"
              />
            )}
            {avatar.skinId === "barnaby" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/assets/barnaby/barnaby-field.jpg"
                alt="Barnaby Mascot"
                className="absolute inset-0 w-full h-full object-cover object-top pointer-events-none"
              />
            )}

            {/* Layer 2: Mustache (with live transform offset) */}
            {isCustomizable && avatar.hasMustache && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/assets/master/mustache_1024.png"
                alt="Mustache"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] transition-transform duration-75"
                style={{
                  transform: `translate(${offsets.mustache.x}%, ${offsets.mustache.y}%) scale(${offsets.mustache.scale}) rotate(${offsets.mustache.rotate}deg)`,
                  transformOrigin: "50% 55%",
                }}
              />
            )}

            {/* Layer 3: Glasses (with live transform offset) */}
            {isCustomizable && avatar.hasGlasses && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/assets/master/glasses_1024.png"
                alt="Glasses"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] transition-transform duration-75"
                style={{
                  transform: `translate(${offsets.glasses.x}%, ${offsets.glasses.y}%) scale(${offsets.glasses.scale}) rotate(${offsets.glasses.rotate}deg)`,
                  transformOrigin: "50% 43%",
                }}
              />
            )}

            {/* Layer 4: Crown (with live transform offset) */}
            {isCustomizable && avatar.hasCrown && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/assets/master/crown_1024.png"
                alt="Crown"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-[0_6px_12px_rgba(0,0,0,0.9)] transition-transform duration-75"
                style={{
                  transform: `translate(${offsets.crown.x}%, ${offsets.crown.y}%) scale(${offsets.crown.scale}) rotate(${offsets.crown.rotate}deg)`,
                  transformOrigin: "50% 15%",
                }}
              />
            )}

            {/* Layer 5: Master Outer Battle Frame */}
            {currentFrame.src && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentFrame.src}
                alt="Battle Frame"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"
              />
            )}

            {/* Level Badge */}
            <span className="absolute bottom-2 left-2 text-[10px] font-title font-black bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-lg border border-white shadow-lg z-20">
              Lv.12
            </span>

            {/* Rarity Pill */}
            <span
              className="absolute top-2 right-2 text-[9px] font-title font-black text-white px-2 py-0.5 rounded-lg shadow-lg z-20"
              style={{ backgroundColor: BASE_SKINS.find((s) => s.id === avatar.skinId)?.color ?? "#22c55e" }}
            >
              {BASE_SKINS.find((s) => s.id === avatar.skinId)?.rarity}
            </span>
          </div>

          {/* Character Details & Title Flex */}
          <div className="text-center flex flex-col items-center">
            <h2 className="text-base sm:text-lg font-title font-black text-white">
              {BASE_SKINS.find((s) => s.id === avatar.skinId)?.name}
            </h2>
            <span className="text-xs font-title font-bold text-emerald-400">
              🏆 {avatar.title} · 1,250 Trophies
            </span>
            <span className="text-[11px] text-amber-200/80 mt-0.5">
              Theme: {currentBg.name} · Frame: {currentFrame.name}
            </span>
          </div>

          {/* Quick Preset Buttons */}
          {isCustomizable && (
            <div className="flex gap-2 flex-wrap justify-center">
              <button
                onClick={avatar.equipAll}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/60 text-amber-300 text-xs font-title font-bold hover:bg-amber-500/30 transition-colors cursor-pointer"
              >
                Equip All ✨
              </button>
              <button
                onClick={() => setOffsets(DEFAULT_OFFSETS)}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400/60 text-cyan-300 text-xs font-title font-bold hover:bg-cyan-500/30 transition-colors cursor-pointer flex items-center gap-1"
              >
                <Zap size={12} />
                <span>Reset Offsets</span>
              </button>
              <button
                onClick={avatar.removeAll}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 text-xs font-title font-bold hover:border-slate-500 transition-colors cursor-pointer flex items-center gap-1"
              >
                <RefreshCw size={12} />
                <span>Remove All</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Customizer Controls & Transform Calibration Engine */}
        <div className="lg:col-span-7 flex flex-col gap-4 bg-gradient-to-b from-[#132019]/90 via-[#0a1410]/95 to-[#050b08]/98 border-2 border-amber-500/40 rounded-3xl p-5 shadow-2xl backdrop-blur-xl">
          {/* Customizer Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-amber-500/20">
            {[
              { id: "wearables", label: "🕶️ Wearables" },
              { id: "fine_tune", label: "🔧 Transform & Scale" },
              { id: "backgrounds", label: "🎨 Backgrounds" },
              { id: "skins", label: "🐮 Base Skins" },
              { id: "frames", label: "🖼️ Frames" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-3.5 sm:px-4 py-2 rounded-xl font-title font-black text-xs uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                  activeTab === tab.id
                    ? "bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.6)]"
                    : "bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Wearables Toggle (Glasses, Mustache, Crown) */}
          {activeTab === "wearables" && (
            <div className="flex flex-col gap-3">
              {!isCustomizable && (
                <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200">
                  ⚠️ This is a pre-baked Mythic skin. Switch to <b>Classic Bull</b> to equip and resize modular wearables!
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Gold Aviator Sunglasses */}
                <div
                  onClick={avatar.toggleGlasses}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center gap-2.5 text-center ${
                    avatar.hasGlasses && isCustomizable
                      ? "border-cyan-400 bg-cyan-950/40 shadow-[0_0_18px_rgba(6,182,212,0.5)]"
                      : "border-slate-800 bg-slate-950/60 hover:border-slate-700 opacity-60"
                  }`}
                >
                  <div className="w-16 h-16 rounded-xl bg-black/60 border border-cyan-400/40 flex items-center justify-center p-1 shadow-inner">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/assets/glasses_transparent.png" alt="Glasses" className="max-h-full object-contain" />
                  </div>
                  <span className="font-title font-bold text-xs text-white">Gold Aviators</span>
                  <span className="text-[10px] font-title font-black text-cyan-300">
                    {avatar.hasGlasses && isCustomizable ? "✓ EQUIPPED" : "CLICK TO EQUIP"}
                  </span>
                </div>

                {/* Handlebar Mustache */}
                <div
                  onClick={avatar.toggleMustache}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center gap-2.5 text-center ${
                    avatar.hasMustache && isCustomizable
                      ? "border-amber-400 bg-amber-950/40 shadow-[0_0_18px_rgba(245,158,11,0.5)]"
                      : "border-slate-800 bg-slate-950/60 hover:border-slate-700 opacity-60"
                  }`}
                >
                  <div className="w-16 h-16 rounded-xl bg-black/60 border border-amber-400/40 flex items-center justify-center p-1 shadow-inner">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/assets/mustache_transparent.png" alt="Mustache" className="max-h-full object-contain" />
                  </div>
                  <span className="font-title font-bold text-xs text-white">Handlebar Mustache</span>
                  <span className="text-[10px] font-title font-black text-amber-300">
                    {avatar.hasMustache && isCustomizable ? "✓ EQUIPPED" : "CLICK TO EQUIP"}
                  </span>
                </div>

                {/* Royal King's Crown */}
                <div
                  onClick={avatar.toggleCrown}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center gap-2.5 text-center ${
                    avatar.hasCrown && isCustomizable
                      ? "border-yellow-400 bg-yellow-950/40 shadow-[0_0_18px_rgba(234,179,8,0.5)]"
                      : "border-slate-800 bg-slate-950/60 hover:border-slate-700 opacity-60"
                  }`}
                >
                  <div className="w-16 h-16 rounded-xl bg-black/60 border border-yellow-400/40 flex items-center justify-center p-1 shadow-inner">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/assets/crown_transparent.png" alt="Crown" className="max-h-full object-contain" />
                  </div>
                  <span className="font-title font-bold text-xs text-white">Royal Gold Crown</span>
                  <span className="text-[10px] font-title font-black text-yellow-300">
                    {avatar.hasCrown && isCustomizable ? "✓ EQUIPPED" : "CLICK TO EQUIP"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Fine-Tuning Transform, Scale & Rotation Gizmo */}
          {activeTab === "fine_tune" && (
            <div className="flex flex-col gap-4">
              {/* Item Selector Sub-Tabs */}
              <div className="flex items-center gap-2 bg-black/50 p-1.5 rounded-2xl border border-amber-500/30">
                {[
                  { id: "glasses", label: "🕶️ Glasses Rig", enabled: avatar.hasGlasses },
                  { id: "mustache", label: "🧔 Mustache Rig", enabled: avatar.hasMustache },
                  { id: "crown", label: "👑 Crown Rig", enabled: avatar.hasCrown },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveRigItem(item.id as typeof activeRigItem)}
                    className={`flex-1 py-1.5 rounded-xl font-title font-bold text-xs transition-all cursor-pointer ${
                      activeRigItem === item.id
                        ? "bg-amber-400 text-slate-950 shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Active Rig Controls */}
              <div className="flex flex-col gap-3.5 bg-black/40 p-4 rounded-2xl border border-amber-500/30">
                <div className="flex justify-between items-center text-xs font-title font-bold text-amber-300">
                  <span className="capitalize">{activeRigItem} Live Calibration Controls</span>
                  <button
                    onClick={() => setOffsets((prev) => ({ ...prev, [activeRigItem]: DEFAULT_OFFSETS[activeRigItem] }))}
                    className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    Reset This Item
                  </button>
                </div>

                {/* X Position */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px] text-slate-300">
                    <span className="flex items-center gap-1"><Move size={12} /> Horizontal X Shift</span>
                    <span className="font-mono text-amber-300">{offsets[activeRigItem].x.toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min="-25"
                    max="25"
                    step="0.5"
                    value={offsets[activeRigItem].x}
                    onChange={(e) => updateOffset(activeRigItem, "x", parseFloat(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>

                {/* Y Position */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px] text-slate-300">
                    <span className="flex items-center gap-1"><Move size={12} /> Vertical Y Shift</span>
                    <span className="font-mono text-amber-300">{offsets[activeRigItem].y.toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min="-25"
                    max="25"
                    step="0.5"
                    value={offsets[activeRigItem].y}
                    onChange={(e) => updateOffset(activeRigItem, "y", parseFloat(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>

                {/* Scale / Size */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px] text-slate-300">
                    <span className="flex items-center gap-1"><Maximize2 size={12} /> Size Scale Multiplier</span>
                    <span className="font-mono text-amber-300">{offsets[activeRigItem].scale.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.8"
                    step="0.02"
                    value={offsets[activeRigItem].scale}
                    onChange={(e) => updateOffset(activeRigItem, "scale", parseFloat(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>

                {/* Rotation */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px] text-slate-300">
                    <span className="flex items-center gap-1"><RotateCw size={12} /> Angle Tilt / Rotation</span>
                    <span className="font-mono text-amber-300">{offsets[activeRigItem].rotate}°</span>
                  </div>
                  <input
                    type="range"
                    min="-30"
                    max="30"
                    step="1"
                    value={offsets[activeRigItem].rotate}
                    onChange={(e) => updateOffset(activeRigItem, "rotate", parseInt(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Background Themes */}
          {activeTab === "backgrounds" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {BACKGROUND_OPTIONS.map((theme) => (
                <div
                  key={theme.id}
                  onClick={() => avatar.setBackground(theme.id)}
                  className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex flex-col gap-2 ${
                    avatar.backgroundId === theme.id
                      ? "border-amber-400 bg-amber-950/40 shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                      : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                  }`}
                >
                  <div className={`w-full h-16 rounded-xl ${theme.gradient} border border-white/20`} />
                  <div className="flex items-center justify-between">
                    <span className="font-title font-bold text-xs text-white">{theme.name}</span>
                    {avatar.backgroundId === theme.id && <Check size={14} className="text-amber-400" />}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 4: Base Character Skins */}
          {activeTab === "skins" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {BASE_SKINS.map((skin) => (
                <div
                  key={skin.id}
                  onClick={() => avatar.setSkin(skin.id)}
                  className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex flex-col gap-2 ${
                    avatar.skinId === skin.id
                      ? "border-amber-400 bg-amber-950/40 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                      : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                  }`}
                >
                  <div className="w-full h-28 rounded-xl overflow-hidden bg-slate-900 border border-amber-400/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={skin.image} alt={skin.name} className="w-full h-full object-contain" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-title font-black text-xs text-white truncate">{skin.name}</span>
                    <span className="text-[9px] font-title font-bold text-amber-300 px-1.5 py-0.2 rounded bg-black/60 border border-amber-400/40">
                      {skin.rarity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 5: Battle Card Frames */}
          {activeTab === "frames" && (
            <div className="grid grid-cols-2 gap-3">
              {FRAME_OPTIONS.map((f) => (
                <div
                  key={f.id}
                  onClick={() => avatar.setFrame(f.id)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                    avatar.frameId === f.id
                      ? "border-amber-400 bg-amber-950/40 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                      : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                  }`}
                >
                  <span className="font-title font-bold text-xs text-white">{f.name}</span>
                  {avatar.frameId === f.id && <Check size={16} className="text-amber-400" />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
