"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  ShieldCheck,
  User,
} from "lucide-react";
import { useSponsorLogin } from "../../../lib/hooks/useSponsorPortal";
import { useSponsorAuthStore } from "../../../stores/sponsor-auth-store";
import { soundManager } from "../../../lib/soundManager";

// Sponsor sign-in — sponsors use the username/password an admin issued them.
export default function SponsorLoginPage() {
  const router = useRouter();
  const login = useSponsorLogin();
  const token = useSponsorAuthStore((s) => s.token);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (token) router.replace("/sponsor");
  }, [token, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    soundManager.playClick();
    try {
      await login.mutateAsync({ username: username.trim(), password });
      soundManager.playSuccess();
      router.replace("/sponsor");
    } catch {
      soundManager.playError();
      setError("Invalid username or password.");
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
              VERA 31
            </h1>
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest -mt-0.5">
              Sponsor Portal
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
          <span>Back to Arena</span>
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

          {/* Portal Badge (mirrors the player auth's mode tabs) */}
          <div className="mt-2 mb-6 p-1 rounded-2xl bg-black/70 border border-amber-500/30">
            <div className="py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-title font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_15px_rgba(245,158,11,0.6)] flex items-center justify-center gap-2">
              <Building2 size={15} />
              <span>SPONSOR SIGN IN</span>
            </div>
          </div>

          {/* Title and Subtitle */}
          <div className="text-center mb-6">
            <h2 className="font-title font-black text-2xl sm:text-3xl text-white tracking-wide drop-shadow">
              Brand Headquarters
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Use the credentials your admin issued you
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
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-title font-bold text-slate-300 uppercase tracking-wider">
                Sponsor Username
              </label>
              <div className="relative flex items-center">
                <User size={16} className="absolute left-3.5 text-slate-400" />
                <input
                  type="text"
                  autoComplete="username"
                  autoFocus
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. victoryark-0020"
                  className="w-full bg-black/80 border-2 border-slate-700 focus:border-amber-400 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-title font-bold text-slate-300 uppercase tracking-wider">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock size={16} className="absolute left-3.5 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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

            <div className="flex items-center gap-2 text-[10px] text-slate-400 py-1">
              <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
              <span>Sponsor accounts are issued by an admin — they are not self-registered.</span>
            </div>

            <button
              type="submit"
              disabled={login.isPending || !username.trim() || !password}
              className={`w-full mt-2 py-3.5 rounded-2xl font-title font-black text-base transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.7)] hover:brightness-110 active:scale-98 ${
                login.isPending || !username.trim() || !password ? "opacity-75 cursor-not-allowed" : ""
              }`}
            >
              <LogIn size={18} />
              <span>{login.isPending ? "AUTHENTICATING..." : "SIGN IN ➔"}</span>
            </button>
          </form>

          {/* Become a sponsor / player sign-in */}
          <div className="mt-6 pt-5 border-t border-slate-800 flex flex-col items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                router.push("/sponsorship");
              }}
              className="text-xs font-title font-bold text-amber-400 hover:text-amber-300 hover:underline transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Not a sponsor yet? Apply to sponsor</span>
              <ArrowRight size={13} />
            </button>
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                router.push("/login");
              }}
              className="text-[11px] font-bold text-slate-500 hover:text-slate-300 transition-all cursor-pointer"
            >
              Looking for the player sign in?
            </button>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-20 text-center text-[11px] text-slate-500 font-medium py-2">
        <span>© 2026 Vera 31 Arena · Sponsor Portal</span>
      </footer>
    </div>
  );
}
