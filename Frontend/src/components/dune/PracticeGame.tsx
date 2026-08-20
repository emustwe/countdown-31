"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock3 } from "lucide-react";
import { Logo } from "./Shell";
import { SlotStage } from "./SlotStage";
import { MobileLandscape } from "./MobileLandscape";
import { FlipText, useFlipIndex } from "./FlipText";
import { FlipCountdown } from "./FlipCountdown";
import { GameLeaderboard } from "./GameLeaderboard";
import { ScaledArena } from "./ScaledArena";
import { usePracticeSpin, usePlayNextFreeSpin } from "../../lib/hooks/useGame";
import { useCountdownTarget, useNow } from "../../lib/hooks/useTournaments";
import { skinFor, coins } from "../../lib/dune-skins";
import { brandClass, type BrandKey } from "../../lib/brands";
import { VA_FLAVORS, vaFlavorClass, type VaFlavorKey } from "../../lib/va-flavors";

// Free-play / practice surface. This is an EXACT copy of the real tournament match page
// (`/game/match/[matchId]`): the same SlotStage, brand theme + flavor symbols, top bar with
// TIME LEFT / YOUR SCORE, the centered round timer, the live leaderboard, and the match-over
// final-standings screen with party poppers. The only differences are that it runs on dummy
// coins (no wallet impact) and has a small floating "switch game" control so every VA flavor
// can be previewed — the game layout itself is identical to a live match, mobile included.
const START_MINOR = "5000000"; // 50,000 dummy coins (coins() divides by 100)
const MATCH_MS = 5 * 60 * 1000; // exact 5-minute match window, same as a real VA round

// Sample opponents so the live leaderboard looks exactly like a real match. "You" is inserted
// dynamically from the live coin balance and the whole board is re-sorted each render.
const OPPONENTS = [
  { userId: "op1", name: "DragonKing88", score: 74210 },
  { userId: "op2", name: "LuckyPhoenix", score: 58900 },
  { userId: "op3", name: "GoldRush_VN", score: 43120 },
  { userId: "op4", name: "MahjongMax", score: 38050 },
  { userId: "op5", name: "SpinQueen", score: 29900 },
];

type Row = { userId: string; name: string; score: number; isMe: boolean };

/** Build the ranked standings (opponents + You) exactly like the real scoreboard. */
function standingsWith(myCoins: number, ko: boolean): Row[] {
  return [
    ...OPPONENTS.map((o) => ({ ...o, isMe: false })),
    { userId: "me", name: ko ? "나" : "You", score: myCoins, isMe: true },
  ].sort((a, b) => b.score - a.score);
}

export function PracticeGame({ brand = "WM" }: { brand?: BrandKey }) {
  const router = useRouter();
  const skin = skinFor("practice");
  const practice = usePracticeSpin();
  const freeSpin = usePlayNextFreeSpin();
  const ko = useFlipIndex(5000) === 1;
  const isVA = brand === "VA";
  const [flavor, setFlavor] = useState<VaFlavorKey>("festive");
  const balRef = useRef<string>(START_MINOR);

  // One "round" = one 5-minute practice match. Restarting bumps this so SlotStage remounts.
  const [round, setRound] = useState(0);
  const [target, setTarget] = useState(() => Date.now() + MATCH_MS);
  const [myLiveCoins, setMyLiveCoins] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const now = useNow(500);
  const ended = now >= target;
  const timeLeft = useCountdownTarget(new Date(target).toISOString());
  const startCoins = coins(START_MINOR);
  const myScore = myLiveCoins ?? startCoins;

  function restart() {
    balRef.current = START_MINOR;
    setMyLiveCoins(null);
    setTarget(Date.now() + MATCH_MS);
    setRound((r) => r + 1);
  }

  return (
    <div className={`game-page ${skin.creature}-theme ${brandClass(brand)} ${isVA ? vaFlavorClass(flavor) : ""}`}>
      <MobileLandscape />
      <div className="game-bg" />
      <div className="game-overlay" />
      <header className="game-topbar">
        <button className="game-back" onClick={() => router.push("/home")}>
          <ArrowLeft size={18} />
          <span>
            <FlipText intervalMs={5000} items={[<>Home</>, <>홈</>]} />
          </span>
        </button>
        <div className="game-title">
          {isVA ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/brands/va/logo.png" alt="Victory Ark" className="va-logo-glow" style={{ height: 44, width: "auto" }} />
          ) : (
            <Logo compact />
          )}
          <span>{isVA ? "Victory Ark" : "Desert Dune"} · {ko ? "매치 플레이" : "Match play"}</span>
        </div>
        <div className="game-topstats">
          <span>
            <small>
              <FlipText intervalMs={5200} items={[<>TIME LEFT</>, <>남은 시간</>]} />
            </small>
            <b>
              <Clock3 size={15} />
              {timeLeft}
            </b>
          </span>
          <span>
            <small>
              <FlipText intervalMs={5400} items={[<>YOUR SCORE</>, <>내 점수</>]} />
            </small>
            <b>{myScore.toLocaleString()}</b>
          </span>
        </div>
      </header>

      {ended ? (
        <PracticeResult ko={ko} myCoins={myScore} onRestart={restart} />
      ) : (
        <div className="match-play">
          <div className="match-timer">
            <div className="round-timer live">
              <small><Clock3 size={13} /> {ko ? "남은 시간" : "TIME LEFT"}</small>
              <FlipCountdown iso={new Date(target).toISOString()} live />
            </div>
          </div>
          <ScaledArena>
            <SlotStage
              key={round}
              skin={skin}
              startingCreditsMinor={START_MINOR}
              onSpin={async ({ totalBet }) => {
                const res = await practice.mutateAsync({ totalBet, balance: balRef.current });
                balRef.current = res.newBalance; // track the dummy balance for the next spin
                return res;
              }}
              onFreeSpin={(roundId) => freeSpin.mutateAsync({ roundId })}
              onCoins={setMyLiveCoins}
            />
            <PracticeScorePanel ko={ko} myCoins={myScore} brand={brand} collapsed={collapsed} setCollapsed={setCollapsed} />
          </ScaledArena>
        </div>
      )}

      {/* Testing-only control (floats over the layout so the game itself stays an exact copy):
          switch which VA game's characters the reels use, live. */}
      {isVA && !ended && (
        <div className="va-flavor-float">
          <small>{ko ? "테스트" : "TEST"}</small>
          {VA_FLAVORS.map((f) => (
            <button key={f.key} className={flavor === f.key ? "on" : ""} onClick={() => setFlavor(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Live scoreboard — the same GameLeaderboard used in real matches, driven by sample opponents +
 * the live "You" coin balance. Themed by brand (VA vs WM). */
function PracticeScorePanel({
  ko,
  myCoins,
  brand,
  collapsed,
  setCollapsed,
}: {
  ko: boolean;
  myCoins: number;
  brand: BrandKey;
  collapsed: boolean;
  setCollapsed: (fn: (c: boolean) => boolean) => void;
}) {
  return (
    <GameLeaderboard
      rows={standingsWith(myCoins, ko)}
      brand={brand}
      collapsed={collapsed}
      onToggle={() => setCollapsed((c) => !c)}
      ko={ko}
      note={ko ? "시간이 끝날 때 최고 득점자가 진출합니다." : "Top scorer when time runs out advances."}
    />
  );
}

/** Match-over screen — identical to the real MatchResult: final standings, my rank, and the
 * party-popper celebration. "Play again" resets the dummy balance and the 5-minute timer. */
function PracticeResult({ ko, myCoins, onRestart }: { ko: boolean; myCoins: number; onRestart: () => void }) {
  const rows = standingsWith(myCoins, ko);
  const myRank = rows.findIndex((r) => r.isMe) + 1;
  return (
    <main className="game-stage">
      <PartyPoppers />
      <div className="modal-card" style={{ maxWidth: 460, textAlign: "center", position: "relative", zIndex: 2 }}>
        <h2 style={{ marginBottom: 2 }}>{ko ? "매치 종료 — 최종 순위" : "Match over — final standings"}</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          {ko ? "결과가 확정되었습니다. 상위 진출자는 다음 라운드로 자동 이동합니다." : "Results are final. Top finishers advance to the next round automatically."}
        </p>
        <h1 style={{ fontSize: 34, margin: "10px 0 2px" }}>
          #{myRank} · {myCoins.toLocaleString()}
        </h1>
        <p className="muted" style={{ marginTop: 0 }}>{ko ? "내 최종 순위 · 코인" : "your final rank · coins"}</p>

        <div className="match-final-standings">
          {rows.map((p, i) => (
            <div className={`match-score-row ${p.isMe ? "me" : ""}`} key={p.userId}>
              <b>#{i + 1}</b>
              <span className="match-score-name">
                {p.name}
                {p.isMe && <i>{ko ? "나" : "YOU"}</i>}
              </span>
              <strong>{p.score.toLocaleString()}</strong>
            </div>
          ))}
        </div>

        <button className="primary full xl" style={{ marginTop: 16 }} onClick={onRestart}>
          {ko ? "다시 플레이" : "Play again"}
        </button>
      </div>
    </main>
  );
}

// Party-popper celebration for the match-end screen — copied verbatim from the real match page
// so the testing copy matches exactly. Deterministic (no random) so it never flickers.
const CONFETTI_COLORS = ["#ffd166", "#ff5db1", "#5ad1ff", "#8dff30", "#c08bff", "#ff8a3d"];
const CONFETTI = Array.from({ length: 46 }, (_, i) => ({
  left: (i * 2.17 + (i % 5) * 7) % 100,
  delay: (i % 12) * 0.16,
  dur: 2.6 + (i % 7) * 0.3,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  w: 6 + (i % 3) * 3,
  h: 10 + (i % 4) * 3,
}));
function PartyPoppers() {
  return (
    <div className="party" aria-hidden="true">
      <span className="popper left">🎉</span>
      <span className="popper right">🎊</span>
      {CONFETTI.map((c, i) => (
        <span
          key={i}
          className="confetti"
          style={{ left: `${c.left}%`, animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s`, background: c.color, width: c.w, height: c.h }}
        />
      ))}
    </div>
  );
}
