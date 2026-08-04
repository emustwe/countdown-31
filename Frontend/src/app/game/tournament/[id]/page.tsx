"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Clock3, Trophy } from "lucide-react";
import { AuthGuard } from "../../../../components/AuthGuard";
import { Logo, Pill } from "../../../../components/dune/Shell";
import { SlotStage } from "../../../../components/dune/SlotStage";
import { FlipText, useFlipIndex } from "../../../../components/dune/FlipText";
import { RuleBookGate, TermsGate } from "../../../../components/dune/RulesGate";
import {
  useTournament,
  useMyEntry,
  useJoinTournament,
  useTournamentSpin,
  useTournamentFreeSpin,
  useLeaderboard,
  useCountdownTarget,
} from "../../../../lib/hooks/useTournaments";
import { skinFor, coins, usdtLabel } from "../../../../lib/dune-skins";
import { ApiError } from "../../../../lib/api-client";

export default function TournamentGamePage() {
  const params = useParams<{ id: string }>();
  return (
    <AuthGuard>
      <GamePage id={params.id} />
    </AuthGuard>
  );
}

function GamePage({ id }: { id: string }) {
  const router = useRouter();
  const { data: tournament } = useTournament(id);
  const { data: myEntry, isLoading } = useMyEntry(id);
  const join = useJoinTournament();
  const [joinError, setJoinError] = useState<string | null>(null);
  const [myLiveCoins, setMyLiveCoins] = useState<number | null>(null);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const ko = useFlipIndex(5000) === 1;
  const skin = skinFor(id);

  // Final confirmation: accepting the Terms (shown after the pay popup) runs the payment/join.
  function confirmJoin() {
    setJoinError(null);
    join.mutate(id, {
      onSuccess: () => setShowTerms(false),
      onError: (e) => {
        setJoinError(e instanceof ApiError ? String(e.message) : ko ? "참가할 수 없습니다" : "Could not join");
        setShowTerms(false);
      },
    });
  }

  const state = tournament?.state;
  const ended = state === "ENDED" || state === "SETTLED" || state === "CANCELLED";
  const joined = !!myEntry;

  const prizePool = tournament
    ? usdtLabel(tournament.prizes.reduce((s, p) => s + BigInt(p.amount), 0n).toString())
    : "—";
  const timeLeft = useCountdownTarget(tournament?.endAt ?? new Date().toISOString());

  return (
    <div className={`game-page ${skin.creature}-theme`}>
      <div className="game-bg" />
      <div className="game-overlay" />
      <header className="game-topbar">
        <button className="game-back" onClick={() => router.push("/tournaments")}>
          <ArrowLeft size={18} />
          <span>
            <FlipText intervalMs={5000} items={[<>Leave arena</>, <>아레나 나가기</>]} />
          </span>
        </button>
        <div className="game-title">
          <Logo compact />
          <span>Desert Dune · {tournament?.name ?? "Tournament"}</span>
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
              <FlipText intervalMs={5400} items={[<>PRIZE POOL</>, <>상금 풀</>]} />
            </small>
            <b>{prizePool}</b>
          </span>
        </div>
      </header>

      {isLoading ? (
        <main className="game-stage">
          <p style={{ color: "var(--muted)" }}>{ko ? "불러오는 중…" : "Loading…"}</p>
        </main>
      ) : ended ? (
        <ResultsStage id={id} onBack={() => router.push("/tournaments")} />
      ) : joined ? (
        <PlayStage id={id} skin={skin} startingCreditsMinor={myEntry.credits} onCoins={setMyLiveCoins} />
      ) : !rulesAccepted ? (
        <RuleBookGate onAccept={() => setRulesAccepted(true)} onCancel={() => router.push("/tournaments")} />
      ) : (
        <main className="game-stage">
          <div className="modal-card" style={{ maxWidth: 420 }}>
            <Pill>{state === "RUNNING" ? (ko ? "라이브" : "LIVE") : ko ? "곧 시작" : "STARTS SOON"}</Pill>
            <h2 style={{ marginTop: 12 }}>{ko ? `${tournament?.name} 참가` : `Join ${tournament?.name}`}</h2>
            <p className="muted">
              {ko ? (
                <>
                  <b>{tournament ? usdtLabel(tournament.entryFee) : ""}</b>를 결제하고{" "}
                  <b>{tournament ? coins(tournament.startingCredits).toLocaleString() : ""}</b> 토너먼트 코인을 받으세요. 최종 코인
                  잔액이 당신의 점수입니다.
                </>
              ) : (
                <>
                  Pay <b>{tournament ? usdtLabel(tournament.entryFee) : ""}</b> and receive{" "}
                  <b>{tournament ? coins(tournament.startingCredits).toLocaleString() : ""}</b> tournament coins. Your final
                  coin balance is your score.
                </>
              )}
            </p>
            {joinError && (
              <p style={{ color: "var(--danger)", fontSize: 13 }}>
                {joinError}
                {/insufficient|funds|부족/i.test(joinError) && (
                  <>
                    {" "}
                    <button className="text-button" onClick={() => router.push("/wallet")} style={{ color: "var(--gold2)" }}>
                      {ko ? "자금 추가 →" : "Add funds →"}
                    </button>
                  </>
                )}
              </p>
            )}
            <button
              className="primary full xl"
              style={{ marginTop: 18 }}
              disabled={join.isPending}
              onClick={() => {
                setJoinError(null);
                setShowTerms(true);
              }}
            >
              {join.isPending ? (ko ? "참가 중…" : "Joining…") : ko ? "참가비 결제 후 입장" : "Pay entry & enter arena"}
            </button>
          </div>
        </main>
      )}

      {showTerms && !joined && (
        <TermsGate onAccept={confirmJoin} onCancel={() => setShowTerms(false)} pending={join.isPending} />
      )}

      {joined && !ended && <LiveLeaderboardPanel id={id} myUserId={myEntry?.userId} myLiveCoins={myLiveCoins} />}
    </div>
  );
}

function PlayStage({
  id,
  skin,
  startingCreditsMinor,
  onCoins,
}: {
  id: string;
  skin: ReturnType<typeof skinFor>;
  startingCreditsMinor: string;
  onCoins?: (coins: number) => void;
}) {
  const spin = useTournamentSpin(id);
  const freeSpin = useTournamentFreeSpin(id);
  return (
    <SlotStage
      skin={skin}
      startingCreditsMinor={startingCreditsMinor}
      onSpin={(input) => spin.mutateAsync(input)}
      onFreeSpin={(roundId) => freeSpin.mutateAsync({ roundId })}
      onCoins={onCoins}
    />
  );
}

/** Always-visible live leaderboard on the game screen — every player's score, refreshed
 * every 2s, with the player's own row updated instantly from their latest spin. */
function LiveLeaderboardPanel({ id, myUserId, myLiveCoins }: { id: string; myUserId?: string; myLiveCoins: number | null }) {
  const { data } = useLeaderboard(id, 2000);
  const [collapsed, setCollapsed] = useState(false);
  const ko = useFlipIndex(5000) === 1;
  const rows = data?.leaderboard ?? [];
  const display = rows
    .map((r) => ({ ...r, isMe: r.userId === myUserId, liveScore: r.userId === myUserId && myLiveCoins !== null ? myLiveCoins : coins(r.score) }))
    .sort((a, b) => b.liveScore - a.liveScore);

  return (
    <aside className="match-scores">
      <button className="match-scores-head" onClick={() => setCollapsed((c) => !c)}>
        <span>
          <Trophy size={15} /> {ko ? "실시간 리더보드" : "LIVE LEADERBOARD"}
        </span>
        <small>{collapsed ? (ko ? "보기" : "show") : ko ? "숨기기" : "hide"}</small>
      </button>
      {!collapsed && (
        <div className="match-scores-body">
          {display.slice(0, 12).map((r, i) => (
            <div className={`match-score-row ${r.isMe ? "me" : ""}`} key={r.userId}>
              <b>#{i + 1}</b>
              <span className="match-score-name">
                {r.displayName}
                {r.isMe && <i>{ko ? "나" : "YOU"}</i>}
              </span>
              <strong>{r.liveScore.toLocaleString()}</strong>
            </div>
          ))}
          {display.length === 0 && (
            <p className="muted" style={{ fontSize: 12, margin: 0 }}>{ko ? "아직 점수가 없습니다 — 첫 주인공이 되세요!" : "No scores yet — be the first!"}</p>
          )}
          <p className="match-scores-note">{ko ? "시간이 끝날 때 코인이 가장 많은 사람이 승리합니다." : "Highest coin balance when time runs out wins."}</p>
        </div>
      )}
    </aside>
  );
}

function ResultsStage({ id, onBack }: { id: string; onBack: () => void }) {
  const { data: entry } = useMyEntry(id);
  const { data: lb } = useLeaderboard(id, 0);
  const rank = entry?.rank ?? lb?.leaderboard.find((r) => r.userId === entry?.userId)?.rank;
  const prize = entry && BigInt(entry.prizeAwarded || "0") > 0n ? entry.prizeAwarded : null;
  const ko = useFlipIndex(5000) === 1;
  return (
    <main className="game-stage">
      <div className="modal-card" style={{ maxWidth: 420, textAlign: "center" }}>
        <h2>{ko ? "토너먼트 종료" : "Tournament over"}</h2>
        {entry ? (
          <>
            <p className="muted">{rank ? (ko ? `${rank}위로 마쳤습니다` : `You finished #${rank}`) : ko ? "최종 결과가 나왔습니다" : "Final results are in"}</p>
            <h1 style={{ fontSize: 40, margin: "12px 0" }}>{coins(entry.score).toLocaleString()}</h1>
            <p className="muted">{ko ? "최종 코인" : "final coins"}</p>
            {prize ? (
              <p style={{ color: "var(--green)", fontSize: 20, fontWeight: 800 }}>🎉 {ko ? `${usdtLabel(prize)} 획득!` : `You won ${usdtLabel(prize)}!`}</p>
            ) : (
              <p className="muted">{ko ? "이번엔 상금이 없네요 — 플레이해 주셔서 감사합니다!" : "No prize this time — thanks for playing!"}</p>
            )}
          </>
        ) : (
          <p className="muted">{ko ? "이 토너먼트에 참가하지 않았습니다." : "You didn't enter this tournament."}</p>
        )}
        <button className="primary full xl" style={{ marginTop: 18 }} onClick={onBack}>
          {ko ? "로비로 돌아가기" : "Back to lobby"}
        </button>
      </div>
    </main>
  );
}
