"use client";

import { useEffect, useRef, useState } from "react";
import { CircleHelp, Sparkles, X } from "lucide-react";
import { Pill } from "./Shell";
import { FlipText, useFlipIndex } from "./FlipText";
import { skinFor, coins as toCoins, coinsToMinor } from "../../lib/dune-skins";
import { highlightedCells } from "../../game/highlightedCells";
import { useSettingsStore } from "../../stores/settings-store";
import { useGameConfig } from "../../lib/hooks/useGame";
import { playSpinStart, playWin, playReelStop, playJackpot, playScatter, playWild, playFeatureTrigger } from "../../game/sound";
import { ApiError } from "../../lib/api-client";
import type { FreeSpinRevealResponse, PublicMathModel, SpinApiResponse } from "../../lib/api-types";

// Map our engine symbol ids to the designer's creature art / card glyphs.
const ART: Record<string, string> = { H1: "ogre", H2: "witch", H3: "jackal", W: "wild", S: "scatter", JP: "jackpot" };
const GLYPH: Record<string, string> = { L1: "A", L2: "K", L3: "Q", L4: "J" };
const POOL = ["H1", "H2", "H3", "L1", "L2", "L3", "L4", "W", "S", "JP"];
const MIN_BET = 10;
const MAX_BET = 500; // coins; MAX_BET on the server is 50,000 minor units = 500 coins
const BET_STEP = 10;
const clampBet = (n: number) => Math.max(MIN_BET, Math.min(MAX_BET, Math.round(n / BET_STEP) * BET_STEP || MIN_BET));
const randSym = () => POOL[Math.floor(Math.random() * POOL.length)] ?? "L1";
const FILLER = [
  "H1", "L1", "L2", "L3", "L4",
  "H2", "H3", "L1", "L2", "W",
  "L3", "S", "JP", "L4", "H1",
  "H2", "L1", "L2", "H3", "L3",
  "L4", "W", "H1", "S", "JP",
];

// Rows for the paytable modal — labels are the designer's art; multipliers come from the
// real (unchanged) math model at runtime.
const PAY_ROWS: { id: string; art?: string; glyph?: string; label: string; labelKo: string }[] = [
  { id: "H1", art: "ogre", label: "Party Ogre", labelKo: "파티 오거" },
  { id: "H2", art: "witch", label: "Potion Witch", labelKo: "포션 마녀" },
  { id: "H3", art: "jackal", label: "Fire Jackal", labelKo: "파이어 자칼" },
  { id: "L1", glyph: "A", label: "Ace", labelKo: "에이스" },
  { id: "L2", glyph: "K", label: "King", labelKo: "킹" },
  { id: "L3", glyph: "Q", label: "Queen", labelKo: "퀸" },
  { id: "L4", glyph: "J", label: "Jack", labelKo: "잭" },
];

function fiveOfMult(config: PublicMathModel | undefined, id: string): string {
  const row = config?.paytable?.[id as keyof typeof config.paytable];
  const v = Array.isArray(row) ? row[3] : undefined;
  return v ? `${v}×` : "—";
}

function SlotCell({ symbolId, winning, spinning }: { symbolId: string; winning: boolean; spinning: boolean }) {
  const art = ART[symbolId];
  const glyph = GLYPH[symbolId] ?? symbolId;
  return (
    <div className={`slot-cell sym-${symbolId} ${art ? `monster-symbol ${art}` : "low-symbol"} ${winning ? "winning" : ""} ${spinning ? "spinning" : ""}`}>
      {art ? (
        <>
          <span className={`monster-art ${art}`} />
          {["wild", "scatter", "jackpot"].includes(art) && <b className="symbol-badge">{art.toUpperCase()}</b>}
        </>
      ) : (
        <span className="low-glyph">{glyph}</span>
      )}
    </div>
  );
}

/** The shared slot board + spin/free-spin animation logic + rules modal. Used by both the
 * leaderboard-tournament game and bracket match play — the caller injects the spin/free-spin
 * calls (which target different endpoints) and is told the running coin total via onCoins. */
export function SlotStage({
  skin,
  startingCreditsMinor,
  onSpin,
  onFreeSpin,
  onCoins,
}: {
  skin: ReturnType<typeof skinFor>;
  startingCreditsMinor: string;
  onSpin: (input: { totalBet: string; idempotencyKey: string }) => Promise<SpinApiResponse>;
  onFreeSpin: (roundId: string) => Promise<FreeSpinRevealResponse>;
  onCoins?: (coins: number) => void;
}) {
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const { data: config } = useGameConfig();
  const ko = useFlipIndex(5000) === 1;
  const koRef = useRef(false);
  koRef.current = ko;
  const [cells, setCells] = useState<string[]>(FILLER);
  const [winning, setWinning] = useState<Set<number>>(new Set());
  const [spinReels, setSpinReels] = useState<boolean[]>([false, false, false, false, false]);
  const [coins, setCoins] = useState(toCoins(startingCreditsMinor));
  const [lastWin, setLastWin] = useState(0);
  const [bet, setBet] = useState(100);
  const [showRules, setShowRules] = useState(false);
  const [winBanner, setWinBanner] = useState<{ title: string; amount: string; kind: "jackpot" | "big" } | null>(null);
  const [flash, setFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const spinReelsRef = useRef<boolean[]>([false, false, false, false, false]);
  const churnRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const anySpinning = spinReels.some(Boolean);

  function stopChurn() {
    if (churnRef.current) {
      clearInterval(churnRef.current);
      churnRef.current = null;
    }
  }

  async function doSpin() {
    if (busyRef.current) return;
    if (coins < bet) {
      setError(koRef.current ? "코인이 부족합니다!" : "Insufficient coin balance!");
      return;
    }
    busyRef.current = true;
    setError(null);
    setWinBanner(null);
    setWinning(new Set());
    const allSpin = [true, true, true, true, true];
    spinReelsRef.current = allSpin;
    setSpinReels(allSpin);
    if (soundEnabled) playSpinStart();
    churnRef.current = setInterval(() => {
      setCells((prev) => prev.map((c, idx) => (spinReelsRef.current[idx % 5] ? randSym() : c)));
    }, 70);
    try {
      const res = await onSpin({ totalBet: coinsToMinor(String(bet)), idempotencyKey: crypto.randomUUID() });
      const grid = res.base.grid;
      for (let reel = 0; reel < 5; reel++) {
        await new Promise((r) => setTimeout(r, reel === 0 ? 480 : 220));
        setCells((prev) => {
          const n = [...prev];
          for (let row = 0; row < 5; row++) n[row * 5 + reel] = grid[reel]?.[row] ?? "L1";
          return n;
        });
        spinReelsRef.current = spinReelsRef.current.map((v, i) => (i === reel ? false : v));
        setSpinReels([...spinReelsRef.current]);
        if (soundEnabled) playReelStop();
      }
      stopChurn();
      const newCoins = toCoins(res.newBalance);
      setCoins(newCoins);
      onCoins?.(newCoins);
      const winCoins = toCoins(res.totalWin);
      setLastWin(winCoins);
      const hs = highlightedCells(res.base.lines, res.base.grid);
      setWinning(
        new Set(
          [...hs].map((k) => {
            const [reel = 0, row = 0] = k.split("-").map(Number);
            return row * 5 + reel;
          }),
        ),
      );
      const flat = grid.flat();
      if (soundEnabled) {
        if (res.base.jackpot) playJackpot();
        else if (winCoins > 0) playWin();
        if (flat.includes("W")) setTimeout(() => playWild(), 60);
        if (flat.includes("S")) setTimeout(() => playScatter(), 130);
        if (res.feature) setTimeout(() => playFeatureTrigger(), 220);
      }
      const coinWord = koRef.current ? "코인" : "COINS";
      if (res.base.jackpot) {
        setWinBanner({ title: koRef.current ? "잭팟!" : "JACKPOT!", amount: `+${winCoins.toLocaleString()} ${coinWord}`, kind: "jackpot" });
        setFlash(true);
        setTimeout(() => setFlash(false), 800);
      } else if (winCoins >= bet * 5) {
        setWinBanner({ title: koRef.current ? "빅 윈!" : "BIG WIN!", amount: `+${winCoins.toLocaleString()} ${coinWord}`, kind: "big" });
      }
      if (res.feature && res.roundId) void revealFeature(res.roundId);
    } catch (e) {
      stopChurn();
      spinReelsRef.current = [false, false, false, false, false];
      setSpinReels([false, false, false, false, false]);
      setError(e instanceof ApiError ? String(e.message) : koRef.current ? "스핀 실패" : "Spin failed");
    } finally {
      busyRef.current = false;
    }
  }

  // A feature (free spins) is resolved in full by the server on the first spin, and the win
  // is already credited. We finish the round's free spins on the server for a clean record,
  // but we deliberately do NOT touch the board — the symbols stay exactly as the spin landed,
  // so a big win never re-shuffles the reels in front of the player.
  async function revealFeature(roundId: string) {
    for (let i = 0; i < 30; i++) {
      try {
        const step = await onFreeSpin(roundId);
        if (step.state === "COMPLETE") break;
      } catch {
        break;
      }
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        void doSpin();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [coins, bet, soundEnabled]);

  useEffect(() => () => stopChurn(), []);

  return (
    <>
      <main className="game-stage">
        {flash && <div className="screen-flash" />}
        {winBanner && (
          <div className={`win-overlay-banner ${winBanner.kind === "jackpot" ? "jackpot" : ""}`}>
            <h2>{winBanner.title}</h2>
            <strong>{winBanner.amount}</strong>
          </div>
        )}
        <div className="game-status">
          <Pill>
            <FlipText intervalMs={5000} items={[<>LIVE</>, <>라이브</>]} />
          </Pill>
          <span>
            <FlipText intervalMs={5300} items={[<>WIN UP TO 10,000×</>, <>최대 10,000배 당첨</>]} />
          </span>
          <strong style={{ color: skin.accent }}>{skin.stageTitle}</strong>
        </div>
        <div className={`slot-cabinet monster-cabinet ${skin.creature}-theme`}>
          <div className="monster-eyes" aria-hidden="true">
            <i />
            <i />
          </div>
          <div className="cabinet-crown">
            <i />
            <span>{skin.crownTitle}</span>
            <i />
          </div>
          <span className="slime-drip d1" />
          <span className="slime-drip d2" />
          <span className="slime-drip d3" />
          <div className="gem g1">◆</div>
          <div className="gem g2">◆</div>
          <div className="reels">
            {cells.map((s, i) => (
              <SlotCell key={i} symbolId={s} winning={winning.has(i)} spinning={spinReels[i % 5] ?? false} />
            ))}
          </div>
          <div className="cabinet-controls">
            <button className="round-control help" onClick={() => setShowRules(true)}>
              <CircleHelp size={24} />
              <small>{ko ? "룰" : "RULES"}</small>
            </button>
            <div className="readouts">
              <span>
                <small>{ko ? "베팅" : "BET"}</small>
                <b>
                  <button type="button" onClick={() => setBet((b) => clampBet(b - BET_STEP))} disabled={anySpinning}>
                    −
                  </button>
                  <input
                    value={bet}
                    inputMode="numeric"
                    aria-label="Bet amount in coins"
                    onChange={(e) => setBet(Number(e.target.value.replace(/\D/g, "")) || 0)}
                    onBlur={() => setBet((b) => clampBet(b))}
                    disabled={anySpinning}
                    style={{ width: 62, textAlign: "center", background: "transparent", border: "none", color: "inherit", font: "inherit", fontWeight: 800 }}
                  />
                  <button type="button" onClick={() => setBet((b) => clampBet(b + BET_STEP))} disabled={anySpinning}>
                    +
                  </button>
                </b>
              </span>
              <span>
                <small>{ko ? "마지막 당첨" : "LAST WIN"}</small>
                <b className="win-value">{lastWin.toLocaleString()}</b>
              </span>
              <span>
                <small>{ko ? "코인" : "COINS"}</small>
                <b>{coins.toLocaleString()}</b>
              </span>
            </div>
            <button className="spin-button" onClick={doSpin} disabled={anySpinning}>
              <i />
              <span>{anySpinning ? (ko ? "스핀 중" : "SPINNING") : ko ? "스핀" : "SPIN"}</span>
              <small>SPACE</small>
            </button>
          </div>
        </div>
        <div className="game-bottom-note">
          {error ? (
            <span style={{ color: "var(--danger)" }}>{error}</span>
          ) : (
            <>
              <Sparkles size={15} /> {ko ? "인접한 릴에서 3개 이상 매칭 시 당첨" : "Match 3 or more symbols on adjacent reels to win"}
            </>
          )}
        </div>
      </main>

      {showRules && (
        <div className="modal-overlay" onClick={() => setShowRules(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowRules(false)}>
              <X size={18} />
            </button>
            <Pill>{ko ? "게임 룰" : "GAME RULES"}</Pill>
            <h2 style={{ marginTop: "12px" }}>{ko ? "배당표" : "Paytable"}</h2>
            <p className="muted">
              {ko
                ? "왼쪽부터 연속된 릴에 같은 심볼이 나오면 배당됩니다. 아래 수치는 라이브 수학 모델의 5개 매칭 배수입니다. 와일드는 모든 배당 심볼을 대체하고, 스캐터 3개 이상이면 프리 스핀이 지급됩니다."
                : "Matching symbols on consecutive reels from the left pay out. Values below are the 5-of-a-kind way multiplier from the live math model. Wilds substitute for any paying symbol; 3+ scatters award free spins."}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", margin: "20px 0" }}>
              {PAY_ROWS.map((r) => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", borderRadius: "12px", background: "rgba(255,255,255,0.05)" }}>
                  {r.art ? (
                    <span className={`monster-art ${r.art}`} style={{ width: 34, height: 34 }} />
                  ) : (
                    <span className={`low-glyph pay-glyph sym-${r.id}`} style={{ width: 34, textAlign: "center", fontWeight: 800, color: skin.accent }}>{r.glyph}</span>
                  )}
                  <strong style={{ fontSize: "13px" }}>{ko ? r.labelKo : r.label}</strong>
                  <span style={{ marginLeft: "auto", color: "var(--gold)" }}>{fiveOfMult(config, r.id)}</span>
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", borderRadius: "12px", background: "rgba(255,255,255,0.05)" }}>
                <span className="monster-art wild" style={{ width: 34, height: 34 }} />
                <strong style={{ fontSize: "13px" }}>{ko ? "와일드" : "WILD"}</strong>
                <span style={{ marginLeft: "auto", color: "var(--gold)" }}>{ko ? "대체" : "Substitutes"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", borderRadius: "12px", background: "rgba(255,255,255,0.05)" }}>
                <span className="monster-art scatter" style={{ width: 34, height: 34 }} />
                <strong style={{ fontSize: "13px" }}>{ko ? "스캐터" : "SCATTER"}</strong>
                <span style={{ marginLeft: "auto", color: "var(--gold)" }}>{ko ? "프리 스핀" : "Free spins"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", borderRadius: "12px", background: "rgba(255,255,255,0.05)" }}>
                <span className="monster-art jackpot" style={{ width: 34, height: 34 }} />
                <strong style={{ fontSize: "13px" }}>{ko ? "잭팟" : "JACKPOT"}</strong>
                <span style={{ marginLeft: "auto", color: "var(--gold)" }}>
                  {config?.jackpot ? `×${config.jackpot.pays?.[5] ?? ""}` : ko ? "큰 상금" : "Big prize"}
                </span>
              </div>
            </div>
            <button className="primary full" onClick={() => setShowRules(false)}>
              {ko ? "게임으로 돌아가기" : "Back to Game"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
