"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Clock3, Crown, RotateCcw, Swords } from "lucide-react";
import { AuthGuard } from "../../../../components/AuthGuard";
import { PageShell, Pill } from "../../../../components/dune/Shell";
import { useFlipIndex, BiStable } from "../../../../components/dune/FlipText";
import { RuleBookGate, TermsGate } from "../../../../components/dune/RulesGate";
import { VaAdBanner } from "../../../../components/dune/VaAdBanner";
import { VaBackdrop } from "../../../../components/dune/VaBackdrop";
import { FlipCountdown } from "../../../../components/dune/FlipCountdown";
import {
  useTournament,
  useMyEntry,
  useBracket,
  useRegisterTournament,
  useRebuy,
  useNow,
  usePrefetchMatch,
  type BracketRound,
} from "../../../../lib/hooks/useTournaments";
import { skinFor, coins, usdtLabel, roundName, roundNameKo } from "../../../../lib/dune-skins";
import { brandFor } from "../../../../lib/brands";
import { ApiError } from "../../../../lib/api-client";

const medalFor = (rank: number) => (rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "🏅");

export default function GroupTournamentPage() {
  const params = useParams<{ id: string }>();
  return (
    <AuthGuard>
      <GroupTournamentShell id={params.id} />
    </AuthGuard>
  );
}

/** Wraps the page in a VA-styled shell (glass VA navbar) when the tournament is VA-branded. */
function GroupTournamentShell({ id }: { id: string }) {
  const { data: t } = useTournament(id);
  return (
    <PageShell brandVa={t?.brand === "VA"}>
      <GroupView id={id} />
    </PageShell>
  );
}

function GroupView({ id }: { id: string }) {
  const router = useRouter();
  const { data: t } = useTournament(id);
  const { data: myEntry } = useMyEntry(id);
  // Poll the bracket often so a group's "live" flip and standings feel immediate.
  const { data: bracket } = useBracket(id, 2000);
  const register = useRegisterTournament();
  const rebuy = useRebuy(id);
  const ko = useFlipIndex(5000) === 1;
  const prefetchMatch = usePrefetchMatch();
  // A fast-ticking clock (declared before any early return to respect the rules of hooks) so
  // time-based UI — the "Enter your match" button — flips within 0.5s of the real moment.
  const now = useNow(500);

  // Warm the match cache as soon as the player has a current match, so clicking "Enter" opens
  // the game from cache with no fetch wait.
  const currentMatchId = bracket?.myCurrentMatchId ?? null;
  useEffect(() => {
    if (currentMatchId) prefetchMatch(currentMatchId);
  }, [currentMatchId, prefetchMatch]);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [showRuleBook, setShowRuleBook] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const skin = skinFor(id);
  const brand = brandFor(t);

  if (!t) {
    return (
      <main className="page-main">
        <p style={{ color: "var(--muted)", padding: 40 }}>{ko ? "불러오는 중…" : "Loading…"}</p>
      </main>
    );
  }

  const roundsCount = t.roundsCount ?? 0;
  const registered = !!myEntry;
  const isVA = brand.key === "VA";
  const beforeStart = now < new Date(t.startAt).getTime();
  // Registration lock: VA closes a full day before Round 1; WM closes at Round 1 start.
  const regClosesMs = new Date(t.registrationClosesAt).getTime();
  const regClosed = now >= regClosesMs;
  // VA prize pool is DYNAMIC: 2× the total entry fees (grows as players join). WM is fixed.
  const vaPoolMinor = (BigInt(t.entryFee) * BigInt(t.entryCount) * 2n).toString();
  const prizePool = isVA ? usdtLabel(vaPoolMinor) : usdtLabel(t.prizes.reduce((s, p) => s + BigInt(p.amount), 0n).toString());
  // VA top-10 split from the dynamic pool (same percentages the backend pays out).
  const VA_SPLIT = [30, 20, 15, 10, 5, 4, 4, 4, 4, 4];
  const prizeRows = isVA
    ? VA_SPLIT.map((pct, i) => ({ rank: i + 1, amount: ((BigInt(vaPoolMinor) * BigInt(pct)) / 100n).toString() }))
    : t.prizes;
  const durationMs = (t.matchDurationSec || 300) * 1000;
  const rounds = bracket?.rounds ?? [];
  const rn = (i: number) => (ko ? roundNameKo(i, roundsCount) : roundName(i, roundsCount));

  const myMatches = rounds.flatMap((r) =>
    r.matches.filter((m) => m.players.some((p) => p.isMe)).map((m) => ({ round: r, match: m })),
  );
  const liveMatch = myMatches.find((x) => {
    const s = new Date(x.match.startAt).getTime();
    return now >= s && now < s + durationMs && x.match.state !== "DONE";
  });
  const upcomingMatch = myMatches.find((x) => now < new Date(x.match.startAt).getTime());
  const settledWinner = t.state === "SETTLED" && myEntry?.rank != null;

  // Re-buy eligibility: eliminated before the Semi-Final and the next round hasn't started.
  const elimRound = myEntry?.eliminatedRound ?? null;
  const nextRound = elimRound != null ? elimRound + 1 : null;
  const nextRoundData = nextRound != null ? rounds.find((r) => r.index === nextRound) : undefined;
  // Show the re-buy option whenever the player is eliminated before the Semi-Final and the
  // next round hasn't started/settled. Don't hard-require the next round's bracket row to be
  // loaded — the backend enforces the exact window, so the button stays reliably available.
  const canRebuy =
    !!myEntry?.eliminated &&
    !settledWinner &&
    nextRound != null &&
    nextRound <= roundsCount - 1 &&
    (!nextRoundData || (!nextRoundData.settledAt && now < new Date(nextRoundData.startAt).getTime()));

  // The single prominent countdown target for this player's current phase.
  const nextRoundStartMs = rounds
    .map((r) => new Date(r.startAt).getTime())
    .filter((ms) => ms > now)
    .sort((a, b) => a - b)[0];
  let timerIso: string | null = null;
  let timerLabel = "";
  if (liveMatch) {
    timerIso = new Date(new Date(liveMatch.match.startAt).getTime() + durationMs).toISOString();
    timerLabel = ko ? "남은 시간" : "TIME LEFT";
  } else if (upcomingMatch) {
    timerIso = upcomingMatch.match.startAt;
    timerLabel = ko ? "내 매치 시작까지" : "YOUR MATCH STARTS IN";
  } else if (myEntry?.eliminated && canRebuy && nextRoundData) {
    timerIso = nextRoundData.startAt;
    timerLabel = ko ? "다음 라운드까지" : "NEXT ROUND IN";
  } else if (registered && !settledWinner && !myEntry?.eliminated && nextRoundStartMs) {
    timerIso = new Date(nextRoundStartMs).toISOString();
    timerLabel = ko ? "다음 라운드까지" : "NEXT ROUND STARTS IN";
  } else if (!settledWinner && beforeStart) {
    // Any viewer sees a countdown to the tournament start.
    timerIso = t.startAt;
    timerLabel = ko ? "시작까지" : "STARTS IN";
  } else if (!settledWinner && nextRoundStartMs) {
    timerIso = new Date(nextRoundStartMs).toISOString();
    timerLabel = ko ? "다음 라운드까지" : "NEXT ROUND STARTS IN";
  }

  function confirmRegister() {
    setError(null);
    register.mutate(id, {
      onSuccess: () => setShowTerms(false),
      onError: (e) => {
        setError(e instanceof ApiError ? String(e.message) : ko ? "등록할 수 없습니다" : "Could not register");
        setShowTerms(false);
      },
    });
  }
  function doRebuy() {
    setError(null);
    rebuy.mutate(undefined, {
      onError: (e) => setError(e instanceof ApiError ? String(e.message) : ko ? "리바이인할 수 없습니다" : "Could not re-buy-in"),
    });
  }

  return (
    <main className={`page-main ${brand.className}`} style={{ display: "grid", gap: 20 }}>
      {isVA && <VaBackdrop />}
      <section className="glass brand-card" style={{ padding: 24, borderRadius: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Pill tone={t.state === "RUNNING" ? "live" : "soon"}>{t.state}</Pill>
              <span className="pill soon" style={{ fontSize: 11 }}>{t.format}</span>
              {brand.key !== "WM" && (
                <span className="brand-chip" title={`${ko ? "협찬" : "Sponsored by"} ${brand.label}`}>
                  {brand.assets.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={brand.assets.logo} alt={brand.label} onError={(e) => { e.currentTarget.style.display = "none"; }} />
                  ) : null}
                  <b>{brand.logoText}</b>
                </span>
              )}
            </div>
            <h1 className={isVA ? "va-title" : undefined} style={{ margin: "10px 0 6px", color: isVA ? undefined : skin.accent }}>{t.name}</h1>
            {!isVA && (
              <p className="muted" style={{ margin: 0 }}>
                {ko
                  ? `${t.capacity}명 · ${roundsCount}라운드 · 5분 매치 · 상위 10명 우승`
                  : `${t.capacity} players · ${roundsCount} rounds · 5-minute matches · Top 10 win`}
              </p>
            )}
          </div>
          <div style={{ display: "flex", gap: 22 }}>
            <span>
              <small style={{ color: "var(--muted)", display: "block" }}>
                <BiStable showKo={ko} en="ENTRY" ko="참가비" />
              </small>
              <b>{usdtLabel(t.entryFee)}</b>
            </span>
            <span>
              <small style={{ color: "var(--muted)", display: "block" }}>
                <BiStable showKo={ko} en="TOTAL WIN PRICE" ko="총 우승 상금" />
              </small>
              <b style={{ color: "var(--gold)" }}>{prizePool}</b>
            </span>
            <span>
              <small style={{ color: "var(--muted)", display: "block" }}>
                <BiStable showKo={ko} en="COINS / MATCH" ko="매치당 코인" />
              </small>
              <b>{coins(t.startingCredits).toLocaleString()}</b>
            </span>
          </div>
        </div>

        {/* Prominent timer, centered in the tournament card. */}
        {timerIso && !settledWinner && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}>
            <RoundTimer iso={timerIso} label={timerLabel} live={!!liveMatch} />
          </div>
        )}

        {/* Status / action — the tournament runs automatically. */}
        <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
          {registered ? (
            liveMatch ? (
              <button className="primary xl" onClick={() => router.push(`/game/match/${liveMatch.match.id}`)}>
                <Swords size={18} /> {ko ? `매치 입장 (그룹 ${liveMatch.match.index + 1})` : `Enter your match (Group ${liveMatch.match.index + 1})`}
              </button>
            ) : settledWinner ? (
              <p style={{ color: "var(--gold)", margin: 0, fontWeight: 700 }}>
                <Crown size={16} style={{ verticalAlign: -2 }} />{" "}
                {ko ? `최종 순위 #${myEntry!.rank}` : `Final rank #${myEntry!.rank}`}
                {BigInt(myEntry!.prizeAwarded || "0") > 0n
                  ? ko
                    ? ` — ${usdtLabel(myEntry!.prizeAwarded)} 획득!`
                    : ` — you won ${usdtLabel(myEntry!.prizeAwarded)}!`
                  : ""}
              </p>
            ) : myEntry?.eliminated ? (
              <div style={{ display: "grid", gap: 10 }}>
                <p className="muted" style={{ margin: 0 }}>
                  {ko
                    ? `${elimRound ? rn(elimRound) : ""}에서 탈락하셨습니다.`
                    : `You were eliminated in the ${elimRound ? rn(elimRound) : "tournament"}.`}
                </p>
                {canRebuy && (
                  <>
                    <button className="primary xl" onClick={doRebuy} disabled={rebuy.isPending}>
                      <RotateCcw size={18} />{" "}
                      {rebuy.isPending
                        ? ko ? "처리 중…" : "Processing…"
                        : ko
                          ? `리바이인 — ${rn(nextRound!)} 재참가 (${usdtLabel(t.entryFee)})`
                          : `Re-buy-in for the ${rn(nextRound!)} — pay ${usdtLabel(t.entryFee)}`}
                    </button>
                    <small className="muted" style={{ margin: 0 }}>
                      {ko
                        ? "결제 즉시 다음 라운드에 자동으로 배정됩니다. 관리자 승인이 필요 없습니다."
                        : "You'll be placed into the next round automatically — no admin approval needed."}
                    </small>
                  </>
                )}
              </div>
            ) : upcomingMatch ? (
              <p style={{ color: "var(--cyan)", margin: 0 }}>
                {ko ? `그룹 ${upcomingMatch.match.index + 1}에 배정되었습니다.` : `You're in Group ${upcomingMatch.match.index + 1}.`}
              </p>
            ) : (
              <p style={{ color: "var(--gold)", margin: 0 }}>
                {ko
                  ? "등록 완료 ✓ — 라운드가 시작되면 그룹에 자동 배정됩니다."
                  : "Registered ✓ — you'll be placed in a group automatically when the round starts."}
              </p>
            )
          ) : beforeStart && !regClosed ? (
            <>
              <button className="primary xl" onClick={() => (rulesAccepted ? setShowTerms(true) : setShowRuleBook(true))}>
                <Swords size={18} /> {ko ? `등록 — ${usdtLabel(t.entryFee)} 결제` : `Register — pay ${usdtLabel(t.entryFee)}`}
              </button>
              {isVA && (
                <small className="muted" style={{ margin: 0 }}>
                  {ko
                    ? `등록은 첫 라운드 하루 전에 마감됩니다 (${new Date(regClosesMs).toLocaleString()}).`
                    : `Registration locks one day before Round 1 — closes ${new Date(regClosesMs).toLocaleString()}.`}
                </small>
              )}
            </>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              {isVA
                ? ko ? "등록 마감 — VA 토너먼트는 첫 라운드 하루 전에 잠깁니다." : "Registration closed — VA tournaments lock one day before Round 1."
                : ko ? "이 토너먼트의 등록이 마감되었습니다." : "Registration has closed for this tournament."}
            </p>
          )}
          {error && <p style={{ color: "var(--danger)", marginTop: 4 }}>{error}</p>}
        </div>
      </section>

      {/* VA sponsor advertising banner */}
      {isVA && <VaAdBanner />}

      {/* Prize distribution (Top 10) */}
      <section className="glass" style={{ padding: 24, borderRadius: 20 }}>
        <p className="eyebrow">{ko ? "상금 분배 · 상위 10" : "PRIZE DISTRIBUTION · TOP 10"}</p>
        {isVA && (
          <p className="muted" style={{ margin: "6px 0 0", fontSize: 12.5 }}>
            {ko
              ? `상금 풀 = 총 참가비의 2배 (현재 ${prizePool}) — 참가자가 늘수록 커집니다.`
              : `Prize pool = 2× total entry fees (currently ${prizePool}) — it grows as more players join.`}
          </p>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8, marginTop: 12 }}>
          {prizeRows.map((p) => (
            <div key={p.rank} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,0.04)", fontSize: 13 }}>
              <span>{medalFor(p.rank)} {p.rank}</span>
              <strong style={{ color: p.rank === 1 ? "var(--gold)" : "var(--text)" }}>{usdtLabel(p.amount)}</strong>
            </div>
          ))}
        </div>
      </section>

      {/* Rounds overview */}
      {rounds.length > 0 && (
        <section className="glass" style={{ padding: 24, borderRadius: 20, overflowX: "auto" }}>
          <p className="eyebrow">{ko ? "토너먼트 경로" : "TOURNAMENT PATH"}</p>
          <div style={{ display: "flex", gap: 20, marginTop: 14, minWidth: "min-content" }}>
            {rounds.map((r) => (
              <RoundColumn key={r.id} round={r} title={rn(r.index)} ko={ko} va={isVA} />
            ))}
          </div>
        </section>
      )}

      {/* Registration gate: Rule Book -> (Register/pay) -> Terms -> pay */}
      {showRuleBook && !registered && (
        <RuleBookGate
          brand={t.brand}
          onAccept={() => {
            setRulesAccepted(true);
            setShowRuleBook(false);
            setShowTerms(true);
          }}
          onCancel={() => setShowRuleBook(false)}
        />
      )}
      {showTerms && !registered && (
        <TermsGate brand={t.brand} onAccept={confirmRegister} onCancel={() => setShowTerms(false)} pending={register.isPending} />
      )}
    </main>
  );
}

function RoundColumn({ round, title, ko, va }: { round: BracketRound; title: string; ko: boolean; va?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 210 }}>
      <div style={{ textAlign: "center" }}>
        <b>{title}</b>
        <div style={{ fontSize: 11, color: round.settledAt ? "var(--green)" : "var(--muted)" }}>
          {round.settledAt ? (ko ? "정산 완료" : "Settled") : new Date(round.startAt).toLocaleString()}
        </div>
      </div>
      {round.matches.map((m) => (
        <div key={m.id} className={`glass ${va ? "va-group-card" : ""}`} style={{ padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>
            <span>{ko ? `그룹 ${m.index + 1}` : `Group ${m.index + 1}`}</span>
            <span>{m.state}</span>
          </div>
          {/* Groups play one after another — show this group's own scheduled start time. */}
          <div style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 6 }}>
            {ko ? "플레이 시간 " : "plays "}
            {new Date(m.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
          {m.players.length === 0 && <div className="muted" style={{ fontSize: 12 }}>{ko ? "플레이어 대기 중" : "Awaiting players"}</div>}
          {m.players.slice(0, 12).map((p) => (
            <div
              key={p.userId}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "3px 6px",
                borderRadius: 8,
                background: p.isMe ? "rgba(244,185,66,0.12)" : "transparent",
                color: p.eliminated ? "var(--muted)" : "var(--text)",
                fontSize: 12.5,
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 4, textDecoration: p.eliminated ? "line-through" : "none" }}>
                {p.advanced && <Crown size={11} color="var(--gold)" />}
                {p.displayName}
                {p.isMe && <b style={{ color: "var(--gold)", fontSize: 9 }}>{ko ? "나" : "YOU"}</b>}
              </span>
              <b style={{ fontVariantNumeric: "tabular-nums" }}>{coins(p.score).toLocaleString()}</b>
            </div>
          ))}
          {m.players.length > 12 && <div className="muted" style={{ fontSize: 11 }}>+{m.players.length - 12} {ko ? "명 더" : "more"}</div>}
        </div>
      ))}
    </div>
  );
}

/** Big, focal flip-clock countdown for the current phase (starts-in / next-round / time-left). */
function RoundTimer({ iso, label, live }: { iso: string; label: string; live: boolean }) {
  return (
    <div className={`round-timer ${live ? "live" : ""}`}>
      <small><Clock3 size={13} /> {label}</small>
      <FlipCountdown iso={iso} live={live} />
    </div>
  );
}
