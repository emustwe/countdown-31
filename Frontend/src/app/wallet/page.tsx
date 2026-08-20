"use client";

import React, { useState } from "react";
import { Wallet, ArrowDownToLine, ArrowUpFromLine, Coins, ShieldCheck, Copy, Check, ExternalLink, Sparkles, Trophy } from "lucide-react";
import { ArcadeHeader } from "../../components/dune/ArcadeHeader";
import { ArcadeDrawerMenu } from "../../components/dune/ArcadeDrawerMenu";
import { OfficialRulesModal } from "../../components/dune/OfficialRulesModal";
import { soundManager } from "../../lib/soundManager";

const TRANSACTIONS = [
  { id: "tx1", type: "PRIZE_WIN", label: "Pasture Knockout 1st Place", amount: "+$250.00", date: "Today, 2:15 PM", status: "COMPLETED" },
  { id: "tx2", type: "DEPOSIT", label: "USDT Solana Deposit", amount: "+$100.00", date: "Yesterday", status: "COMPLETED" },
  { id: "tx3", type: "ENTRY_FEE", label: "Midnight Bull Tourney Entry", amount: "-$25.00", date: "2 days ago", status: "COMPLETED" },
  { id: "tx4", type: "PRIZE_WIN", label: "High Roller 31 Bounty", amount: "+$85.00", date: "3 days ago", status: "COMPLETED" },
];

export default function WalletPage() {
  const [tab, setTab] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("50");
  const [showDrawer, setShowDrawer] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [copied, setCopied] = useState(false);

  const depositAddress = "Cow89x31PastureSolanaVaultGildedKey999";

  function handleCopy() {
    soundManager.playClick();
    navigator.clipboard.writeText(depositAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

      {/* Main Cashier & Vault Arena */}
      <main className="relative z-10 w-full max-w-6xl mx-auto flex-1 my-4 flex flex-col gap-6">
        {/* Top Hero: Golden Vault Balance Card */}
        <div className="w-full bg-gradient-to-r from-amber-950/95 via-[#132019]/95 to-amber-950/95 border-2 sm:border-3 border-amber-400/80 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-300 shadow-xl">
              <Wallet size={32} />
            </div>
            <div>
              <span className="text-[10px] font-title font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
                <ShieldCheck size={12} />
                <span>SECURE INSTANT ARCADE VAULT</span>
              </span>
              <h1 className="font-title font-black text-3xl sm:text-5xl text-white tracking-tight mt-0.5">
                $1,250.00 <span className="text-xl font-bold text-amber-300">USDT</span>
              </h1>
              <span className="text-xs text-slate-300 flex items-center gap-1.5 mt-1">
                <Coins size={14} className="text-yellow-400 fill-yellow-400" />
                <span>Equivalent: <b>12,500 Gold Coins</b> · Instant Payouts</span>
              </span>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <button
              onClick={() => {
                soundManager.playClick();
                setTab("deposit");
              }}
              className="flex-1 md:flex-none px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-green-500 text-slate-950 font-title font-black text-sm shadow-[0_0_15px_rgba(52,211,153,0.7)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowDownToLine size={18} />
              <span>DEPOSIT FUNDS</span>
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                setTab("withdraw");
              }}
              className="flex-1 md:flex-none px-6 py-3 rounded-2xl bg-black/60 border border-amber-400/60 text-amber-300 font-title font-black text-sm hover:border-amber-400 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowUpFromLine size={18} />
              <span>WITHDRAW</span>
            </button>
          </div>
        </div>

        {/* 2-Column Grid: Cashier Action Box + Transaction Ledger */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Deposit / Withdraw Form */}
          <div className="lg:col-span-5 bg-gradient-to-b from-[#192b20]/95 via-[#0e1a13]/98 to-[#060c08] border-2 border-amber-400/50 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="font-title font-black text-sm sm:text-base text-amber-300 uppercase tracking-widest flex items-center gap-1.5">
                {tab === "deposit" ? <ArrowDownToLine size={16} /> : <ArrowUpFromLine size={16} />}
                <span>{tab === "deposit" ? "INSTANT DEPOSIT" : "INSTANT WITHDRAWAL"}</span>
              </span>
              <span className="text-[10px] font-title font-bold text-emerald-400">
                0% Gas Fee
              </span>
            </div>

            {/* Quick Amount Presets */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-title font-bold text-slate-300">Select Amount ($):</span>
              <div className="grid grid-cols-4 gap-2">
                {["10", "50", "100", "500"].map((val) => (
                  <button
                    key={val}
                    onClick={() => {
                      soundManager.playClick();
                      setAmount(val);
                    }}
                    className={`py-2 rounded-xl font-title font-black text-xs transition-all cursor-pointer border ${
                      amount === val
                        ? "bg-amber-400 text-slate-950 border-amber-300 shadow"
                        : "bg-black/60 text-slate-300 border-slate-800 hover:border-amber-400/40"
                    }`}
                  >
                    ${val}
                  </button>
                ))}
              </div>
            </div>

            {/* Crypto Address Box */}
            <div className="flex flex-col gap-1.5 mt-2">
              <span className="text-xs font-title font-bold text-slate-300">
                {tab === "deposit" ? "Send Solana / USDT To:" : "Your Withdrawal Address:"}
              </span>
              <div className="flex items-center justify-between p-3 rounded-2xl bg-black/80 border border-slate-700">
                <span className="text-xs font-mono text-amber-300 truncate max-w-[240px]">
                  {depositAddress}
                </span>
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:text-white transition-colors"
                  title="Copy Address"
                >
                  {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Action */}
            <button
              onClick={() => soundManager.playClick()}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 text-slate-950 font-title font-black text-base shadow-[0_0_20px_rgba(245,158,11,0.7)] hover:brightness-110 active:scale-95 transition-all mt-2 cursor-pointer"
            >
              {tab === "deposit" ? `CONFIRM $${amount} DEPOSIT` : `WITHDRAW $${amount} NOW`}
            </button>
          </div>

          {/* Right: Transaction Ledger */}
          <div className="lg:col-span-7 bg-gradient-to-b from-[#192b20]/95 via-[#0e1a13]/98 to-[#060c08] border-2 border-amber-400/50 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="font-title font-black text-sm sm:text-base text-amber-300 uppercase tracking-widest flex items-center gap-1.5">
                <Coins size={16} className="text-yellow-400" />
                <span>VAULT ACTIVITY LEDGER</span>
              </span>
              <span className="text-[10px] font-title font-bold text-slate-400">
                Real-Time Settlement
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {TRANSACTIONS.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-black/60 border border-slate-800 hover:border-amber-400/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-xl ${
                        tx.amount.startsWith("+")
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-400/40"
                          : "bg-rose-500/20 text-rose-400 border border-rose-400/40"
                      }`}
                    >
                      {tx.amount.startsWith("+") ? <ArrowDownToLine size={18} /> : <ArrowUpFromLine size={18} />}
                    </div>

                    <div className="flex flex-col">
                      <span className="font-title font-black text-xs sm:text-sm text-white">
                        {tx.label}
                      </span>
                      <span className="text-[10px] text-slate-400">{tx.date}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <span
                      className={`font-title font-black text-sm sm:text-base ${
                        tx.amount.startsWith("+") ? "text-emerald-400" : "text-slate-300"
                      }`}
                    >
                      {tx.amount}
                    </span>
                    <span className="text-[9px] font-title font-bold text-emerald-400/80">
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
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
