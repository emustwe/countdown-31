"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, ArrowUpFromLine, Check, Copy, ExternalLink, Gamepad2, Plus, ShieldCheck, Trophy, WalletCards } from "lucide-react";
import { AuthGate } from "../../components/AuthGate";
import { useAuthStore } from "../../stores/auth-store";
import { PageShell, OrbIcon } from "../../components/dune/Shell";
import { useFlipIndex } from "../../components/dune/FlipText";
import { useWallet, useDeposit, useWithdraw, useTransactions, useVerifyDeposit } from "../../lib/hooks/useWallet";
import { parseUsdt, formatUsdt } from "../../lib/money";
import { usdt } from "../../lib/dune-skins";
import { ApiError } from "../../lib/api-client";

const PRESETS = ["10", "50", "100", "500", "1000"];
const SOLANA_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const TX_LABEL: Record<string, [string, string]> = {
  DEPOSIT: ["Deposit", "입금"],
  WITHDRAWAL: ["Withdrawal", "출금"],
  BET_STAKE: ["Bet stake", "베팅"],
  BET_WIN: ["Bet win", "당첨"],
  JACKPOT_WIN: ["Jackpot win", "잭팟 당첨"],
  ADJUSTMENT: ["Adjustment", "조정"],
  TOURNAMENT_ENTRY: ["Tournament entry", "토너먼트 참가"],
  TOURNAMENT_PRIZE: ["Tournament prize", "토너먼트 상금"],
  TOURNAMENT_REFUND: ["Re-buy-in refund", "리바이인 환불"],
};

type Kind = "win" | "deposit" | "fee" | "other";
function classify(type: string): Kind {
  if (["BET_WIN", "JACKPOT_WIN", "TOURNAMENT_PRIZE", "TOURNAMENT_REFUND"].includes(type)) return "win";
  if (type === "DEPOSIT") return "deposit";
  if (["BET_STAKE", "TOURNAMENT_ENTRY", "WITHDRAWAL"].includes(type)) return "fee";
  return "other";
}
const short = (a: string) => (a.length > 16 ? `${a.slice(0, 6)}…${a.slice(-6)}` : a);
const explorerTx = (sig: string) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`;

export default function WalletPage() {
  // Gate on the persisted user, not the access token — the token is memory-only now (#4) and is
  // null for a split second on reload while it's re-minted from the refresh cookie.
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  if (!user) {
    return (
      <PageShell>
        <main className="page-main">
          <div className="coming-soon-panel glass">
            <OrbIcon><WalletCards size={26} /></OrbIcon>
            <h1>Your wallet</h1>
            <p>Log in or create an account to view your balance and make deposits.</p>
          </div>
        </main>
        <AuthGate open onClose={() => router.push("/home")} title="Sign in to open your wallet" message="Log in or create an account to view your balance and make deposits." />
      </PageShell>
    );
  }
  return (
    <PageShell>
      <WalletContent />
    </PageShell>
  );
}

function WalletContent() {
  const user = useAuthStore((s) => s.user);
  const { data: wallet } = useWallet();
  const { data: tx } = useTransactions();
  const deposit = useDeposit();
  const withdraw = useWithdraw();
  const verify = useVerifyDeposit();

  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("50");
  const [destination, setDestination] = useState("");
  const [wpassword, setWpassword] = useState("");
  const [wmfa, setWmfa] = useState("");
  const [depositFrom, setDepositFrom] = useState("");
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState("All");
  const [msg, setMsg] = useState<{ text: string; bad?: boolean; sig?: string } | null>(null);
  const ko = useFlipIndex(5000) === 1;

  const live = !!wallet?.live;
  const balanceUsdt = wallet ? usdt(wallet.balance) : 0;
  const depositAddress = wallet?.depositAddress ?? "";
  const busy = deposit.isPending || withdraw.isPending || verify.isPending;

  function baseAmount(): string | null {
    try {
      const b = parseUsdt(amount.trim());
      return BigInt(b) > 0n ? b : null;
    } catch {
      return null;
    }
  }

  function switchMode(next: "deposit" | "withdraw") {
    setMode(next);
    setMsg(null);
  }

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(depositAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  async function onDeposit() {
    setMsg(null);
    if (live) {
      if (!SOLANA_RE.test(depositFrom.trim())) {
        setMsg({ text: ko ? "보낸 Solana 주소를 입력하세요." : "Enter the Solana address you sent from.", bad: true });
        return;
      }
      try {
        const res = await verify.mutateAsync({ fromAddress: depositFrom.trim() });
        if (res.credited.length === 0) {
          setMsg({ text: ko ? "입금이 감지되지 않았습니다. Phantom에서 전송 후 다시 시도하세요." : "No deposit found yet. Send the USDT to the address above, then try again.", bad: true });
          return;
        }
        const total = res.credited.reduce((s, c) => s + Number(c.amount) / 1e6, 0);
        setMsg({ text: ko ? `${total} USDT 입금 완료` : `Deposited ${total} USDT`, sig: res.credited[0]!.txSignature });
      } catch (e) {
        setMsg({ text: e instanceof ApiError ? String(e.message) : ko ? "실패" : "Failed", bad: true });
      }
      return;
    }
    // Mock mode: instant credit of the entered amount.
    const base = baseAmount();
    if (!base) {
      setMsg({ text: ko ? "올바른 금액을 입력하세요." : "Enter a valid amount.", bad: true });
      return;
    }
    try {
      const res = await deposit.mutateAsync({ amount: base, idempotencyKey: crypto.randomUUID() });
      setMsg({ text: ko ? `${amount} USDT 입금 완료` : `Deposited ${amount} USDT`, sig: res.txSignature });
    } catch (e) {
      setMsg({ text: e instanceof ApiError ? String(e.message) : ko ? "실패" : "Failed", bad: true });
    }
  }

  async function onWithdraw() {
    setMsg(null);
    const base = baseAmount();
    if (!base) {
      setMsg({ text: ko ? "올바른 금액을 입력하세요." : "Enter a valid amount.", bad: true });
      return;
    }
    if (!SOLANA_RE.test(destination.trim())) {
      setMsg({ text: ko ? "올바른 Solana(USDT) 주소를 입력하세요." : "Enter a valid Solana (USDT) address.", bad: true });
      return;
    }
    if (!wpassword) {
      setMsg({ text: ko ? "확인을 위해 비밀번호를 입력하세요." : "Enter your password to confirm the withdrawal.", bad: true });
      return;
    }
    try {
      const res = await withdraw.mutateAsync({
        amount: base,
        destinationAddress: destination.trim(),
        idempotencyKey: crypto.randomUUID(),
        password: wpassword,
        mfaCode: wmfa.trim() || undefined,
      });
      setWpassword("");
      setWmfa("");
      setMsg({ text: ko ? `${amount} USDT 출금 완료` : `Withdrew ${amount} USDT`, sig: res.txSignature });
    } catch (e) {
      setMsg({ text: e instanceof ApiError ? String(e.message) : ko ? "실패" : "Failed", bad: true });
    }
  }

  const entries = (tx?.entries ?? []).filter((e) => {
    const k = classify(e.type);
    if (filter === "Wins") return k === "win";
    if (filter === "Deposits") return k === "deposit";
    return true;
  });

  return (
    <main className="page-main wallet-page">
      <section className="wallet-hero">
        <div>
          <p className="eyebrow">{ko ? "USDT 지갑" : "YOUR USDT WALLET"}</p>
          <h1>{balanceUsdt.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT</h1>
          <p>{ko ? "사용 가능한 잔액 · Solana USDT" : "Available balance · USDT on Solana"}</p>
          <div>
            <button className={`primary ${mode === "deposit" ? "" : "secondary"}`} onClick={() => switchMode("deposit")}>
              <ArrowDownToLine size={18} /> {ko ? "입금" : "Deposit"}
            </button>
            <button className={`primary ${mode === "withdraw" ? "" : "secondary"}`} onClick={() => switchMode("withdraw")}>
              <ArrowUpFromLine size={18} /> {ko ? "출금" : "Withdraw"}
            </button>
          </div>
        </div>
        <div className="vault-art">
          <Trophy size={54} />
          <span>USDT · SOLANA</span>
        </div>
      </section>

      <section className="content wallet-layout">
        <div className="deposit-card glass">
          {mode === "deposit" ? (
            <>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">{ko ? "USDT 충전" : "ADD USDT"}</p>
                  <h2>{ko ? "입금" : "Deposit"}</h2>
                </div>
                <ShieldCheck size={22} />
              </div>

              <label>{ko ? "이 주소로 USDT(Solana)를 보내세요" : "Send USDT (Solana) to this address"}</label>
              <button type="button" className="deposit-address" onClick={copyAddress} title="Copy address">
                <span style={{ wordBreak: "break-all" }}>{depositAddress || "…"}</span>
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>

              {!live && (
                <>
                  <label>{ko ? "금액 (USDT)" : "Amount (USDT)"}</label>
                  <div className="amount-grid">
                    {PRESETS.map((x) => (
                      <button className={amount === x ? "active" : ""} onClick={() => setAmount(x)} key={x}>
                        {x} USDT
                      </button>
                    ))}
                  </div>
                  <div className="money-input">
                    <span>$</span>
                    <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
                    <small>USDT</small>
                  </div>
                </>
              )}

              {live && (
                <>
                  <label>{ko ? "보낸 주소 (내 Solana 지갑)" : "Your sending address (the wallet you sent from)"}</label>
                  <input className="addr-input" value={depositFrom} onChange={(e) => setDepositFrom(e.target.value)} placeholder={ko ? "예: 4PPcLxX…hXEm4" : "e.g. 4PPcLxX…hXEm4"} />
                </>
              )}

              <button className="primary full xl" disabled={busy} onClick={onDeposit}>
                {busy ? (ko ? "처리 중…" : "Processing…") : live ? (ko ? "입금 확인" : "Check for my deposit") : ko ? `${amount} USDT 입금` : `Deposit ${amount} USDT`}
              </button>
            </>
          ) : (
            <>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">{ko ? "USDT 출금" : "CASH OUT USDT"}</p>
                  <h2>{ko ? "출금" : "Withdraw"}</h2>
                </div>
                <ShieldCheck size={22} />
              </div>

              <label>{ko ? "금액 (USDT)" : "Amount (USDT)"}</label>
              <div className="amount-grid">
                {PRESETS.map((x) => (
                  <button className={amount === x ? "active" : ""} onClick={() => setAmount(x)} key={x}>
                    {x} USDT
                  </button>
                ))}
              </div>
              <div className="money-input">
                <span>$</span>
                <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
                <small>USDT</small>
              </div>

              <label>{ko ? "받는 Solana 주소" : "Destination Solana address"}</label>
              <input className="addr-input" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder={ko ? "예: 7xKqABC…9fJ2" : "e.g. 7xKqABC…9fJ2"} />

              {/* Step-up re-authentication: a withdrawal requires the account password (and a 2FA
                  code if enabled), so a stolen session alone can't move money. */}
              <label>{ko ? "비밀번호로 확인" : "Confirm with your password"}</label>
              <input className="addr-input" type="password" autoComplete="current-password" value={wpassword} onChange={(e) => setWpassword(e.target.value)} placeholder={ko ? "계정 비밀번호" : "Account password"} />

              {user?.mfaEnabled && (
                <>
                  <label>{ko ? "인증 앱 코드" : "Authenticator code"}</label>
                  <input className="addr-input" inputMode="numeric" value={wmfa} onChange={(e) => setWmfa(e.target.value)} placeholder="123456" />
                </>
              )}

              <button className="primary full xl" disabled={busy} onClick={onWithdraw}>
                {busy ? (ko ? "처리 중…" : "Processing…") : ko ? `${amount} USDT 출금` : `Withdraw ${amount} USDT`}
              </button>
            </>
          )}

          {msg && (
            <p className="secure-note" style={{ color: msg.bad ? "var(--danger)" : "var(--green)" }}>
              {msg.bad ? null : <Check size={15} />} {msg.text}
              {msg.sig && (
                <>
                  {" "}
                  <a href={explorerTx(msg.sig)} target="_blank" rel="noreferrer" style={{ color: "var(--cyan)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                    {short(msg.sig)} <ExternalLink size={12} />
                  </a>
                </>
              )}
            </p>
          )}
          <p className="secure-note">
            <ShieldCheck size={15} /> {ko ? "USDT · Solana 네트워크로 안전하게 정산됩니다." : "Settled securely on the USDT · Solana network."}
          </p>
        </div>

        <div className="transaction-card glass">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{ko ? "최근 활동" : "RECENT ACTIVITY"}</p>
              <h2>{ko ? "거래 내역" : "Transactions"}</h2>
            </div>
            <div className="tabs mini">
              {(["All", "Wins", "Deposits"] as const).map((t) => (
                <button key={t} className={filter === t ? "active" : ""} onClick={() => setFilter(t)}>
                  {ko ? (t === "All" ? "전체" : t === "Wins" ? "당첨" : "입금") : t}
                </button>
              ))}
            </div>
          </div>
          {entries.length === 0 && <p className="muted">{ko ? "아직 거래 내역이 없습니다." : "No transactions yet."}</p>}
          {entries.map((e) => {
            const k = classify(e.type);
            const positive = !e.amount.startsWith("-");
            const sub = e.transfer
              ? `${e.transfer.direction === "WITHDRAWAL" ? (ko ? "→ " : "to ") : ""}${short(e.transfer.address)}`
              : e.refType ?? (ko ? "지갑" : "wallet");
            const pair = TX_LABEL[e.type] ?? [e.type.replace(/_/g, " ").toLowerCase(), e.type];
            return (
              <div className="transaction" key={e.id}>
                <OrbIcon tone={k === "win" ? "gold" : k === "deposit" ? "cyan" : "violet"}>
                  {k === "win" ? <Trophy size={19} /> : k === "deposit" ? <Plus size={19} /> : <Gamepad2 size={19} />}
                </OrbIcon>
                <span>
                  <b>{ko ? pair[1] : pair[0]}</b>
                  <small style={{ wordBreak: "break-all" }}>
                    {sub} · {new Date(e.createdAt).toLocaleDateString()}
                  </small>
                </span>
                <strong className={positive ? "positive" : ""}>{formatUsdt(e.amount)}</strong>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
