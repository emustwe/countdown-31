"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Building2,
  ChevronLeft,
  Gamepad2,
  LayoutDashboard,
  LogOut,
  Settings as SettingsIcon,
  Trophy,
  Users,
  ShieldAlert,
} from "lucide-react";
import { useLogout, useProfile } from "../../lib/hooks/useAuth";
import { soundManager } from "../../lib/soundManager";

export function NewAdminNav() {
  const router = useRouter();
  const pathname = usePathname();
  const logout = useLogout();
  const { data: profile } = useProfile();
  const initials = (profile?.fullName || profile?.email || "AD").slice(0, 2).toUpperCase();

  const items = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/admin" },
    { label: "Game Studio", icon: Gamepad2, path: "/admin/game" },
    { label: "Tournaments", icon: Trophy, path: "/admin/tournament" },
    { label: "Sponsors", icon: Building2, path: "/admin/sponsor" },
    { label: "Users", icon: Users, path: "/admin/users" },
    { label: "Settings", icon: SettingsIcon, path: "/admin/settings" },
  ];

  function handleNavigate(path: string) {
    soundManager.playClick();
    router.push(path);
  }

  async function handleLogout() {
    soundManager.playClick();
    await logout.mutateAsync();
    router.replace("/login");
  }

  return (
    <header className="relative z-30 w-full max-w-7xl mx-auto px-4 py-3 sm:py-4 flex flex-col md:flex-row items-center justify-between gap-4 bg-gradient-to-r from-[#18281e]/95 via-[#0e1a13]/98 to-[#18281e]/95 border-2 border-amber-400/70 rounded-3xl shadow-[0_15px_40px_rgba(0,0,0,0.8),0_0_25px_rgba(245,158,11,0.2)] backdrop-blur-md">
      {/* Left Branding & Back to Arena Button */}
      <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
        <button
          onClick={() => {
            soundManager.playClick();
            router.push("/home");
          }}
          className="w-10 h-10 rounded-2xl bg-black/70 border border-amber-400/50 hover:border-amber-400 text-amber-300 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow hover:scale-105 active:scale-95"
          title="Back to Game Arena"
          aria-label="Back to Game Arena"
        >
          <ChevronLeft size={20} />
        </button>

        <div
          className="flex items-center gap-2.5 cursor-pointer"
          onClick={() => handleNavigate("/admin")}
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 border border-amber-200 flex items-center justify-center text-slate-950 font-title font-black shadow-[0_0_15px_rgba(245,158,11,0.6)]">
            <ShieldAlert size={20} className="drop-shadow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-title font-black text-sm sm:text-base text-amber-300 tracking-wider">
                ADMIN CONSOLE
              </h1>
              <span className="text-[9px] font-title font-black px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 uppercase">
                MASTER
              </span>
            </div>
            <p className="text-[10px] font-title font-semibold text-emerald-400/80 uppercase tracking-widest -mt-0.5">
              Count Down 31 Platform
            </p>
          </div>
        </div>
      </div>

      {/* Center Navigation Tabs */}
      <nav className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/70 border border-amber-500/30 overflow-x-auto max-w-full">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-title font-bold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? "bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.6)] font-black"
                  : "text-slate-300 hover:text-white hover:bg-amber-400/10"
              }`}
            >
              <Icon size={14} className={isActive ? "text-slate-950" : "text-amber-400"} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right Admin Profile & Log Out */}
      <div className="flex items-center gap-3 w-full md:w-auto justify-end">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-black/60 border border-amber-400/40">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-700 border border-amber-200 flex items-center justify-center text-slate-950 font-title font-black text-xs shadow overflow-hidden">
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="hidden sm:flex flex-col text-left min-w-0">
            <span className="font-title font-bold text-xs text-white truncate max-w-[120px]">
              {profile?.fullName || "Super Admin"}
            </span>
            <span className="text-[9px] font-title font-semibold text-emerald-400 uppercase">
              ADMINISTRATOR
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="p-2.5 rounded-2xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 hover:text-white transition-all cursor-pointer shadow hover:scale-105 active:scale-95"
          title="Log out of Admin"
          aria-label="Log out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
