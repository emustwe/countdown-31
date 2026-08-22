"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  X,
  Home,
  Trophy,
  Handshake,
  ShoppingBag,
  User,
  Wallet,
  Settings,
  BookOpen,
  Volume2,
  VolumeX,
  Crown,
  ChevronRight,
  History as HistoryIcon,
} from "lucide-react";
import { useAuthStore } from "../../stores/auth-store";
import { useSettingsStore } from "../../stores/settings-store";
import { soundManager } from "../../lib/soundManager";

interface ArcadeDrawerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRules: () => void;
}

export function ArcadeDrawerMenu({
  isOpen,
  onClose,
  onOpenRules,
}: ArcadeDrawerMenuProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const toggleSoundStore = useSettingsStore((s) => s.toggleSound);

  if (!isOpen) return null;

  function handleNavigate(path: string) {
    soundManager.playClick();
    router.push(path);
    onClose();
  }

  function handleToggleSound() {
    toggleSoundStore();
    const next = !soundEnabled;
    soundManager.setMuted(!next);
    if (next) soundManager.playClick();
  }

  const navItems = [
    { label: "Play", icon: Home, path: "/home", badge: "Live" },
    { label: "My Cow", icon: Crown, path: "/avatar" },
    { label: "Tournaments", icon: Trophy, path: "/events" },
    { label: "Sponsor", icon: Handshake, path: "/sponsorship" },
    { label: "Shop", icon: ShoppingBag, path: "/shop" },
    { label: "My Profile", icon: User, path: "/profile" },
    { label: "Wallet", icon: Wallet, path: "/wallet" },
    { label: "Past Games", icon: HistoryIcon, path: "/history" },
    { label: "Settings", icon: Settings, path: "/settings" },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            soundManager.playClick();
            onClose();
          }}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm"
        />

        {/* Slide-in Drawer */}
        <motion.aside
          initial={{ x: "-100%" }}
          animate={{ x: 0 }}
          exit={{ x: "-100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 280 }}
          className="relative w-80 max-w-[85vw] h-full bg-gradient-to-b from-[#13241b] via-[#0b1711] to-[#040906] border-r-2 border-amber-400/60 shadow-[10px_0_40px_rgba(0,0,0,0.9)] flex flex-col justify-between p-5 z-50"
        >
          {/* Drawer Top Header */}
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-amber-500/30 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🐮</span>
                <div>
                  <h3 className="font-title font-black text-lg text-amber-300 tracking-wider">
                    COUNT DOWN 31
                  </h3>
                  <span className="text-[10px] font-title font-semibold text-emerald-400/80 uppercase">
                    Menu
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  soundManager.playClick();
                  onClose();
                }}
                className="w-8 h-8 rounded-full bg-black/60 border border-amber-400/40 text-amber-300 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* User Profile Card Snippet / Auth Button */}
            <div className="p-3 rounded-2xl bg-black/40 border border-amber-500/30 mb-4 flex flex-col gap-2.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-300 font-title font-black text-sm">
                  {user?.fullName?.slice(0, 2).toUpperCase() || "🐮"}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-title font-black text-sm text-white truncate">
                    {user?.fullName || "Guest Player"}
                  </span>
                  <span className="text-[11px] font-title font-semibold text-amber-300/80 truncate">
                    {user?.email || "Playing Locally"}
                  </span>
                </div>
              </div>

              {!user ? (
                <button
                  onClick={() => handleNavigate("/login")}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-title font-black text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(245,158,11,0.5)] hover:brightness-110 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <User size={13} />
                  <span>SIGN IN / REGISTER</span>
                </button>
              ) : (
                <button
                  onClick={() => handleNavigate("/profile")}
                  className="w-full py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-amber-400 text-amber-300 text-xs font-title font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>View Account & Wallet ➔</span>
                </button>
              )}
            </div>

            {/* Navigation List */}
            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigate(item.path)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl text-amber-100/90 hover:text-white hover:bg-amber-400/10 hover:border-amber-400/40 border border-transparent font-title font-bold text-sm transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-slate-900 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:border-amber-400">
                        <Icon size={15} />
                      </div>
                      <span>{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.badge && (
                        <span className="text-[9px] font-title font-black bg-amber-400 text-amber-950 px-1.5 py-0.2 rounded-full uppercase">
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight size={14} className="text-amber-400/40 group-hover:text-amber-300" />
                    </div>
                  </button>
                );
              })}

              {/* Official Rules Modal Trigger Item */}
              <button
                onClick={() => {
                  soundManager.playClick();
                  onClose();
                  onOpenRules();
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-amber-950/50 to-emerald-950/50 border border-amber-400/50 text-amber-300 font-title font-black text-sm mt-3 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300">
                    <BookOpen size={15} />
                  </div>
                  <span>How to play</span>
                </div>
                <ChevronRight size={14} />
              </button>
            </nav>
          </div>

          {/* Drawer Bottom Controls */}
          <div className="pt-4 border-t border-amber-500/30 flex items-center justify-between">
            <button
              onClick={handleToggleSound}
              className="flex items-center gap-2 text-xs font-title font-bold text-amber-200/80 hover:text-white cursor-pointer"
            >
              {soundEnabled ? <Volume2 size={16} className="text-emerald-400" /> : <VolumeX size={16} className="text-slate-400" />}
              <span>{soundEnabled ? "Sound On" : "Muted"}</span>
            </button>

            <span className="text-[10px] font-title text-amber-400/50">
              COUNT DOWN 31
            </span>
          </div>
        </motion.aside>
      </div>
    </AnimatePresence>
  );
}
