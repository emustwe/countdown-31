"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, Gamepad2, Search, Sparkles, Trophy } from "lucide-react";
import { AuthGuard } from "../../components/AuthGuard";
import { PageShell, OrbIcon, Pill } from "../../components/dune/Shell";
import { FlipText, useFlipIndex } from "../../components/dune/FlipText";
import { useMyTournamentHistory, type TournamentHistoryRow } from "../../lib/hooks/useTournaments";
import { coins, usdtLabel, skinFor, tournamentHref } from "../../lib/dune-skins";

export default function HistoryPage() {
  return (
    <AuthGuard>
      <PageShell>
        <HistoryContent />
      </PageShell>
    </AuthGuard>
  );
}

function isWin(r: TournamentHistoryRow): boolean {
  return BigInt(r.prizeAwarded || "0") > 0n;
}

function HistoryContent() {
  const router = useRouter();
  const { data } = useMyTournamentHistory();
  const rows = data?.history ?? [];
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const ko = useFlipIndex(5000) === 1;

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        const matches = r.name.toLowerCase().includes(query.toLowerCase());
        if (filter === "Wins") return matches && isWin(r);
        if (filter === "Losses") return matches && !isWin(r);
        return matches;
      }),
    [rows, filter, query],
  );

  const totalEarned = rows.reduce((s, r) => s + BigInt(r.prizeAwarded || "0"), 0n).toString();
  const entered = rows.length;
  const wins = rows.filter(isWin).length;
  const rate = entered ? `${Math.round((wins / entered) * 100)}%` : "—";

  return (
    <main className="page-main history-page">
      <section
        className="page-banner"
        style={{
          background:
            "linear-gradient(90deg, rgba(16, 9, 31, 0.9), rgba(16, 9, 31, 0.3)), url('/assets/monster-stage.png') center 48% / cover",
        }}
      >
        <div>
          <Pill>
            <FlipText intervalMs={5000} items={[<>PERFORMANCE PORTFOLIO</>, <>성적 포트폴리오</>]} />
          </Pill>
          <h1>
            <FlipText intervalMs={5300} items={[<>Your Tournament Legacy</>, <>당신의 토너먼트 기록</>]} />
          </h1>
          <p>
            <FlipText
              intervalMs={5600}
              items={[
                <>Review your rankings, starting versus ending coin stacks, and cash prizes across the Desert Dune arenas.</>,
                <>Desert Dune 아레나 전반의 순위와 시작·종료 코인 스택, 현금 상금을 확인하세요.</>,
              ]}
            />
          </p>
        </div>
        <div className="banner-stat">
          <Trophy size={28} />
          <span>
            <small>
              <FlipText intervalMs={5200} items={[<>TOTAL EARNED</>, <>총 획득 상금</>]} />
            </small>
            <b>{usdtLabel(totalEarned)}</b>
          </span>
        </div>
      </section>

      <section className="content">
        <div className="admin-stats" style={{ marginBottom: "30px", gridTemplateColumns: "repeat(4, 1fr)" }}>
          {(
            [
              [Gamepad2, String(entered), "Tournaments Entered", "참가한 토너먼트", "All Time", "전체 기간"],
              [Trophy, String(wins), "Prize Finishes", "입상 횟수", "Cash rewards", "현금 보상"],
              [Sparkles, rate, "Win Rate", "승률", "This account", "이 계정"],
              [Coins, usdtLabel(totalEarned), "Total Winnings", "총 상금", "Cash Rewards Only", "현금 보상만"],
            ] as [typeof Gamepad2, string, string, string, string, string][]
          ).map(([Icon, val, lbl, lblKo, footerTxt, footerKo], idx) => (
            <div className="admin-stat glass" key={lbl}>
              <OrbIcon tone={["cyan", "gold", "pink", "violet"][idx]}>
                <Icon size={21} />
              </OrbIcon>
              <span>
                <small>
                  <FlipText intervalMs={5000 + idx * 300} items={[<>{lbl}</>, <>{lblKo}</>]} />
                </small>
                <b>{val}</b>
                <i>
                  <FlipText intervalMs={5100 + idx * 300} items={[<>{footerTxt}</>, <>{footerKo}</>]} />
                </i>
              </span>
            </div>
          ))}
        </div>

        <div className="filter-row">
          <div className="tabs">
            {["All", "Wins", "Losses"].map((x) => (
              <button className={filter === x ? "active" : ""} onClick={() => setFilter(x)} key={x}>
                <FlipText intervalMs={5000} items={[<>{x}</>, <>{x === "All" ? "전체" : x === "Wins" ? "당첨" : "미당첨"}</>]} />
              </button>
            ))}
          </div>
          <label className="search">
            <Search size={17} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={ko ? "기록 검색" : "Search history"} />
          </label>
        </div>

        <div className="admin-card glass wide" style={{ border: "1px solid var(--border)", background: "var(--surface)", padding: "20px" }}>
          <div className="admin-table" style={{ overflowX: "visible" }}>
            <div className="history-tr th">
              <span><FlipText intervalMs={5000} items={[<>Tournament</>, <>토너먼트</>]} /></span>
              <span><FlipText intervalMs={5100} items={[<>Date</>, <>날짜</>]} /></span>
              <span><FlipText intervalMs={5200} items={[<>Coin Performance</>, <>코인 성과</>]} /></span>
              <span><FlipText intervalMs={5300} items={[<>Placement</>, <>순위</>]} /></span>
              <span><FlipText intervalMs={5400} items={[<>Reward</>, <>보상</>]} /></span>
              <span><FlipText intervalMs={5500} items={[<>Action</>, <>액션</>]} /></span>
            </div>
            {filtered.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
                {ko ? "기록이 없습니다." : "No historical entries found."}
              </div>
            ) : (
              filtered.map((r) => {
                const skin = skinFor(r.tournamentId);
                const win = isWin(r);
                return (
                  <div className="history-tr" key={r.tournamentId + r.joinedAt}>
                    <span>
                      <span className={`history-icon ${skin.tone}`}>◈</span>
                      <b>{r.name}</b>
                    </span>
                    <span>
                      <small style={{ color: "var(--muted)", display: "block" }}>
                        {new Date(r.joinedAt).toLocaleDateString()}
                      </small>
                    </span>
                    <span>
                      <small style={{ color: "var(--muted)" }}>{coins(r.startingCoins).toLocaleString()} </small>
                      <span style={{ color: "var(--muted)" }}>➜</span>
                      <b> {coins(r.endingCoins).toLocaleString()}</b>
                    </span>
                    <span>
                      <Pill tone={win ? "live" : "soon"}>{r.rank ? `#${r.rank}` : r.state}</Pill>
                    </span>
                    <span>
                      <strong className={win ? "positive" : ""}>{win ? `+${usdtLabel(r.prizeAwarded)}` : "—"}</strong>
                    </span>
                    <span style={{ width: "100px", textAlign: "center" }}>
                      <button
                        className="primary full"
                        style={{ height: "34px", minHeight: "34px", borderRadius: "10px", fontSize: "11px" }}
                        onClick={() => router.push(tournamentHref({ id: r.tournamentId, format: r.format }))}
                      >
                        <FlipText
                          intervalMs={5000}
                          items={r.format === "BRACKET" ? [<>View</>, <>보기</>] : [<>Re-enter</>, <>다시 참가</>]}
                        />
                      </button>
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
