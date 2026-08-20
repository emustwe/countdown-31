"use client";

import React, { useState } from "react";
import { Settings, Volume2, VolumeX, Sparkles, Smartphone, Shield, User, Bell, Check, Save } from "lucide-react";
import { ArcadeHeader } from "../../components/dune/ArcadeHeader";
import { ArcadeDrawerMenu } from "../../components/dune/ArcadeDrawerMenu";
import { OfficialRulesModal } from "../../components/dune/OfficialRulesModal";
import { useSettingsStore } from "../../stores/settings-store";
import { useAvatarStore } from "../../stores/avatar-customization-store";
import { useAuthStore } from "../../stores/auth-store";
import { soundManager } from "../../lib/soundManager";

export default function SettingsPage() {
  const [showDrawer, setShowDrawer] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const toggleSound = useSettingsStore((s) => s.toggleSound);
  const avatar = useAvatarStore();
  const setTitle = useAvatarStore((s) => s.setTitle);
  const user = useAuthStore((s) => s.user);

  const [screenShake, setScreenShake] = useState(true);
  const [haptics, setHaptics] = useState(true);
  const [highFps, setHighFps] = useState(true);
  const [nickname, setNickname] = useState(user?.fullName || "Sameer Khan");
  const [selectedTitle, setSelectedTitle] = useState(avatar.title || "The 31 Evader 👑");

  const AVAILABLE_TITLES = [
    "The 31 Evader 👑",
    "Modulo Master 🎯",
    "Pasture Champion 🏆",
    "Chrono Strategist ⏳",
    "Thunder Bull ⚡",
  ];

  function handleSave() {
    soundManager.playClick();
    setTitle(selectedTitle);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  }

  return (
    <div className="relative w-full min-h-screen bg-[#070e0a] overflow-x-hidden flex flex-col justify-between p-2 sm:p-6 select-none text-white">
      {/* Background Pasture Atmosphere */}
      <div
        className="fixed inset-0 pointer-events-none bg-cover bg-center opacity-40 mix-blend-luminosity"
        style={{ backgroundImage: "url('/assets/barnaby/barnaby-field.jpg')" }}
      />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.3)_0%,#040906_90%)]" />

      {/* Header */}
      <div className="relative z-20">
        <ArcadeHeader onMenuClick={() => setShowDrawer(true)} />
      </div>

      {/* Main Settings Arena */}
      <main className="relative z-10 w-full max-w-4xl mx-auto flex-1 my-4 flex flex-col gap-6">
        {/* Title Header */}
        <div className="w-full bg-gradient-to-r from-amber-950/95 via-[#132019]/95 to-amber-950/95 border-2 sm:border-3 border-amber-400/80 rounded-3xl p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-300 shadow">
              <Settings size={24} />
            </div>
            <div>
              <h1 className="font-title font-black text-2xl sm:text-3xl text-amber-300 tracking-wide">
                ARCADE SETTINGS
              </h1>
              <p className="text-xs text-slate-300">
                Configure audio effects, graphics, haptics, and player title.
              </p>
            </div>
          </div>

          {savedToast && (
            <span className="px-4 py-1.5 rounded-full bg-emerald-500 text-slate-950 font-title font-black text-xs shadow flex items-center gap-1.5 animate-bounce">
              <Check size={14} /> SETTINGS SAVED!
            </span>
          )}
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sound & Audio Effects */}
          <div className="bg-gradient-to-b from-[#192b20]/95 via-[#0e1a13]/98 to-[#060c08] border-2 border-amber-400/50 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-white/10 pb-2">
              <Volume2 size={18} className="text-amber-400" />
              <span className="font-title font-black text-sm text-amber-300 uppercase tracking-wider">
                AUDIO & SFX
              </span>
            </div>

            {/* Master Sound Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/60 border border-slate-800">
              <div className="flex flex-col">
                <span className="font-title font-black text-sm text-white">Master Sound</span>
                <span className="text-xs text-slate-400">Game audio, cow moos & button clicks</span>
              </div>
              <button
                onClick={() => {
                  toggleSound();
                  soundManager.setMuted(soundEnabled);
                  if (!soundEnabled) soundManager.playClick();
                }}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  soundEnabled ? "bg-emerald-500" : "bg-slate-800"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 ${
                    soundEnabled ? "right-0.5" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Barnaby Moo Test Button */}
            <button
              onClick={() => soundManager.playMoo()}
              className="py-2.5 rounded-xl bg-amber-500/20 border border-amber-400/50 text-amber-300 font-title font-black text-xs hover:bg-amber-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>TEST BARNABY COW MOO 🐮</span>
            </button>
          </div>

          {/* Gameplay & Visual Performance */}
          <div className="bg-gradient-to-b from-[#192b20]/95 via-[#0e1a13]/98 to-[#060c08] border-2 border-amber-400/50 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-white/10 pb-2">
              <Smartphone size={18} className="text-amber-400" />
              <span className="font-title font-black text-sm text-amber-300 uppercase tracking-wider">
                GRAPHICS & HAPTICS
              </span>
            </div>

            {/* Screen Shake Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/60 border border-slate-800">
              <div className="flex flex-col">
                <span className="font-title font-black text-sm text-white">Screen Shake Effects</span>
                <span className="text-xs text-slate-400">Impact shake on blunder / 31 explosion</span>
              </div>
              <button
                onClick={() => setScreenShake(!screenShake)}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  screenShake ? "bg-emerald-500" : "bg-slate-800"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 ${
                    screenShake ? "right-0.5" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            {/* High Refresh Rate Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/60 border border-slate-800">
              <div className="flex flex-col">
                <span className="font-title font-black text-sm text-white">60 / 120 FPS Animations</span>
                <span className="text-xs text-slate-400">Silky smooth 3D reel physics</span>
              </div>
              <button
                onClick={() => setHighFps(!highFps)}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  highFps ? "bg-emerald-500" : "bg-slate-800"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 ${
                    highFps ? "right-0.5" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Player Title & Identity Customization */}
          <div className="md:col-span-2 bg-gradient-to-b from-[#192b20]/95 via-[#0e1a13]/98 to-[#060c08] border-2 border-amber-400/50 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-white/10 pb-2">
              <User size={18} className="text-amber-400" />
              <span className="font-title font-black text-sm text-amber-300 uppercase tracking-wider">
                PLAYER IDENTITY & PRESTIGE TITLE
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nickname Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-title font-bold text-slate-300">Player Nickname:</label>
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={20}
                  className="px-4 py-3 rounded-2xl bg-black/70 border border-slate-700 text-white font-title font-black text-base focus:border-amber-400 outline-none"
                />
              </div>

              {/* Title Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-title font-bold text-slate-300">Equipped Arena Title:</label>
                <select
                  value={selectedTitle}
                  onChange={(e) => setSelectedTitle(e.target.value)}
                  className="px-4 py-3 rounded-2xl bg-black/70 border border-slate-700 text-amber-300 font-title font-black text-sm focus:border-amber-400 outline-none cursor-pointer"
                >
                  {AVAILABLE_TITLES.map((t) => (
                    <option key={t} value={t} className="bg-slate-950 text-white">
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 text-slate-950 font-title font-black text-base shadow-[0_0_20px_rgba(245,158,11,0.7)] hover:brightness-110 active:scale-95 transition-all mt-2 cursor-pointer flex items-center justify-center gap-2"
            >
              <Save size={18} />
              <span>SAVE CONFIGURATION</span>
            </button>
          </div>
        </div>
      </main>

      {/* Drawer & Modal */}
      <ArcadeDrawerMenu
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        onOpenRules={() => setShowRules(true)}
      />
      <OfficialRulesModal
        isOpen={showRules}
        onClose={() => setShowRules(false)}
      />
    </div>
  );
}
