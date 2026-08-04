"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Clock3, Crown, Swords, Trophy, Users } from "lucide-react";
import { AuthGuard } from "../../../../components/AuthGuard";
import { PageShell, Pill } from "../../../../components/dune/Shell";
import {
  useBracket,
  usePickSlot,
  useCountdownTarget,
  type BracketMatch,
  type BracketRound,
} from "../../../../lib/hooks/useTournaments";
import { useFlipIndex } from "../../../../components/dune/FlipText";
import { skinFor, coins, usdtLabel } from "../../../../lib/dune-skins";
import { ApiError } from "../../../../lib/api-client";

const MATCH_STATE_KO: Record<string, string> = { PENDING: "대기", RUNNING: "진행 중", DONE: "완료" };

export default function BracketPage() {
  const params = useParams<{ id: string }>();
  return (
    <AuthGuard>
      <PageShell>
        <BracketView id={params.id} />
      </PageShell>
    </AuthGuard>
  );
}

function BracketView({ id }: { id: string }) {
  const router = useRouter();
  const { data, isLoading } = useBracket(id);
  const pick = usePickSlot(id);
  const [error, setError] = useState<string | null>(null);
  const ko = useFlipIndex(5000) === 1;
  const skin = skinFor(id);

  if (isLoading || !data) {
    return (
      <main className="page-main">
        <p style={{ color: "var(--muted)", padding: 40 }}>{ko ? "대진표 불러오는 중…" : "Loading bracket…"}</p>
      </main>
    );
  }

  const { tournament: t, rounds, myMatchIds, myCurrentMatchId } = data;
  const prizePool = usdtLabel(t.prizes.reduce((s, p) => s + BigInt(p.amount), 0n).toString());
  const hasPicked = myMatchIds.length > 0;
  const beforeStart = Date.now() < new Date(t.startAt).getTime();
  const round1 = rounds[0];

  // My live match (if any) and whether it's actually playable now.
  const myMatch = rounds.flatMap((r) => r.matches).find((m) => m.id === myCurrentMatchId);
  const canEnter = myMatch && Date.now() >= new Date(myMatch.startAt).getTime() && myMatch.state !== "DONE";

  function doPick(matchId: string) {
    setError(null);
    pick.mutate(matchId, {
      onError: (e) => setError(e instanceof ApiError ? String(e.message) : ko ? "슬롯을 선택할 수 없습니다" : "Could not pick that slot"),
    });
  }

  return (
    <main className="page-main" style={{ display: "grid", gap: 20 }}>
      <section className="glass" style={{ padding: 24, borderRadius: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Pill tone={t.state === "RUNNING" ? "live" : "soon"}>{t.state}</Pill>
              <span className="pill soon" style={{ fontSize: 11 }}>{ko ? "대진" : "BRACKET"}</span>
            </div>
            <h1 style={{ margin: "10px 0 4px", color: skin.accent }}>{t.name}</h1>
            <p className="muted" style={{ margin: 0 }}>
              {ko
                ? `매치당 ${t.playersPerMatch}명 · ${t.roundsCount}라운드 · 최고 득점자 진출`
                : `${t.playersPerMatch} players per match · ${t.roundsCount} rounds · top scorer advances`}
            </p>
          </div>
          <div style={{ display: "flex", gap: 22 }}>
            <span>
              <small style={{ color: "var(--muted)", display: "block" }}>{ko ? "참가비" : "ENTRY"}</small>
              <b>{usdtLabel(t.entryFee)}</b>
            </span>
            <span>
              <small style={{ color: "var(--muted)", display: "block" }}>{ko ? "상금 풀" : "PRIZE POOL"}</small>
              <b style={{ color: "var(--gold)" }}>{prizePool}</b>
            </span>
            <span>
              <small style={{ color: "var(--muted)", display: "block" }}>{ko ? "매치당 코인" : "COINS / MATCH"}</small>
              <b>{coins(t.startingCredits).toLocaleString()}</b>
            </span>
          </div>
        </div>

        {/* Action row: pick a slot, wait for match, or enter a live match. */}
        <div style={{ marginTop: 18 }}>
          {canEnter ? (
            <button className="primary xl" onClick={() => router.push(`/game/match/${myMatch!.id}`)}>
              <Swords size={18} /> {ko ? "매치 입장" : "Enter your match"}
            </button>
          ) : hasPicked && myMatch ? (
            <p style={{ color: "var(--cyan)", margin: 0 }}>
              <Clock3 size={15} style={{ verticalAlign: "-2px" }} />{" "}
              {ko ? (
                <>매치 시작까지 <b><Countdown iso={myMatch.startAt} /></b> — 준비하세요.</>
              ) : (
                <>Your match starts in <b><Countdown iso={myMatch.startAt} /></b> — get ready.</>
              )}
            </p>
          ) : hasPicked ? (
            <p className="muted" style={{ margin: 0 }}>
              {ko ? "탈락했거나 토너먼트가 종료되었습니다. 아래 대진표를 확인하세요." : "You've been eliminated or the tournament is complete. See the bracket below."}
            </p>
          ) : beforeStart ? (
            <p style={{ color: "var(--gold)", margin: 0 }}>
              {ko ? <>라운드 1 시작 전에 아래에서 빈 슬롯을 선택하세요 (<Countdown iso={t.startAt} />).</> : <>Pick an open slot below before Round 1 starts (<Countdown iso={t.startAt} />).</>}
            </p>
          ) : (
            <p className="muted" style={{ margin: 0 }}>{ko ? "이 브래킷의 슬롯 선택이 마감되었습니다." : "Slot selection has closed for this bracket."}</p>
          )}
          {error && <p style={{ color: "var(--danger)", marginTop: 10 }}>{error}</p>}
        </div>
      </section>

      {/* Round-1 slot picking */}
      {!hasPicked && beforeStart && round1 && (
        <section className="glass" style={{ padding: 24, borderRadius: 20 }}>
          <p className="eyebrow">{ko ? "라운드 1" : "ROUND 1"}</p>
          <h2 style={{ marginTop: 4 }}>{ko ? "매치 슬롯을 선택하세요" : "Choose your match slot"}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14, marginTop: 16 }}>
            {round1.matches.map((m) => {
              const full = m.seatsFilled >= m.seatsTotal;
              return (
                <div key={m.id} className="glass" style={{ padding: 16, borderRadius: 14, border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <b>{ko ? `매치 ${m.index + 1}` : `Match ${m.index + 1}`}</b>
                    <span style={{ color: full ? "var(--danger)" : "var(--cyan)", fontSize: 13 }}>
                      <Users size={13} style={{ verticalAlign: "-2px" }} /> {m.seatsFilled}/{m.seatsTotal}
                    </span>
                  </div>
                  <div style={{ margin: "10px 0", minHeight: 40, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {m.players.map((p) => (
                      <span key={p.userId} className="pill soon" style={{ fontSize: 10 }}>{p.displayName}</span>
                    ))}
                    {m.players.length === 0 && <span className="muted" style={{ fontSize: 12 }}>{ko ? "비어 있음" : "Open"}</span>}
                  </div>
                  <button className="primary full" disabled={full || pick.isPending} onClick={() => doPick(m.id)}>
                    {full ? (ko ? "가득 참" : "Full") : ko ? "이 슬롯 선택" : "Pick this slot"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Full bracket */}
      <section className="glass" style={{ padding: 24, borderRadius: 20, overflowX: "auto" }}>
        <p className="eyebrow">{ko ? "대진표" : "BRACKET"}</p>
        <h2 style={{ marginTop: 4 }}>{ko ? "토너먼트 경로" : "Tournament path"}</h2>
        <div style={{ display: "flex", gap: 24, marginTop: 16, minWidth: "min-content" }}>
          {rounds.map((r) => (
            <RoundColumn key={r.id} round={r} isFinal={r.index === rounds.length} />
          ))}
        </div>
      </section>
    </main>
  );
}

function RoundColumn({ round, isFinal }: { round: BracketRound; isFinal: boolean }) {
  const ko = useFlipIndex(5000) === 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 220 }}>
      <div style={{ textAlign: "center" }}>
        <b>{isFinal ? (ko ? "결승" : "Final") : ko ? `라운드 ${round.index}` : `Round ${round.index}`}</b>
        <div style={{ fontSize: 11, color: round.settledAt ? "var(--green)" : "var(--muted)" }}>
          {round.settledAt ? (ko ? "정산 완료" : "Settled") : new Date(round.startAt).toLocaleString()}
        </div>
      </div>
      {round.matches.map((m) => (
        <MatchCard key={m.id} match={m} />
      ))}
    </div>
  );
}

function MatchCard({ match: m }: { match: BracketMatch }) {
  const ko = useFlipIndex(5000) === 1;
  return (
    <div className="glass" style={{ padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>
        <span>{ko ? `매치 ${m.index + 1}` : `Match ${m.index + 1}`}</span>
        <span>{ko ? MATCH_STATE_KO[m.state] ?? m.state : m.state}</span>
      </div>
      {m.players.length === 0 && <div className="muted" style={{ fontSize: 12 }}>{ko ? "플레이어 대기 중" : "Awaiting players"}</div>}
      {m.players.map((p) => (
        <div
          key={p.userId}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "4px 6px",
            borderRadius: 8,
            background: p.isMe ? "rgba(244,185,66,0.12)" : "transparent",
            color: p.eliminated ? "var(--muted)" : "var(--text)",
            fontSize: 13,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 5, textDecoration: p.eliminated ? "line-through" : "none" }}>
            {p.advanced && <Crown size={12} color="var(--gold)" />}
            {p.displayName}
            {p.isMe && <b style={{ color: "var(--gold)", fontSize: 10 }}>{ko ? "나" : "YOU"}</b>}
          </span>
          <b style={{ fontVariantNumeric: "tabular-nums" }}>{coins(p.score).toLocaleString()}</b>
        </div>
      ))}
      {m.winnerUserId && (
        <div style={{ marginTop: 6, fontSize: 11, color: "var(--gold)", display: "flex", alignItems: "center", gap: 4 }}>
          <Trophy size={12} /> {ko ? "승자 결정됨" : "Winner decided"}
        </div>
      )}
    </div>
  );
}

function Countdown({ iso }: { iso: string }) {
  return <>{useCountdownTarget(iso)}</>;
}
