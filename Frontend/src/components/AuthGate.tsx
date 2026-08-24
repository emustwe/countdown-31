"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { LogIn, UserPlus, X, ShieldAlert } from "lucide-react";
import { soundManager } from "../lib/soundManager";

export function AuthGate({
  open,
  onClose,
  title = "Sign in to continue",
  message = "Log in or create an account to access this feature.",
  next,
}: {
  open: boolean;
  onClose?: () => void;
  title?: string;
  message?: string;
  next?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  if (!open) return null;
  const dest = encodeURIComponent(next ?? pathname ?? "/home");

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-gradient-to-b from-[#18281e]/98 via-[#0e1a13]/98 to-[#050a07] border-2 border-amber-400 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(245,158,11,0.3)] flex flex-col items-center text-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {onClose && (
          <button
            type="button"
            onClick={() => {
              soundManager.playClose();
              onClose();
            }}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 border border-slate-700 hover:border-amber-400 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        )}

        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-300 shadow-xl mb-1">
          <ShieldAlert size={28} />
        </div>

        <h2 className="font-title font-black text-2xl text-white tracking-wide">{title}</h2>
        <p className="text-xs text-slate-300 max-w-xs">{message}</p>

        <div className="flex flex-col sm:flex-row gap-3 w-full mt-3">
          <button
            type="button"
            className="flex-1 btn-arcade-3d btn-arcade-amber py-3 rounded-2xl text-sm flex items-center justify-center gap-2 cursor-pointer"
            onClick={() => {
              soundManager.playClick();
              router.push(`/login?next=${dest}`);
            }}
          >
            <LogIn size={16} />
            <span>LOG IN</span>
          </button>
          <button
            type="button"
            className="flex-1 btn-arcade-3d btn-arcade-green py-3 rounded-2xl text-sm flex items-center justify-center gap-2 cursor-pointer"
            onClick={() => {
              soundManager.playClick();
              router.push(`/register?next=${dest}`);
            }}
          >
            <UserPlus size={16} />
            <span>SIGN UP</span>
          </button>
        </div>
      </div>
    </div>
  );
}
