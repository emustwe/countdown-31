"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, UserPlus, Eye, EyeOff, ShieldCheck, AlertTriangle, ArrowRight, User, Mail, Lock } from "lucide-react";
import { useLogin, useRegister } from "../../lib/hooks/useAuth";
import { ApiError } from "../../lib/api-client";
import { soundManager } from "../../lib/soundManager";

export function DuneAuth({ register: initialRegister = false }: { register?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");

  const [isRegister, setIsRegister] = useState(initialRegister);
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const isPending = loginMutation.isPending || registerMutation.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    soundManager.playClick();

    try {
      if (isRegister) {
        await registerMutation.mutateAsync({ fullName, email, password });
      } else {
        await loginMutation.mutateAsync({ email, password });
      }
      soundManager.playSuccess();
      router.push(next && next.startsWith("/") ? next : "/home");
    } catch (err) {
      soundManager.playError();
      setError(err instanceof ApiError ? String(err.envelope?.message || err.message) : "Authentication failed. Please check your credentials.");
    }
  }

  return (
    <div className="relative w-full min-h-screen bg-[#070e0a] overflow-x-hidden flex flex-col justify-between p-3 sm:p-6 select-none text-white font-sans">
      {/* Background Pasture Atmosphere */}
      <div
        className="fixed inset-0 pointer-events-none bg-cover bg-center opacity-30 mix-blend-luminosity"
        style={{ backgroundImage: "url('/assets/barnaby/barnaby-field.jpg')" }}
      />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.4)_0%,#040906_90%)]" />

      {/* Top Header Marquee */}
      <header className="relative z-20 w-full max-w-5xl mx-auto flex items-center justify-between px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-950/80 via-black/90 to-amber-950/80 border-2 border-amber-500/50 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push("/home")}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-700 border-2 border-amber-300 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.6)]">
            <span className="text-xl">🐮</span>
          </div>
          <div>
            <h1 className="font-title font-black text-base sm:text-lg tracking-wider text-amber-300 drop-shadow">
              COUNT DOWN 31
            </h1>
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest -mt-0.5">
              Live Battle Arena
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            soundManager.playClick();
            router.push("/home");
          }}
          className="px-3.5 py-1.5 rounded-xl bg-black/60 border border-slate-700 hover:border-amber-400/60 text-slate-300 hover:text-white text-xs font-title font-bold transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <span>Guest Mode</span>
          <ArrowRight size={14} />
        </button>
      </header>

      {/* Main Form Centerpiece */}
      <main className="relative z-10 w-full max-w-md mx-auto my-auto py-6">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-b from-[#18281e]/98 via-[#0e1a13]/98 to-[#060c08] border-2 sm:border-3 border-amber-400/80 shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(245,158,11,0.25)] p-6 sm:p-8"
        >
          {/* Top Rivet Accents */}
          <div className="absolute top-0 inset-x-0 h-4 bg-gradient-to-r from-amber-700 via-amber-400 to-amber-700 border-b border-amber-300/60 shadow flex items-center justify-around px-4 pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-amber-950 border border-amber-300 shadow-inner" />
            ))}
          </div>

          {/* Mode Switch Tabs (Sign In / Register) */}
          <div className="mt-2 mb-6 grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-black/70 border border-amber-500/30">
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setIsRegister(false);
                setError(null);
              }}
              className={`py-2 rounded-xl font-title font-black text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                !isRegister
                  ? "bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.6)]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <LogIn size={15} />
              <span>SIGN IN</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setIsRegister(true);
                setError(null);
              }}
              className={`py-2 rounded-xl font-title font-black text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isRegister
                  ? "bg-gradient-to-r from-emerald-400 to-green-600 text-slate-950 shadow-[0_0_15px_rgba(52,211,153,0.6)]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <UserPlus size={15} />
              <span>CREATE ACCOUNT</span>
            </button>
          </div>

          {/* Title and Subtitle */}
          <div className="text-center mb-6">
            <h2 className="font-title font-black text-2xl sm:text-3xl text-white tracking-wide drop-shadow">
              {isRegister ? "Join the Pasture" : "Welcome Back"}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {isRegister
                ? "Enter your credentials to battle live players & bots"
                : "Sign in to access your wallet, rank & cosmetics"}
            </p>
          </div>

          {/* Error Banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-3 rounded-xl bg-rose-950/90 border-2 border-rose-500 text-rose-200 text-xs font-bold flex items-center gap-2 shadow-lg"
              >
                <AlertTriangle size={16} className="text-rose-400 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Full Name Field (Register only) */}
            {isRegister && (
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-title font-bold text-slate-300 uppercase tracking-wider">
                  Player Name / Gamertag
                </label>
                <div className="relative flex items-center">
                  <User size={16} className="absolute left-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Pasture Slayer"
                    className="w-full bg-black/80 border-2 border-slate-700 focus:border-amber-400 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-title font-bold text-slate-300 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail size={16} className="absolute left-3.5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-black/80 border-2 border-slate-700 focus:border-amber-400 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-title font-bold text-slate-300 uppercase tracking-wider">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock size={16} className="absolute left-3.5 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={isRegister ? 8 : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isRegister ? "At least 8 characters" : "••••••••"}
                  className="w-full bg-black/80 border-2 border-slate-700 focus:border-amber-400 rounded-xl py-2.5 pl-10 pr-11 text-sm text-white placeholder-slate-500 outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Terms Notice (Register only) */}
            {isRegister && (
              <div className="flex items-center gap-2 text-[10px] text-slate-400 py-1">
                <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                <span>By signing up, you confirm you are 18+ and accept the Game Terms.</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isPending}
              className={`w-full mt-2 py-3.5 rounded-2xl font-title font-black text-base transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xl ${
                isRegister
                  ? "bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-400 text-slate-950 shadow-[0_0_25px_rgba(52,211,153,0.7)] hover:brightness-110 active:scale-98"
                  : "bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.7)] hover:brightness-110 active:scale-98"
              } ${isPending ? "opacity-75 cursor-not-allowed" : ""}`}
            >
              <span>{isPending ? "AUTHENTICATING..." : isRegister ? "CREATE ACCOUNT ➔" : "SIGN IN ➔"}</span>
            </button>
          </form>

          {/* Guest Mode Direct Access */}
          <div className="mt-6 pt-5 border-t border-slate-800 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                router.push("/home");
              }}
              className="text-xs font-title font-bold text-amber-400 hover:text-amber-300 hover:underline transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Skip for now — Play as Guest</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-20 text-center text-[11px] text-slate-500 font-medium py-2">
        <span>© 2026 Count Down 31 Arena · Live Socket Engine & Web3 Wallet</span>
      </footer>
    </div>
  );
}
