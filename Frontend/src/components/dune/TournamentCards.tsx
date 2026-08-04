"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, Clock3 } from "lucide-react";
import { Pill } from "./Shell";
import { tournamentHref, type CardItem } from "../../lib/dune-skins";
import { BRANDS, vaCardImage } from "../../lib/brands";

/** Animated advertising strip on VA cards: the prize pool is doubled. */
function VaDoubleBadge() {
  return (
    <div className="va-double" aria-label="Prize pool doubled">
      <span className="va-double-track">
        ⚡ WINNINGS DOUBLED&nbsp;&nbsp;·&nbsp;&nbsp;2× PRIZE POOL&nbsp;&nbsp;·&nbsp;&nbsp;⚡ WINNINGS DOUBLED&nbsp;&nbsp;·&nbsp;&nbsp;2× PRIZE POOL&nbsp;&nbsp;·&nbsp;&nbsp;
      </span>
    </div>
  );
}

/** Small co-brand mark on a sponsored card (VA, etc.); nothing for the default WM house style. */
function BrandMark({ brand }: { brand: CardItem["brand"] }) {
  if (brand === "WM") return null;
  const b = BRANDS[brand];
  return (
    <span className="brand-chip card-brand-chip" title={b.label}>
      {b.assets.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={b.assets.logo} alt={b.label} onError={(e) => { e.currentTarget.style.display = "none"; }} />
      ) : null}
      <b>{b.logoText}</b>
    </span>
  );
}

export function CompactTournament({
  item,
  featured,
  ko = false,
  flip = false,
}: {
  item: CardItem;
  featured?: boolean;
  ko?: boolean;
  flip?: boolean;
}) {
  const router = useRouter();
  const live = item.label.includes("LIVE");
  const t = ko
    ? {
        label: live ? "지금 라이브" : "곧 시작",
        entry: "참가비",
        prize: "상금 풀",
        cta: item.format === "BRACKET" ? "대진표 보기" : live ? "입장하기" : "토너먼트 보기",
      }
    : {
        label: item.label,
        entry: "ENTRY",
        prize: "PRIZE POOL",
        cta: item.format === "BRACKET" ? "View bracket" : live ? "Enter arena" : "View tournament",
      };
  return (
    <article className={`compact-tournament ${item.tone} ${BRANDS[item.brand].className} ${featured ? "featured" : ""} ${flip ? "flip-card" : ""}`}>
      <div
        className="card-visual"
        style={
          item.brand === "VA"
            ? { backgroundImage: `linear-gradient(180deg, rgba(10,6,32,0.15), rgba(10,6,32,0.75)), url(${vaCardImage(item.id)})`, backgroundSize: "cover", backgroundPosition: "center" }
            : undefined
        }
      >
        <span className={`card-monster ${item.creature}`} />
        <div className="corner-label">
          <Pill tone={live ? "live" : "soon"}>{t.label}</Pill>
          <span>
            <Clock3 size={14} />
            {item.time}
          </span>
        </div>
        <BrandMark brand={item.brand} />
        {item.brand === "VA" && <VaDoubleBadge />}
      </div>
      <div className="card-body">
        <h3>{item.name}</h3>
        <div className="mini-stats">
          <span>
            <small>{t.entry}</small>
            <b>{item.fee}</b>
          </span>
          <span>
            <small>{t.prize}</small>
            <b>{item.prize}</b>
          </span>
        </div>
        <button
          className={live ? "primary full" : "secondary full"}
          onClick={() => router.push(tournamentHref(item))}
        >
          <span>{t.cta}</span>
          <ChevronRight size={17} />
        </button>
      </div>
    </article>
  );
}

export function TournamentCard({ item, onSelect }: { item: CardItem; onSelect?: () => void }) {
  const router = useRouter();
  const live = item.label.includes("LIVE");
  return (
    <article className={`tournament-card ${item.tone} ${BRANDS[item.brand].className}`}>
      <div
        className="tournament-visual"
        style={
          item.brand === "VA"
            ? { backgroundImage: `linear-gradient(180deg, rgba(10,6,32,0.15), rgba(10,6,32,0.7)), url(${vaCardImage(item.id)})`, backgroundSize: "cover", backgroundPosition: "center" }
            : undefined
        }
      >
        <span className={`card-monster large ${item.creature}`} />
        <div className="corner-label">
          <Pill tone={live ? "live" : "soon"}>{item.label}</Pill>
          <span>
            <Clock3 size={14} />
            {item.time}
          </span>
        </div>
        <BrandMark brand={item.brand} />
        {item.brand === "VA" && <VaDoubleBadge />}
      </div>
      <div className="tournament-info">
        <h3>{item.name}</h3>
        <p>5×5 ways-to-win · Fixed coin stack</p>
        <div className="stat-grid">
          <span>
            <small>ENTRY FEE</small>
            <b>{item.fee}</b>
          </span>
          <span>
            <small>Total Win Price</small>
            <b>{item.prize}</b>
          </span>
          <span>
            <small>STARTING COINS</small>
            <b>{item.coins}</b>
          </span>
          <span>
            <small>PLAYERS</small>
            <b>{item.players}</b>
          </span>
        </div>
        <button
          className={live ? "primary full" : "secondary full"}
          onClick={() => (onSelect ? onSelect() : router.push(tournamentHref(item)))}
        >
          <span>{item.format === "BRACKET" ? "View bracket" : live ? "Enter tournament" : "View details"}</span>
          <ChevronRight size={17} />
        </button>
      </div>
    </article>
  );
}
