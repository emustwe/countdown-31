"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Clock3 } from "lucide-react";
import { AuthGuard } from "../../../../components/AuthGuard";
import { Logo, Pill } from "../../../../components/dune/Shell";
import { SlotStage } from "../../../../components/dune/SlotStage";
import { MobileLandscape } from "../../../../components/dune/MobileLandscape";
import { FlipText, useFlipIndex } from "../../../../components/dune/FlipText";
import { FlipCountdown } from "../../../../components/dune/FlipCountdown";
import { GameLeaderboard } from "../../../../components/dune/GameLeaderboard";
import { ScaledArena } from "../../../../components/dune/ScaledArena";
import {
  useMatchScoreboard,
  useMatchSpin,
  useMatchFreeSpin,
  useCountdownTarget,
  useNow,
} from "../../../../lib/hooks/useTournaments";
import { skinFor, coins } from "../../../../lib/dune-skins";
import { brandClass } from "../../../../lib/brands";
import { vaFlavorClass, vaFlavorFor } from "../../../../lib/va-flavors";

export default function MatchGamePage() {
  const params = useParams<{ matchId: string }>();
  return (
    <AuthGuard>
      <MatchGame matchId={params.matchId} />
    </AuthGuard>
  );
}

function MatchGame({ matchId }: { matchId: string }) {
  const router = useRouter();
  // Poll fast during a live match so opponents' scores feel real-time.
  const { data: board, isLoading } = useMatchScoreboard(matchId, 2000);
  const spin = useMatchSpin(matchId);
  const freeSpin = useMatchFreeSpin(matchId);
  const skin = skinFor(board?.tournamentId ?? matchId);
  // My own score, updated instantly from each spin (before the poll catches up).
  const [myLiveCoins, setMyLiveCoins] = useState<number | null>(null);
  const ko = useFlipIndex(5000) === 1;

  const me = board?.players.find((p) => p.isMe);
  const myScore = myLiveCoins ?? (me ? coins(me.score) : null);
  // Fast clock so the reels unlock the instant the match window opens — clicking "Enter" when
  // it's time drops the player straight into the game with no perceptible wait.
  const now = useNow(250);
  const started = board ? now >= new Date(board.startAt).getTime() : false;
  const ended = board?.state === "DONE" || (board ? now >= new Date(board.endsAt).getTime() : false);
  // Return to the RIGHT tournament page for the format: group tournaments (WEEKLY/MONTHLY, incl.
  // all VA) use the group page; only legacy brackets use the bracket page.
  const backToTournament = () => {
    if (!board) return router.push("/tournaments");
    const isGroup = board.format === "WEEKLY" || board.format === "MONTHLY";
    router.push(`/tournaments/${board.tournamentId}/${isGroup ? "group" : "bracket"}`);
  };
  const backToBracket = backToTournament;
  const timeLeft = useCountdownTarget(board?.endsAt ?? new Date().toISOString());

  return (
    <div className={`game-page ${skin.creature}-theme ${brandClass(board?.brand)} ${board?.brand === "VA" ? vaFlavorClass(vaFlavorFor(board.tournamentId)) : ""}`}>
      <MobileLandscape />
      <div className="game-bg" />
      <div className="game-overlay" />
      <header className="game-topbar">
        <button className="game-back" onClick={backToBracket}>
          <ArrowLeft size={18} />
          <span>
            <FlipText intervalMs={5000} items={[<>Back to bracket</>, <>대진표로 돌아가기</>]} />
          </span>
        </button>
        <div className="game-title">
          {board?.brand === "VA" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/brands/va/logo.png" alt="Victory Ark" className="va-logo-glow" style={{ height: 44, width: "auto" }} />
          ) : (
            <Logo compact />
          )}
          <span>{board?.brand === "VA" ? "Victory Ark" : "Desert Dune"} · {ko ? "매치 플레이" : "Match play"}</span>
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
            <b>{myScore !== null ? myScore.toLocaleString() : "—"}</b>
          </span>
        </div>
      </header>

      {isLoading || !board ? (
        <main className="game-stage">
          <p style={{ color: "var(--muted)" }}>{ko ? "매치 불러오는 중…" : "Loading match…"}</p>
        </main>
      ) : !me ? (
        <main className="game-stage">
          <div className="modal-card" style={{ maxWidth: 420, textAlign: "center" }}>
            <h2>{ko ? "이 매치에 참가하지 않았습니다" : "You're not in this match"}</h2>
            <button className="primary full xl" style={{ marginTop: 18 }} onClick={backToBracket}>
              {ko ? "대진표로 돌아가기" : "Back to bracket"}
            </button>
          </div>
        </main>
      ) : ended ? (
        <MatchResult board={board} matchId={matchId} onBack={backToBracket} />
      ) : !started ? (
        <main className="game-stage">
          <div className="modal-card" style={{ maxWidth: 420, textAlign: "center" }}>
            <Pill tone="soon">{ko ? "곧 시작" : "STARTS SOON"}</Pill>
            <h2 style={{ marginTop: 12 }}>{ko ? "매치가 아직 시작되지 않았습니다" : "Your match hasn't started"}</h2>
            <p className="muted">
              {ko ? (
                <>
                  시작까지 <b><Countdown iso={board.startAt} /></b>. 이 페이지를 열어 두세요 — 릴이 자동으로 열립니다.
                </>
              ) : (
                <>
                  Starts in <b><Countdown iso={board.startAt} /></b>. Keep this page open — the reels unlock automatically.
                </>
              )}
            </p>
            <button className="secondary full" style={{ marginTop: 18 }} onClick={backToBracket}>
              {ko ? "대진표로 돌아가기" : "Back to bracket"}
            </button>
          </div>
        </main>
      ) : (
        <div className="match-play">
          <div className="match-timer">
            <div className="round-timer live">
              <small><Clock3 size={13} /> {ko ? "남은 시간" : "TIME LEFT"}</small>
              <FlipCountdown iso={board.endsAt} live />
            </div>
          </div>
          <ScaledArena>
            <SlotStage
              skin={skin}
              startingCreditsMinor={me.score}
              onSpin={(input) => spin.mutateAsync(input)}
              onFreeSpin={(roundId) => freeSpin.mutateAsync({ roundId })}
              onCoins={setMyLiveCoins}
            />
            <LiveScorePanel matchId={matchId} myLiveCoins={myLiveCoins} brand={board?.brand} />
          </ScaledArena>
        </div>
      )}
    </div>
  );
}

/** Always-visible live scoreboard for the current match — every player's score, refreshed
 * every 2s, with the player's own row updated instantly from their latest spin. In VA
 * tournaments it's dressed as a Victory Ark advertisement (logo header + sponsor footer). */
function LiveScorePanel({ matchId, myLiveCoins, brand }: { matchId: string; myLiveCoins: number | null; brand?: string }) {
  const { data } = useMatchScoreboard(matchId, 2000);
  const [collapsed, setCollapsed] = useState(false);
  const ko = useFlipIndex(5000) === 1;
  const rows = data?.players ?? [];
  // Show my instant score, and re-sort locally so my rank reflects it between polls.
  const lbRows = rows
    .map((r) => ({ userId: r.userId, name: r.displayName, isMe: r.isMe, score: r.isMe && myLiveCoins !== null ? myLiveCoins : coins(r.score) }))
    .sort((a, b) => b.score - a.score);

  return (
    <GameLeaderboard
      rows={lbRows}
      brand={brand}
      collapsed={collapsed}
      onToggle={() => setCollapsed((c) => !c)}
      ko={ko}
      note={ko ? "시간이 끝날 때 최고 득점자가 진출합니다." : "Top scorer when time runs out advances."}
    />
  );
}

function MatchResult({
  board,
  matchId,
  onBack,
}: {
  board: NonNullable<ReturnType<typeof useMatchScoreboard>["data"]>;
  matchId: string;
  onBack: () => void;
}) {
  // Re-fetch so we reflect the outcome as soon as the engine settles the round (automatic).
  const { data } = useMatchScoreboard(matchId, 4000);
  const ko = useFlipIndex(5000) === 1;
  const b = data ?? board;
  const me = b.players.find((p) => p.isMe);
  const settled = b.state === "DONE";
  // Full final standings, ranked (server already sorts by score; keep that order).
  const standings = b.players;
  const myRank = me ? standings.findIndex((p) => p.userId === me.userId) + 1 : 0;

  return (
    <main className="game-stage">
      <PartyPoppers />
      <div className="modal-card" style={{ maxWidth: 460, textAlign: "center", position: "relative", zIndex: 2 }}>
        <h2 style={{ marginBottom: 2 }}>{ko ? "매치 종료 — 최종 순위" : "Match over — final standings"}</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          {settled
            ? ko ? "결과가 확정되었습니다. 상위 진출자는 다음 라운드로 자동 이동합니다." : "Results are final. Top finishers advance to the next round automatically."
            : ko ? "라운드가 자동으로 정산되는 중입니다…" : "The round is being settled automatically…"}
        </p>
        {me && (
          <h1 style={{ fontSize: 34, margin: "10px 0 2px" }}>
            {myRank ? `#${myRank}` : "—"} · {coins(me.score).toLocaleString()}
          </h1>
        )}
        <p className="muted" style={{ marginTop: 0 }}>{ko ? "내 최종 순위 · 코인" : "your final rank · coins"}</p>

        <div className="match-final-standings">
          {standings.map((p, i) => (
            <div className={`match-score-row ${p.isMe ? "me" : ""}`} key={p.userId}>
              <b>#{i + 1}</b>
              <span className="match-score-name">
                {p.displayName}
                {p.isMe && <i>{ko ? "나" : "YOU"}</i>}
              </span>
              <strong>{coins(p.score).toLocaleString()}</strong>
            </div>
          ))}
        </div>

        <button className="primary full xl" style={{ marginTop: 16 }} onClick={onBack}>
          {ko ? "토너먼트로 돌아가기" : "Back to tournament"}
        </button>
      </div>
    </main>
  );
}

function Countdown({ iso }: { iso: string }) {
  return <>{useCountdownTarget(iso)}</>;
}

// Party-popper celebration for the match-end screen: two poppers at the corners + confetti
// raining down. Deterministic (no random) so it never flickers or mismatches on hydration.
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
