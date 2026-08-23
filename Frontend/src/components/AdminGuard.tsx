"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Lock, Mail, Eye, EyeOff, AlertTriangle, ArrowLeft, KeyRound, Sparkles } from "lucide-react";
import { useAuthStore } from "../stores/auth-store";
import { useProfile, useLogin, useLogout } from "../lib/hooks/useAuth";
import { ApiError } from "../lib/api-client";
import { soundManager } from "../lib/soundManager";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const { data: profile, isLoading } = useProfile();
  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  const [email, setEmail] = useState("admin@auroraways.demo");
  const [password, setPassword] = useState("Admin123!");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already authenticated with ADMIN role, grant instant access
  if (!isLoading && profile && (profile.role === "ADMIN" || user?.role === "ADMIN")) {
    return <>{children}</>;
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    soundManager.playClick();
    setError(null);

    try {
      const res = await loginMutation.mutateAsync({ email: email.trim(), password });
      if (res.user.role !== "ADMIN") {
        setError("This account is not an Administrator. Please sign in with an Admin account.");
        return;
      }
      soundManager.playVictory();
    } catch (err) {
      setError(err instanceof ApiError ? String(err.envelope?.message || err.message) : "Invalid administrator credentials.");
    }
  }

  async function handleSwitchAccount() {
    soundManager.playClick();
    await logoutMutation.mutateAsync();
    setEmail("admin@auroraways.demo");
    setPassword("Admin123!");
    setError(null);
  }

  return (
    <div className="relative w-full min-h-screen bg-[#070e0a] overflow-x-hidden flex flex-col items-center justify-center p-4 select-none text-white font-sans">
      {/* Background Pasture Atmosphere */}
      <div
        className="fixed inset-0 pointer-events-none bg-cover bg-center opacity-30 mix-blend-luminosity"
        style={{ backgroundImage: "url('/assets/barnaby/barnaby-field.jpg')" }}
      />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.5)_0%,#040906_90%)]" />

      {/* Admin Gate Center Console */}
      <div className="relative z-10 w-full max-w-md bg-gradient-to-b from-[#18281e] via-[#0d1811] to-[#050a07] border-2 sm:border-3 border-amber-400 rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_40px_rgba(245,158,11,0.3)] flex flex-col items-center text-center">
        {/* Top Rivet Accents */}
        <div className="absolute top-0 inset-x-0 h-4 bg-gradient-to-r from-amber-700 via-amber-400 to-amber-700 border-b border-amber-300/60 shadow flex items-center justify-around px-4 pointer-events-none rounded-t-2xl">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-amber-950 border border-amber-300 shadow-inner" />
          ))}
        </div>

        {/* Shield Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 border-2 border-amber-200 flex items-center justify-center text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.7)] mt-2 mb-3">
          <ShieldAlert size={32} className="drop-shadow" />
        </div>

        {/* Title */}
        <div className="flex items-center gap-1.5 text-[10px] font-title font-black text-amber-400 uppercase tracking-widest">
          <Sparkles size={12} />
          <span>RESTRICTED ACCESS</span>
        </div>
        <h2 className="font-title font-black text-2xl text-white tracking-wide mt-0.5">
          Admin Console
        </h2>
        <p className="text-xs text-slate-300 mt-1 max-w-xs leading-relaxed">
          Sign in with your Administrator credentials to access platform controls, tournament approvals, and sponsor management.
        </p>

        {/* Error Alert */}
        {error && (
          <div className="w-full my-3 p-3 rounded-xl bg-rose-950/90 border-2 border-rose-500 text-rose-200 text-xs font-bold flex items-center gap-2 text-left shadow">
            <AlertTriangle size={16} className="text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* If signed in as non-admin player */}
        {accessToken && user && user.role !== "ADMIN" ? (
          <div className="w-full my-4 flex flex-col gap-3">
            <div className="p-3.5 rounded-2xl bg-black/60 border border-amber-500/30 text-xs text-slate-300 text-left">
              <span className="text-slate-400">Currently signed in as:</span>
              <p className="font-title font-black text-amber-300 truncate">{user.email} (Role: {user.role})</p>
              <p className="text-[11px] text-slate-400 mt-1">This account does not have administrator privileges.</p>
            </div>

            <button
              onClick={handleSwitchAccount}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-title font-black text-xs uppercase tracking-wider shadow hover:brightness-110 cursor-pointer"
            >
              SWITCH TO ADMIN ACCOUNT
            </button>
          </div>
        ) : (
          /* Sign In Form */
          <form onSubmit={handleAdminLogin} className="w-full flex flex-col gap-3.5 mt-4 text-left">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-title font-bold text-slate-300 uppercase">
                Admin Email
              </label>
              <div className="relative flex items-center">
                <Mail size={16} className="absolute left-3.5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@auroraways.demo"
                  className="w-full bg-black/80 border-2 border-slate-700 focus:border-amber-400 rounded-xl py-2.5 pl-10 pr-3.5 text-sm text-white outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-title font-bold text-slate-300 uppercase">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock size={16} className="absolute left-3.5 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Admin123!"
                  className="w-full bg-black/80 border-2 border-slate-700 focus:border-amber-400 rounded-xl py-2.5 pl-10 pr-10 text-sm text-white outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Quick Fill Dev Preset */}
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setEmail("admin@auroraways.demo");
                setPassword("Admin123!");
              }}
              className="text-[11px] text-amber-400 hover:underline font-title font-bold flex items-center gap-1 cursor-pointer self-start"
            >
              <KeyRound size={12} />
              <span>Fill Seed Admin Credentials (Dev)</span>
            </button>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full mt-2 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-title font-black text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.6)] hover:brightness-110 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Lock size={15} />
              <span>{loginMutation.isPending ? "AUTHENTICATING..." : "SIGN IN TO ADMIN CONSOLE"}</span>
            </button>
          </form>
        )}

        {/* Back to Arena */}
        <button
          onClick={() => {
            soundManager.playClick();
            router.push("/home");
          }}
          className="mt-4 text-xs font-title font-bold text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <ArrowLeft size={13} />
          <span>Return to Game Arena</span>
        </button>
      </div>
    </div>
  );
}
