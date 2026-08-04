"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Swords, X } from "lucide-react";
import { AuthGuard } from "../../components/AuthGuard";
import { PageShell, Pill } from "../../components/dune/Shell";
import { TournamentCard } from "../../components/dune/TournamentCards";
import { VaBackdrop } from "../../components/dune/VaBackdrop";
import { VaAdBanner } from "../../components/dune/VaAdBanner";
import { FlipText, useFlipIndex } from "../../components/dune/FlipText";
import { useOpenTournaments, type TournamentSummary } from "../../lib/hooks/useTournaments";
import { toCardItem, tournamentHref, usdtLabel, coins } from "../../lib/dune-skins";

const TAB_KO: Record<string, string> = {
  All: "전체",
  "Live now": "라이브",
  Upcoming: "예정",
  Completed: "종료",
};

// Prize pool is split across the Top 10 by these percentages (sums to 100%).
const PRIZE_SPLIT = [30, 20, 15, 10, 5, 4, 4, 4, 4, 4];
const medalFor = (rank: number) => (rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "🏅");
const ordinal = (n: number) => (n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`);

export default function TournamentsPage() {
  return (
    <AuthGuard>
      <PageShell brandVa>
        <TournamentsContent />
      </PageShell>
    </AuthGuard>
  );
}

function durationLabel(t: TournamentSummary): string {
  const mins = Math.round((new Date(t.endAt).getTime() - new Date(t.startAt).getTime()) / 60000);
  return mins >= 60 ? `${Math.round(mins / 60)} HRS` : `${mins} MINS`;
}

function TournamentsContent() {
  const router = useRouter();
  const { data } = useOpenTournaments();
  const tournaments = data?.tournaments ?? [];
  const [filter, setFilter] = useState("All");
  const [modal, setModal] = useState<TournamentSummary | null>(null);
  const ko = useFlipIndex(5000) === 1;

  const filtered = tournaments.filter((t) => {
    if (filter === "Live now") return t.state === "RUNNING";
    if (filter === "Upcoming") return t.state === "SCHEDULED";
    if (filter === "Completed") return t.state === "ENDED" || t.state === "SETTLED";
    return true;
  });

  return (
    <main className="page-main tournaments-page brand-va">
      <VaBackdrop />
      <section className="page-banner">
        <div>
          <Pill>
            <FlipText intervalMs={5000} items={[<>TOURNAMENT ARENA</>, <>토너먼트 아레나</>]} />
          </Pill>
          <h1>
            <FlipText intervalMs={5300} items={[<>Join the Ultimate Slot Tournament</>, <>최고의 슬롯 토너먼트에 참가하세요</>]} />
          </h1>
          <p>
            <FlipText
              intervalMs={5600}
              items={[<>Every Spin Shapes the Leaderboard</>, <>모든 스핀이 리더보드를 만듭니다</>]}
            />
          </p>
        </div>
      </section>
      {/* Sliding VA advertising banner in place of the old prize-live-now card. */}
      <VaAdBanner />
      <section className="content">
        <div className="filter-row">
          <div className="tabs">
            {["All", "Live now", "Upcoming", "Completed"].map((x) => (
              <button className={filter === x ? "active" : ""} onClick={() => setFilter(x)} key={x}>
                <FlipText intervalMs={5000} items={[<>{x}</>, <>{TAB_KO[x]}</>]} />
              </button>
            ))}
          </div>
        </div>
        <div className="tournament-grid">
          {filtered.map((t) => (
            <TournamentCard key={t.id} item={toCardItem(t)} onSelect={() => setModal(t)} />
          ))}
          {filtered.length === 0 && (
            <p className="lead">
              <FlipText
                intervalMs={5000}
                items={[<>No tournaments match — try another filter.</>, <>일치하는 토너먼트가 없습니다 — 다른 필터를 사용해 보세요.</>]}
              />
            </p>
          )}
        </div>
      </section>

      {modal && (() => {
        const isVA = modal.brand === "VA";
        const pool = isVA
          ? BigInt(modal.entryFee) * BigInt(modal.entryCount) * 2n
          : modal.prizes.reduce((s, p) => s + BigInt(p.amount), 0n);
        return (
        <div className={`modal-overlay ${isVA ? "brand-va" : ""}`} onClick={() => setModal(null)}>
          <div className={`modal-card ${isVA ? "brand-va va-popup" : ""}`} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setModal(null)}>
              <X size={18} />
            </button>
            {isVA && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/brands/va/logo.png" alt="Victory Ark" className="va-popup-logo" />
            )}
            <Pill tone={modal.state === "RUNNING" ? "live" : "soon"}>
              {modal.state === "RUNNING" ? (ko ? "지금 라이브" : "LIVE NOW") : ko ? "곧 시작" : "STARTS SOON"}
            </Pill>
            <h2 style={{ marginTop: "12px", fontSize: "32px" }}>{modal.name}</h2>
            <p className="muted">
              {isVA
                ? ko ? "빅토리 아크 게이밍 협찬 · 상금 풀 2배!" : "Sponsored by Victory Ark Gaming · Prize pool DOUBLED!"
                : ko
                ? `5×5 웨이즈 슬롯 아레나 · 고정 코인 스택 ${coins(modal.startingCredits).toLocaleString()}`
                : `5×5 ways-to-win slot arena · Fixed coin stack of ${coins(modal.startingCredits).toLocaleString()}`}
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", margin: "20px 0" }}>
              <div style={{ padding: "16px", background: "rgba(255,255,255,0.05)", borderRadius: "14px" }}>
                <small style={{ color: "var(--muted)", fontSize: "10px" }}>{ko ? "참가비" : "ENTRY FEE"}</small>
                <h3 style={{ margin: "4px 0 0", color: "var(--gold2)" }}>{usdtLabel(modal.entryFee)}</h3>
              </div>
              <div style={{ padding: "16px", background: "rgba(255,255,255,0.05)", borderRadius: "14px" }}>
                <small style={{ color: "var(--muted)", fontSize: "10px" }}>{ko ? "총 상금" : "Total Win Price"}</small>
                <h3 style={{ margin: "4px 0 0", color: "var(--cyan)" }}>{usdtLabel(pool.toString())}</h3>
              </div>
              <div style={{ padding: "16px", background: "rgba(255,255,255,0.05)", borderRadius: "14px" }}>
                <small style={{ color: "var(--muted)", fontSize: "10px" }}>{ko ? "진행 시간" : "DURATION"}</small>
                <h3 style={{ margin: "4px 0 0", color: "var(--text)" }}>{durationLabel(modal)}</h3>
              </div>
            </div>

            <h4 style={{ margin: "16px 0 8px" }}>
              {ko ? "상금 분배 (상위 10위)" : "Prize Distribution (Top 10)"}
            </h4>
            {(() => {
              if (pool === 0n) {
                return (
                  <div style={{ background: "rgba(0,0,0,0.2)", padding: "12px", borderRadius: "14px" }}>
                    <span className="muted">{ko ? "상금은 곧 공개됩니다." : "Prizes to be announced."}</span>
                  </div>
                );
              }
              return (
                <div
                  style={{
                    display: "grid",
                    gap: "8px",
                    background: "rgba(0,0,0,0.2)",
                    padding: "12px",
                    borderRadius: "14px",
                    maxHeight: "260px",
                    overflowY: "auto",
                  }}
                >
                  {PRIZE_SPLIT.map((pct, idx) => {
                    const rank = idx + 1;
                    const amount = ((pool * BigInt(pct)) / 100n).toString();
                    return (
                      <div key={rank} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <span>
                          {medalFor(rank)}{" "}
                          {ko ? `${rank}위` : `${ordinal(rank)} Place`}{" "}
                          <small style={{ color: "var(--muted)" }}>{pct}%</small>
                        </span>
                        <strong style={{ color: rank === 1 ? "var(--gold)" : "var(--text)" }}>{usdtLabel(amount)}</strong>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            <button
              className="primary full xl"
              style={{ marginTop: "24px" }}
              onClick={() => {
                const href = tournamentHref(modal);
                setModal(null);
                router.push(href);
              }}
            >
              <Swords size={20} />
              {modal.format === "BRACKET" ? (ko ? "대진표 보기" : "VIEW BRACKET") : ko ? "지금 입장하기" : "ENTER ARENA NOW"}
            </button>
          </div>
        </div>
        );
      })()}
    </main>
  );
}
