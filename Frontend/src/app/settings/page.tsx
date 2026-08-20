"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, Volume2, VolumeX, Sparkles, Smartphone, Shield, User, Bell, Check, Save, LogOut, Camera, WandSparkles } from "lucide-react";
import { ArcadeHeader } from "../../components/dune/ArcadeHeader";
import { ArcadeDrawerMenu } from "../../components/dune/ArcadeDrawerMenu";
import { OfficialRulesModal } from "../../components/dune/OfficialRulesModal";
import { AuthGuard } from "../../components/AuthGuard";
import { useSettingsStore } from "../../stores/settings-store";
import { useAvatarStore } from "../../stores/avatar-customization-store";
import { useProfile, useLogout, useUpdateProfile } from "../../lib/hooks/useAuth";
import { fileToAvatarDataUrl } from "../../lib/avatar";
import { soundManager } from "../../lib/soundManager";

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsLayout />
    </AuthGuard>
  );
}

function SettingsLayout() {
  const router = useRouter();
  const [showDrawer, setShowDrawer] = useState(false);
  const [showRules, setShowRules] = useState(false);

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

      {/* Main Settings Arena - WITH DEDICATED TOP CLEARANCE (Zero Overlap) */}
      <main className="relative z-10 w-full max-w-4xl mx-auto flex-1 mt-8 sm:mt-12 md:mt-14 mb-6 flex flex-col gap-6">
        <SettingsContent />
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

function SettingsContent() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const logout = useLogout();
  const updateProfile = useUpdateProfile();

  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const animationsEnabled = useSettingsStore((s) => s.animationsEnabled);
  const toggleSound = useSettingsStore((s) => s.toggleSound);
  const toggleAnimations = useSettingsStore((s) => s.toggleAnimations);

  const [savedToast, setSavedToast] = useState(false);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName ?? "");
      setAvatarUrl(profile.avatarUrl ?? null);
    }
  }, [profile]);

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarError("");
    try {
      setAvatarUrl(await fileToAvatarDataUrl(file));
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Image could not be processed.");
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    soundManager.playClick();
    try {
      await updateProfile.mutateAsync({
        fullName: fullName.trim() || undefined,
        avatarUrl: avatarUrl ?? undefined,
      });
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2500);
    } catch {
      // error handled by mutation
    }
  }

  async function handleLogout() {
    soundManager.playClick();
    await logout.mutateAsync();
    router.push("/home");
  }

  return (
    <>
      {/* Title Header */}
      <div className="w-full bg-gradient-to-r from-amber-950/95 via-[#132019]/95 to-amber-950/95 border-2 sm:border-3 border-amber-400/80 rounded-3xl p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-300 shadow">
            <Settings size={24} />
          </div>
          <div>
            <h1 className="font-title font-black text-2xl sm:text-3xl text-amber-300 tracking-wide">
              SETTINGS
            </h1>
            <p className="text-xs text-slate-300">
              Manage your account profile, audio effects, visuals, and preferences.
            </p>
          </div>
        </div>

        {savedToast && (
          <span className="px-4 py-1.5 rounded-full bg-emerald-500 text-slate-950 font-title font-black text-xs shadow flex items-center gap-1.5 animate-bounce">
            <Check size={14} /> CHANGES SAVED!
          </span>
        )}
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card & Account Details */}
        <form onSubmit={handleSaveProfile} className="md:col-span-2 bg-gradient-to-b from-[#192b20]/95 via-[#0e1a13]/98 to-[#060c08] border-2 border-amber-400/50 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-2">
            <User size={18} className="text-amber-400" />
            <span className="font-title font-black text-sm text-amber-300 uppercase tracking-wider">
              PLAYER ACCOUNT PROFILE
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar Photo with Upload Overlay */}
            <div className="relative group shrink-0">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-amber-400 bg-black/80 flex items-center justify-center">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-title font-black text-emerald-400">
                    {fullName ? fullName.slice(0, 2).toUpperCase() : "🐮"}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex flex-col items-center justify-center text-xs font-title font-bold text-amber-300 gap-1 cursor-pointer"
              >
                <Camera size={20} />
                <span>Upload</span>
              </button>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={onPickImage} className="hidden" />
            </div>

            {/* Inputs */}
            <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-title font-bold text-slate-300">Display Name / Nickname:</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your name..."
                  className="px-4 py-2.5 rounded-xl bg-black/70 border border-slate-700 text-white font-title text-sm focus:border-amber-400 outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-title font-bold text-slate-300">Account Email:</label>
                <input
                  disabled
                  value={profile?.email ?? ""}
                  className="px-4 py-2.5 rounded-xl bg-black/40 border border-slate-800 text-slate-400 font-title text-sm outline-none cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {avatarError && <span className="text-xs text-rose-400 font-bold">{avatarError}</span>}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={updateProfile.isPending}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-title font-black text-xs hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow flex items-center gap-2"
            >
              <Save size={14} />
              <span>{updateProfile.isPending ? "SAVING..." : "SAVE PROFILE"}</span>
            </button>
          </div>
        </form>

        {/* Audio & SFX */}
        <div className="bg-gradient-to-b from-[#192b20]/95 via-[#0e1a13]/98 to-[#060c08] border-2 border-amber-400/50 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-2">
            <Volume2 size={18} className="text-amber-400" />
            <span className="font-title font-black text-sm text-amber-300 uppercase tracking-wider">
              AUDIO & SFX
            </span>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/60 border border-slate-800">
            <div className="flex flex-col">
              <span className="font-title font-black text-sm text-white">Sound Effects</span>
              <span className="text-xs text-slate-400">Game audio, clicks & cow sounds</span>
            </div>
            <button
              type="button"
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

          <button
            type="button"
            onClick={() => soundManager.playMoo()}
            className="py-2.5 rounded-xl bg-amber-500/20 border border-amber-400/50 text-amber-300 font-title font-black text-xs hover:bg-amber-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>TEST BARNABY COW MOO 🐮</span>
          </button>
        </div>

        {/* Visuals & Animations */}
        <div className="bg-gradient-to-b from-[#192b20]/95 via-[#0e1a13]/98 to-[#060c08] border-2 border-amber-400/50 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-2">
            <Sparkles size={18} className="text-amber-400" />
            <span className="font-title font-black text-sm text-amber-300 uppercase tracking-wider">
              VISUALS & ANIMATIONS
            </span>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/60 border border-slate-800">
            <div className="flex flex-col">
              <span className="font-title font-black text-sm text-white">Animations</span>
              <span className="text-xs text-slate-400">Smooth 3D cylinder & particle effects</span>
            </div>
            <button
              type="button"
              onClick={toggleAnimations}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                animationsEnabled ? "bg-emerald-500" : "bg-slate-800"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 ${
                  animationsEnabled ? "right-0.5" : "left-0.5"
                }`}
              />
            </button>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="py-2.5 rounded-xl bg-rose-950/60 border border-rose-500/60 text-rose-300 font-title font-black text-xs hover:bg-rose-900/60 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut size={14} />
            <span>SIGN OUT OF ACCOUNT</span>
          </button>
        </div>
      </div>
    </>
  );
}
