"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Building2,
  ChevronLeft,
  CircleDot,
  Gamepad2,
  LayoutDashboard,
  LogOut,
  Trophy,
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
    <header className="relative z-30 mx-auto w-full max-w-7xl overflow-hidden rounded-[1.75rem] border border-amber-400/55 bg-[#0a160f]/95 p-3 shadow-[0_18px_55px_rgba(0,0,0,.7),0_0_30px_rgba(245,158,11,.1)] backdrop-blur-xl sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          {/* Clear route back to the player-facing game. */}
          <button
            onClick={() => {
              soundManager.playClick();
              router.push("/home");
            }}
            className="group flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-slate-700 bg-black/45 px-3 text-slate-300 transition hover:border-amber-400/60 hover:bg-amber-400/10 hover:text-white active:scale-95"
            title="Back to Game Arena"
            aria-label="Back to Game Arena"
          >
            <ChevronLeft size={18} className="text-amber-300" />
            <span className="hidden text-xs font-black sm:inline">Game</span>
          </button>

          {/* Brand is deliberately compact so navigation always has room. */}
          <button
            type="button"
            className="flex min-w-0 items-center gap-2.5 text-left"
            onClick={() => handleNavigate("/admin")}
            aria-label="Admin dashboard"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-amber-200/70 bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 text-slate-950 shadow-[0_0_18px_rgba(245,158,11,.35)]">
              <ShieldAlert size={21} />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <span className="truncate font-title text-base font-black tracking-wide text-amber-200 sm:text-lg">
                  Admin Console
                </span>
                <span className="hidden rounded-full bg-emerald-400 px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-emerald-950 sm:inline">
                  Master
                </span>
              </span>
              <span className="block truncate text-[9px] font-bold uppercase tracking-[.18em] text-emerald-400/75 sm:text-[10px]">
                Count Down 31
              </span>
            </span>
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-emerald-300 lg:flex">
            <CircleDot size={10} className="fill-emerald-400 text-emerald-400" />
            System live
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 p-1.5 pr-2.5">
            <div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg border border-amber-300/60 bg-gradient-to-br from-amber-300 to-amber-700 text-[10px] font-black text-slate-950">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="hidden min-w-0 flex-col text-left md:flex">
              <span className="max-w-[130px] truncate text-[11px] font-black text-white">
                {profile?.fullName || "Super Admin"}
              </span>
              <span className="text-[8px] font-black uppercase tracking-wider text-emerald-400">
                Administrator
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="grid h-11 w-11 place-items-center rounded-xl border border-rose-500/35 bg-rose-950/55 text-rose-300 transition hover:border-rose-400 hover:bg-rose-900 hover:text-white active:scale-95"
            title="Log out of Admin"
            aria-label="Log out"
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>

      {/* Grid navigation never creates a horizontal scrollbar. */}
      <nav className="mt-3 grid grid-cols-2 gap-1.5 border-t border-white/10 pt-3 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              aria-current={isActive ? "page" : undefined}
              className={`group relative flex min-w-0 items-center justify-center gap-2 rounded-xl border px-2.5 py-2.5 text-[11px] font-black transition active:scale-[.98] sm:text-xs ${
                isActive
                  ? "border-amber-300/70 bg-gradient-to-b from-amber-400 to-amber-600 text-slate-950 shadow-[0_6px_18px_rgba(245,158,11,.24)]"
                  : "border-transparent bg-white/[.035] text-slate-300 hover:border-amber-400/25 hover:bg-amber-400/10 hover:text-white"
              }`}
            >
              <Icon
                size={15}
                className={
                  isActive ? "text-slate-950" : "text-amber-400 transition group-hover:scale-110"
                }
              />
              <span className="truncate">{item.label}</span>
              {isActive && (
                <span className="absolute inset-x-5 -bottom-px h-0.5 rounded-full bg-amber-100" />
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
