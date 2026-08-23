"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Sparkles, User, Settings2, ShieldCheck, Check } from "lucide-react";
import { usePlatformTheme, useSetThemeFamily } from "../../lib/hooks/useTheme";
import { useProfile, useUpdateProfile } from "../../lib/hooks/useAuth";
import { fileToAvatarDataUrl } from "../../lib/avatar";
import { soundManager } from "../../lib/soundManager";

export function AdminSettingsContent() {
  const router = useRouter();
  const { data } = usePlatformTheme();
  const setFamily = useSetThemeFamily();
  const family = data?.themeFamily ?? "monster";

  return (
    <div className="flex flex-col gap-6 select-none font-sans">
      {/* Heading Marquee */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-[#18281e]/90 via-[#0e1a13]/95 to-[#060c08] border-2 border-amber-400/60 rounded-3xl p-5 sm:p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-title font-black text-amber-400 tracking-widest uppercase">
            <Settings2 size={13} />
            <span>GLOBAL CONFIGURATION</span>
          </div>
          <h1 className="font-title font-black text-2xl sm:text-3xl text-white tracking-wide mt-0.5">
            Admin Settings
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your admin profile identity and global platform visual theme worlds.
          </p>
        </div>

        <span className="px-3.5 py-1.5 rounded-xl bg-black/60 border border-emerald-400/40 text-emerald-400 font-title font-bold text-xs">
          MASTER ADMIN ACTIVE
        </span>
      </div>

      {/* Admin Profile Card */}
      <AdminProfileCard />

      {/* Theme Family Switcher Console */}
      <div className="rounded-3xl bg-gradient-to-b from-[#18281e]/98 via-[#0e1a13]/98 to-[#060c08] border-2 border-amber-400/70 p-6 sm:p-8 shadow-xl flex flex-col gap-4">
        <div>
          <span className="text-[10px] font-title font-bold text-amber-400 uppercase tracking-widest">
            WORLD THEMES
          </span>
          <h2 className="font-title font-black text-xl text-white">
            Visual Theme Family
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Switch the visual atmosphere and environment for all connected players.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          {/* Monster Mayhem */}
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setFamily.mutate("monster");
            }}
            className={`p-5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
              family === "monster"
                ? "border-emerald-400 bg-emerald-950/40 shadow-[0_0_20px_rgba(52,211,153,0.3)]"
                : "border-slate-800 bg-black/60 hover:border-slate-600"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-title font-black uppercase bg-emerald-500 text-slate-950">
                DEFAULT WORLD
              </span>
              {family === "monster" && <Check size={18} className="text-emerald-400" />}
            </div>
            <div>
              <h3 className="font-title font-black text-lg text-white">Barnaby Pasture (Monster Mayhem)</h3>
              <p className="text-xs text-slate-400 mt-1">
                Lush green pastures, barn brawls, cheerful cows, and joyful gold finishes.
              </p>
            </div>
          </button>

          {/* Moonlit Bazaar */}
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setFamily.mutate("desert");
            }}
            className={`p-5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
              family === "desert"
                ? "border-amber-400 bg-amber-950/40 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                : "border-slate-800 bg-black/60 hover:border-slate-600"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-title font-black uppercase bg-amber-500 text-slate-950">
                DESERT WORLD
              </span>
              {family === "desert" && <Check size={18} className="text-amber-400" />}
            </div>
            <div>
              <h3 className="font-title font-black text-lg text-white">Moonlit Bazaar</h3>
              <p className="text-xs text-slate-400 mt-1">
                Enchanted desert brass, jewel tones, velvet canopies, and crystalline sands.
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminProfileCard() {
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState("");
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName ?? "");
      setAvatarUrl(profile.avatarUrl ?? null);
    }
  }, [profile]);

  const initials = (profile?.fullName || profile?.email || "AD").slice(0, 2).toUpperCase();

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarError("");
    try {
      setAvatarUrl(await fileToAvatarDataUrl(file));
      setSaved(false);
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Could not read that image.");
    }
  }

  function save() {
    soundManager.playClick();
    setSaved(false);
    updateProfile.mutate(
      { fullName: fullName.trim() || undefined, avatarUrl },
      {
        onSuccess: () => {
          soundManager.playVictory();
          setSaved(true);
        },
      }
    );
  }

  return (
    <div className="rounded-3xl bg-gradient-to-b from-[#18281e]/98 via-[#0e1a13]/98 to-[#060c08] border-2 border-amber-400/70 p-6 sm:p-8 shadow-xl flex flex-col gap-4">
      <div>
        <span className="text-[10px] font-title font-bold text-amber-400 uppercase tracking-widest">
          ADMIN PROFILE
        </span>
        <h2 className="font-title font-black text-xl text-white">
          Administrator Identity
        </h2>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-2">
        <div className="w-20 h-20 rounded-2xl border-2 border-amber-400 bg-black/80 flex items-center justify-center text-amber-300 font-title font-black text-2xl overflow-hidden shadow-lg shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>

        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onPickImage}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-title font-bold flex items-center gap-2 cursor-pointer transition-colors shadow"
          >
            <Camera size={15} />
            <span>{avatarUrl ? "Change Photo" : "Upload Photo"}</span>
          </button>
          {avatarUrl && (
            <button
              onClick={() => {
                setAvatarUrl(null);
                setSaved(false);
              }}
              className="text-xs text-rose-400 hover:underline text-left cursor-pointer"
            >
              Remove photo
            </button>
          )}
          {avatarError && <p className="text-xs text-rose-400 font-bold">{avatarError}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-title font-bold text-slate-300">Display Name</span>
          <input
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              setSaved(false);
            }}
            className="w-full bg-black/80 border-2 border-slate-700 focus:border-amber-400 rounded-xl py-2 px-3.5 text-sm text-white outline-none"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-title font-bold text-slate-300">Email Address</span>
          <input
            value={profile?.email ?? ""}
            readOnly
            className="w-full bg-black/50 border-2 border-slate-800 rounded-xl py-2 px-3.5 text-sm text-slate-400 outline-none cursor-not-allowed"
          />
        </label>
      </div>

      <div className="pt-2">
        <button
          onClick={save}
          disabled={updateProfile.isPending}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-title font-black text-xs uppercase tracking-wider shadow hover:brightness-110 active:scale-98 transition-all cursor-pointer flex items-center gap-2"
        >
          <ShieldCheck size={16} />
          <span>{updateProfile.isPending ? "SAVING..." : saved ? "SAVED ✓" : "SAVE CHANGES"}</span>
        </button>
      </div>
    </div>
  );
}
