"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, Gem, ShieldCheck, Trophy } from "lucide-react";
import { PageShell, Pill, OrbIcon } from "../../components/dune/Shell";
import { CompactTournament } from "../../components/dune/TournamentCards";
import { FlipText, useFlipIndex } from "../../components/dune/FlipText";
import { useProfile } from "../../lib/hooks/useAuth";
import { useWallet } from "../../lib/hooks/useWallet";
import { useOpenTournaments } from "../../lib/hooks/useTournaments";
import { toCardItem, usdt } from "../../lib/dune-skins";

export default function HomePage() {
  return (
    <PageShell className="home-page">
      <HomeContent />
    </PageShell>
  );
}

function HomeContent() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const { data: wallet } = useWallet();
  const { data } = useOpenTournaments();
  const tournaments = data?.tournaments ?? [];

  const balanceUsdt = wallet ? usdt(wallet.balance) : 0;
  const name = (profile?.fullName || profile?.email?.split("@")[0] || "player").toUpperCase();

  // Whole-card flip indices — each on its own interval so nothing flips in unison.
  const fWallet = useFlipIndex(5000);
  const fRank = useFlipIndex(5400);
  const fResp = useFlipIndex(5800);

  return (
    <main>
      <section className="hero">
        <div className="hero-art" />
        <div className="hero-shade" />
        <div className="floating-coin c1">$</div>
        <div className="floating-coin c2">✦</div>
        <div className="floating-coin c3">◈</div>
        <div className="hero-copy">
          <Pill>
            <FlipText intervalMs={5000} items={[<>THE OASIS IS OPEN</>, <>오아시스가 열렸습니다</>]} />
          </Pill>
          <p className="eyebrow">
            <FlipText
              intervalMs={5200}
              items={[<>WELCOME BACK, {name}</>, <>다시 오신 것을 환영합니다, {name}</>]}
            />
          </p>
          {/* "WM" = Weekly / Monthly — the two tournament cadences the platform runs. */}
          <h1 className="wm-hero-title">
            <span className="wm-line"><i>W</i>eekly</span>
            <span className="wm-line"><i>M</i>onthly</span>
          </h1>
          <p className="lead">
            <FlipText
              intervalMs={5600}
              items={[
                <>Enter live slot tournaments, climb the leaderboard, and turn every spin into a legend.</>,
                <>라이브 슬롯 토너먼트에 참가해 리더보드를 정복하고, 매 스핀을 전설로 만드세요.</>,
              ]}
            />
          </p>
        </div>

        {/* Right-hand slot reserved for a future advertising video / promo. Intentionally empty for now. */}
      </section>

      <section className="content home-content">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              <FlipText intervalMs={5000} items={[<>YOUR NEXT ADVENTURE</>, <>당신의 다음 모험</>]} />
            </p>
            <h2>
              <FlipText intervalMs={5200} items={[<>Live Tournaments</>, <>라이브 토너먼트</>]} />
            </h2>
          </div>
          <button className="text-button" onClick={() => router.push("/tournaments")}>
            <FlipText intervalMs={5400} items={[<>View all tournaments</>, <>모든 토너먼트 보기</>]} />{" "}
            <ChevronRight size={17} />
          </button>
        </div>
        <div className="tournament-strip">
          {tournaments.slice(0, 3).map((t, i) => (
            <CompactTournament key={t.id} item={toCardItem(t)} featured={i === 0} />
          ))}
          {tournaments.length === 0 && (
            <p className="lead">
              <FlipText
                intervalMs={5000}
                items={[
                  <>No tournaments are live right now — check back soon.</>,
                  <>지금 진행 중인 토너먼트가 없습니다 — 잠시 후 다시 확인해 주세요.</>,
                ]}
              />
            </p>
          )}
        </div>
        <div className="home-grid">
          <div className="quick-wallet glass flip-card" key={`wallet-${fWallet}`}>
            <div>
              <p className="eyebrow">{fWallet === 1 ? "사용 가능한 잔액" : "AVAILABLE BALANCE"}</p>
              <h2>{balanceUsdt.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT</h2>
              <span>{fWallet === 1 ? "충전하고 더 많은 토너먼트에 참가하세요" : "Top up to enter more tournaments"}</span>
            </div>
            <div className="wallet-gem">
              <Gem size={32} />
            </div>
            <button className="secondary" onClick={() => router.push("/wallet")}>
              {fWallet === 1 ? "지갑 열기" : "Open wallet"} <ChevronRight size={16} />
            </button>
          </div>
          <div className="rank-card glass flip-card" key={`rank-${fRank}`}>
            <OrbIcon tone="gold">
              <Trophy size={22} />
            </OrbIcon>
            <div>
              <p className="eyebrow">{fRank === 1 ? "진행 중인 토너먼트" : "TOURNAMENTS OPEN"}</p>
              <h3>
                {fRank === 1 ? (
                  <>{tournaments.length}개 진행·예정</>
                ) : (
                  <>{tournaments.length} live &amp; upcoming</>
                )}
              </h3>
              <span>{fRank === 1 ? "참가하고 리더보드를 정복하세요" : "Join one and climb the leaderboard"}</span>
              <div className="progress">
                <i style={{ width: `${Math.min(100, tournaments.length * 20)}%` }} />
              </div>
            </div>
          </div>
          <div
            className="responsible-card flip-card"
            key={`resp-${fResp}`}
            onClick={() => router.push("/settings")}
            role="button"
            tabIndex={0}
          >
            <ShieldCheck size={26} />
            <div>
              <h3>{fResp === 1 ? "즐겁게, 그리고 절제하며." : "Play bright. Stay in control."}</h3>
              <p>{fResp === 1 ? "입금·이용 시간 한도를 언제든 설정하세요." : "Set deposit and session limits anytime."}</p>
            </div>
            <ChevronRight size={20} />
          </div>
        </div>
      </section>
    </main>
  );
}
