"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet, ArrowDownToLine, ArrowUpFromLine, Coins, ShieldCheck, Copy, Check, ExternalLink, Sparkles, RefreshCw, AlertCircle } from "lucide-react";
import { ArcadeHeader } from "../../components/dune/ArcadeHeader";
import { ArcadeDrawerMenu } from "../../components/dune/ArcadeDrawerMenu";
import { OfficialRulesModal } from "../../components/dune/OfficialRulesModal";
import { AuthGate } from "../../components/AuthGate";
import { useAuthStore } from "../../stores/auth-store";
import { useWallet, useDeposit, useWithdraw, useTransactions, useVerifyDeposit } from "../../lib/hooks/useWallet";
import { formatUsdt, parseUsdt } from "../../lib/money";
import { soundManager } from "../../lib/soundManager";

const PRESETS = ["10", "50", "100", "500", "1000"];
const SOLANA_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const TX_LABEL: Record<string, string> = {
  DEPOSIT: "Solana USDT Deposit",
  WITHDRAWAL: "Vault Withdrawal",
  BET_STAKE: "Arena Match Stake",
  BET_WIN: "Arena Victory Bounty",
  JACKPOT_WIN: "Pasture Jackpot Win",
  ADJUSTMENT: "Balance Adjustment",
  TOURNAMENT_ENTRY: "Tournament Entry Fee",
  TOURNAMENT_PRIZE: "Tournament 1st Prize",
  TOURNAMENT_REFUND: "Re-buy-in Refund",
};

const short = (a: string) => (a.length > 16 ? `${a.slice(0, 6)}…${a.slice(-6)}` : a);
const explorerTx = (sig: string) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`;

export default function WalletPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showRules, setShowRules] = useState(false);

  if (!accessToken) {
    return (
      <div className="friendly-page relative w-full min-h-screen bg-[#070e0a] overflow-x-hidden flex flex-col justify-between p-2 sm:p-6 select-none text-white">
        <div
          className="fixed inset-0 pointer-events-none bg-cover bg-center opacity-40 mix-blend-luminosity"
          style={{ backgroundImage: "url('/assets/barnaby/barnaby-field.jpg')" }}
        />
        <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.3)_0%,#040906_90%)]" />

        <div className="relative z-20">
          <ArcadeHeader onMenuClick={() => setShowDrawer(true)} />
        </div>

        <main className="relative z-10 w-full max-w-xl mx-auto flex-1 mt-12 mb-6 flex flex-col items-center justify-center text-center p-8 rounded-3xl bg-gradient-to-b from-[#192b20]/95 via-[#0e1a13]/98 to-[#060c08] border-2 border-amber-400 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-300 mb-4 shadow">
            <Wallet size={32} />
          </div>
          <h1 className="font-title font-black text-2xl sm:text-3xl text-amber-300 mb-2">YOUR WALLET</h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-6">
            Log in or create an account to view your live balance, make instant Solana deposits, and withdraw tournament winnings.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="btn-arcade-3d btn-arcade-amber px-8 py-3 rounded-2xl text-base"
          >
            SIGN IN TO OPEN VAULT
          </button>
        </main>

        <AuthGate open onClose={() => router.push("/home")} title="Sign in to open your wallet" message="Log in or create an account to view your balance and make deposits." />
        <ArcadeDrawerMenu isOpen={showDrawer} onClose={() => setShowDrawer(false)} onOpenRules={() => setShowRules(true)} />
        <OfficialRulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
      </div>
    );
  }

  return (
    <div className="friendly-page relative w-full min-h-screen bg-[#070e0a] overflow-x-hidden flex flex-col justify-between p-2 sm:p-6 select-none text-white">
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

      {/* Main Cashier Arena - WITH DEDICATED TOP CLEARANCE (Zero Overlap) */}
      <main className="relative z-10 w-full max-w-6xl mx-auto flex-1 mt-8 sm:mt-12 md:mt-14 mb-6 flex flex-col gap-6">
        <WalletContent />
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

function WalletContent() {
  const { data: wallet, isLoading: walletLoading, refetch: refetchWallet } = useWallet();
  const { data: txs, isLoading: txsLoading } = useTransactions();
  const deposit = useDeposit();
  const withdraw = useWithdraw();
  const verifyDeposit = useVerifyDeposit();

  const [tab, setTab] = useState<"deposit" | "withdraw">("deposit");
  const [copied, setCopied] = useState(false);

  // Deposit flow state
  const [depositAmount, setDepositAmount] = useState("50");
  const [txSignature, setTxSignature] = useState("");
  const [depErr, setDepErr] = useState("");
  const [depSuccess, setDepSuccess] = useState("");

  // Withdraw flow state
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("50");
  const [withErr, setWithErr] = useState("");
  const [withSuccess, setWithSuccess] = useState("");

  const depositAddress = wallet?.depositAddress || "Loading vault address...";

  function handleCopy() {
    soundManager.playClick();
    if (wallet?.depositAddress) {
      navigator.clipboard.writeText(wallet.depositAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleVerifyDeposit(e: React.FormEvent) {
    e.preventDefault();
    soundManager.playClick();
    setDepErr("");
    setDepSuccess("");
    if (!txSignature.trim()) {
      setDepErr("Please provide the wallet address you sent from.");
      return;
    }
    try {
      await verifyDeposit.mutateAsync({ fromAddress: txSignature.trim() });
      setDepSuccess("Deposit verified and credited successfully!");
      setTxSignature("");
      refetchWallet();
    } catch (err) {
      setDepErr(err instanceof Error ? err.message : "Failed to verify deposit.");
    }
  }

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();
    soundManager.playClick();
    setWithErr("");
    setWithSuccess("");
    if (!SOLANA_RE.test(withdrawAddress.trim())) {
      setWithErr("Invalid Solana wallet address.");
      return;
    }
    const amt = parseUsdt(withdrawAmount);
    if (!amt || BigInt(amt) <= 0n) {
      setWithErr("Invalid amount.");
      return;
    }
    try {
      await withdraw.mutateAsync({
        destinationAddress: withdrawAddress.trim(),
        amount: amt,
        idempotencyKey: crypto.randomUUID(),
      });
      setWithSuccess(`Withdrawal of $${withdrawAmount} USDT submitted successfully!`);
      setWithdrawAddress("");
      refetchWallet();
    } catch (err) {
      setWithErr(err instanceof Error ? err.message : "Withdrawal failed.");
    }
  }

  const rawBalance = wallet?.balance ?? "0";
  const formattedBalance = walletLoading ? "..." : formatUsdt(rawBalance);

  return (
    <>
      {/* Top Hero: Golden Vault Balance Card */}
      <div className="w-full bg-gradient-to-r from-amber-950/95 via-[#132019]/95 to-amber-950/95 border-2 sm:border-3 border-amber-400/80 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-300 shadow-xl">
            <Wallet size={32} />
          </div>
          <div>
            <span className="text-[10px] font-title font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
              <ShieldCheck size={12} />
              <span>YOUR FUNDS</span>
            </span>
            <h1 className="font-title font-black text-3xl sm:text-5xl text-white tracking-tight mt-0.5">
              {formattedBalance} <span className="text-xl font-bold text-amber-300">USDT</span>
            </h1>
            <span className="text-xs text-slate-300 flex items-center gap-1.5 mt-1">
              <Coins size={14} className="text-yellow-400 fill-yellow-400" />
              <span>Live balance · Solana Devnet Fast Payouts</span>
            </span>
          </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={() => {
              soundManager.playClick();
              setTab("deposit");
            }}
            className={`flex-1 md:flex-none px-6 py-3 rounded-2xl font-title font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow ${
              tab === "deposit"
                ? "bg-gradient-to-r from-emerald-400 to-green-500 text-slate-950 shadow-[0_0_15px_rgba(52,211,153,0.7)]"
                : "bg-black/60 border border-emerald-400/60 text-emerald-300 hover:border-emerald-400"
            }`}
          >
            <ArrowDownToLine size={18} />
            <span>DEPOSIT</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              setTab("withdraw");
            }}
            className={`flex-1 md:flex-none px-6 py-3 rounded-2xl font-title font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow ${
              tab === "withdraw"
                ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.7)]"
                : "bg-black/60 border border-amber-400/60 text-amber-300 hover:border-amber-400"
            }`}
          >
            <ArrowUpFromLine size={18} />
            <span>WITHDRAW</span>
          </button>
        </div>
      </div>

      {/* 2-Column Grid: Cashier Form + Transaction Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Deposit / Withdraw Box */}
        <div className="lg:col-span-5 bg-gradient-to-b from-[#192b20]/95 via-[#0e1a13]/98 to-[#060c08] border-2 border-amber-400/50 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="font-title font-black text-sm sm:text-base text-amber-300 uppercase tracking-widest flex items-center gap-1.5">
              {tab === "deposit" ? <ArrowDownToLine size={16} /> : <ArrowUpFromLine size={16} />}
              <span>{tab === "deposit" ? "SOLANA USDT DEPOSIT" : "INSTANT WITHDRAWAL"}</span>
            </span>
            <span className="text-[10px] font-title font-bold text-emerald-400">
              0% Vault Fee
            </span>
          </div>

          {tab === "deposit" ? (
            <div className="flex flex-col gap-4">
              {/* Deposit Address */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-title font-bold text-slate-300">Your Dedicated Solana Deposit Address:</span>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-black/80 border border-slate-700">
                  <span className="text-xs font-mono text-amber-300 truncate max-w-[240px]">
                    {depositAddress}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:text-white transition-colors cursor-pointer"
                    title="Copy Address"
                  >
                    {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              {/* Verify Tx Form */}
              <form onSubmit={handleVerifyDeposit} className="flex flex-col gap-3 pt-2 border-t border-white/10">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-title font-bold text-slate-300">Transaction Signature (After Sending):</label>
                  <input
                    value={txSignature}
                    onChange={(e) => setTxSignature(e.target.value)}
                    placeholder="Paste Solana Tx Signature..."
                    className="px-4 py-2.5 rounded-xl bg-black/70 border border-slate-700 text-white font-mono text-xs focus:border-amber-400 outline-none"
                  />
                </div>

                {depErr && <span className="text-xs text-rose-400 font-bold">{depErr}</span>}
                {depSuccess && <span className="text-xs text-emerald-400 font-bold">{depSuccess}</span>}

                <button
                  type="submit"
                  disabled={verifyDeposit.isPending}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-green-500 text-slate-950 font-title font-black text-sm shadow-[0_0_20px_rgba(52,211,153,0.7)] hover:brightness-110 active:scale-95 transition-all mt-1 cursor-pointer flex items-center justify-center gap-2"
                >
                  <RefreshCw size={16} className={verifyDeposit.isPending ? "animate-spin" : ""} />
                  <span>{verifyDeposit.isPending ? "VERIFYING TX..." : "VERIFY & CREDIT DEPOSIT"}</span>
                </button>
              </form>
            </div>
          ) : (
            /* Withdraw Form */
            <form onSubmit={handleWithdraw} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-title font-bold text-slate-300">Quick Amount ($):</span>
                <div className="grid grid-cols-4 gap-2">
                  {PRESETS.slice(0, 4).map((val) => (
                    <button
                      type="button"
                      key={val}
                      onClick={() => {
                        soundManager.playClick();
                        setWithdrawAmount(val);
                      }}
                      className={`py-2 rounded-xl font-title font-black text-xs transition-all cursor-pointer border ${
                        withdrawAmount === val
                          ? "bg-amber-400 text-slate-950 border-amber-300 shadow"
                          : "bg-black/60 text-slate-300 border-slate-800 hover:border-amber-400/40"
                      }`}
                    >
                      ${val}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-title font-bold text-slate-300">Recipient Solana Wallet Address:</label>
                <input
                  required
                  value={withdrawAddress}
                  onChange={(e) => setWithdrawAddress(e.target.value)}
                  placeholder="Paste destination Solana address..."
                  className="px-4 py-2.5 rounded-xl bg-black/70 border border-slate-700 text-white font-mono text-xs focus:border-amber-400 outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-title font-bold text-slate-300">Withdraw Amount ($ USDT):</label>
                <input
                  required
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  min="1"
                  className="px-4 py-2.5 rounded-xl bg-black/70 border border-slate-700 text-white font-title text-sm focus:border-amber-400 outline-none"
                />
              </div>

              {withErr && <span className="text-xs text-rose-400 font-bold">{withErr}</span>}
              {withSuccess && <span className="text-xs text-emerald-400 font-bold">{withSuccess}</span>}

              <button
                type="submit"
                disabled={withdraw.isPending}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 text-slate-950 font-title font-black text-sm shadow-[0_0_20px_rgba(245,158,11,0.7)] hover:brightness-110 active:scale-95 transition-all mt-1 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{withdraw.isPending ? "PROCESSING..." : `WITHDRAW $${withdrawAmount} USDT`}</span>
              </button>
            </form>
          )}
        </div>

        {/* Right: Live Transaction Ledger */}
        <div className="lg:col-span-7 bg-gradient-to-b from-[#192b20]/95 via-[#0e1a13]/98 to-[#060c08] border-2 border-amber-400/50 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="font-title font-black text-sm sm:text-base text-amber-300 uppercase tracking-widest flex items-center gap-1.5">
              <Coins size={16} className="text-yellow-400" />
              <span>RECENT ACTIVITY</span>
            </span>
            <span className="text-[10px] font-title font-bold text-slate-400">
              On-Chain Activity
            </span>
          </div>

          {txsLoading ? (
            <div className="p-12 text-center text-slate-400 font-title font-bold">
              Loading transactions...
            </div>
          ) : !txs || !txs.entries || txs.entries.length === 0 ? (
            <div className="p-8 rounded-2xl bg-black/60 border border-slate-800 text-center text-slate-400">
              No transactions recorded yet. Make a deposit to start!
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1">
              {txs.entries.map((tx) => {
                const isPositive = ["DEPOSIT", "BET_WIN", "JACKPOT_WIN", "TOURNAMENT_PRIZE", "TOURNAMENT_REFUND"].includes(tx.type);
                const label = TX_LABEL[tx.type] || tx.type;
                const sig = tx.transfer?.txSignature;

                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-black/60 border border-slate-800 hover:border-amber-400/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-xl ${
                          isPositive
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-400/40"
                            : "bg-rose-500/20 text-rose-400 border border-rose-400/40"
                        }`}
                      >
                        {isPositive ? <ArrowDownToLine size={18} /> : <ArrowUpFromLine size={18} />}
                      </div>

                      <div className="flex flex-col">
                        <span className="font-title font-black text-xs sm:text-sm text-white">
                          {label}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(tx.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <span
                        className={`font-title font-black text-sm sm:text-base ${
                          isPositive ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {isPositive ? "+" : "-"}{formatUsdt(tx.amount)} USDT
                      </span>

                      {sig && (
                        <a
                          href={explorerTx(sig)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-cyan-400 hover:underline flex items-center gap-0.5"
                        >
                          <span>{short(sig)}</span>
                          <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
