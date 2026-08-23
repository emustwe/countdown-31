import type { TournamentSummary } from "./hooks/useTournaments";
import type { BrandKey } from "./brands";

/** The six themed slot "machines" from the design. Each real tournament is assigned one
 * deterministically by its id, so the same tournament always shows the same creature/tone. */
export const SKINS = [
  { creature: "slime", tone: "cyan", accent: "#21e6d7", stageTitle: "SLIME KINGDOM", crownTitle: "SLIME MAYHEM" },
  { creature: "jackal", tone: "gold", accent: "#f59e0b", stageTitle: "SOLAR CITADEL", crownTitle: "FIRE ANUBIS" },
  { creature: "witch", tone: "pink", accent: "#ec4899", stageTitle: "DISCO POTION", crownTitle: "POTION WITCH" },
  { creature: "dj", tone: "violet", accent: "#a855f7", stageTitle: "CYCLOPS RAVE", crownTitle: "NIGHT BEATS" },
  { creature: "ogre", tone: "pink", accent: "#ef4444", stageTitle: "CRIMSON FORTRESS", crownTitle: "CRIMSON OGRE" },
  { creature: "skull", tone: "gold", accent: "#ffd700", stageTitle: "EMPEROR'S VAULT", crownTitle: "EMPEROR SKULL" },
] as const;

export type Skin = (typeof SKINS)[number];

export function skinFor(id: string): Skin {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return SKINS[h % SKINS.length] ?? SKINS[0];
}

/** Round display name: the last round is the Final, the one before it the Semi-Final. */
export function roundName(index: number, roundsCount: number): string {
  if (index === roundsCount) return "Final";
  if (index === roundsCount - 1) return "Semi-Final";
  return `Round ${index}`;
}
export function roundNameKo(index: number, roundsCount: number): string {
  if (index === roundsCount) return "결승";
  if (index === roundsCount - 1) return "준결승";
  return `라운드 ${index}`;
}

/** USDT amount (number, 2-dp friendly) from a base-unit string (1 USDT = 1_000_000 base). */
export function usdt(baseUnits: string): number {
  try {
    return Number(BigInt(baseUnits)) / 1_000_000;
  } catch {
    return 0;
  }
}

/** Display label for wallet money, e.g. "1,234.56 USDT". */
export function usdtLabel(baseUnits: string): string {
  return `${usdt(baseUnits).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;
}

/** In-tournament coin stack (game points, NOT wallet money) from a minor-unit string
 * (100 minor = 1 coin). Coins are granted at entry and used only inside a match. */
export function coins(minor: string): number {
  try {
    return Number(BigInt(minor) / 100n);
  } catch {
    return 0;
  }
}

/** Inverse of `coins()`: parse a whole-coin amount (e.g. a bet or starting stack) into the
 * minor-unit string the engine expects (× 100). Coins are integers. */
export function coinsToMinor(coinAmount: string): string {
  const trimmed = coinAmount.trim();
  if (!/^\d+$/.test(trimmed)) throw new Error("Enter a whole number of coins");
  return (BigInt(trimmed) * 100n).toString();
}

/** Short remaining-time label like "18:42" or "1d 04h". */
export function shortCountdown(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "—";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (d > 0) return `${d}d ${pad(h)}h`;
  if (h > 0) return `${h}:${pad(m)}:${pad(sec)}`;
  return `${pad(m)}:${pad(sec)}`;
}

export interface CardItem {
  id: string;
  name: string;
  label: string;
  fee: string;
  prize: string;
  coins: string;
  players: string;
  time: string;
  tone: string;
  creature: string;
  format: "LEADERBOARD" | "BRACKET" | "WEEKLY" | "MONTHLY";
  brand: BrandKey;
}

/** Where a tournament card / row should take the player. WEEKLY/MONTHLY open the group
 * tournament page (register + rounds); legacy BRACKET opens the bracket; LEADERBOARD opens
 * the game directly. */
export function tournamentHref(t: Pick<TournamentSummary, "id" | "format">): string {
  if (t.format === "WEEKLY" || t.format === "MONTHLY") return `/tournaments/${t.id}/group`;
  if (t.format === "BRACKET") return `/tournaments/${t.id}/bracket`;
  return `/game/tournament/${t.id}`;
}

/** Maps a real tournament into the shape the ported design cards expect. */
export function toCardItem(t: TournamentSummary): CardItem {
  const skin = skinFor(t.id);
  // VA prize pool is dynamic (2× total entry fees); WM uses the fixed prize table.
  const prizePool =
    t.brand === "VA"
      ? (BigInt(t.entryFee) * BigInt(t.entryCount) * 2n).toString()
      : t.prizes.reduce((s, p) => s + BigInt(p.amount), 0n).toString();
  const label = t.state === "RUNNING" ? "LIVE NOW" : t.state === "SCHEDULED" ? "STARTS SOON" : t.state;
  return {
    id: t.id,
    name: t.name,
    label,
    fee: usdtLabel(t.entryFee),
    prize: usdtLabel(prizePool),
    coins: coins(t.startingCredits).toLocaleString(),
    players: `${t.entryCount}${t.maxEntries ? ` / ${t.maxEntries}` : ""}`,
    time: shortCountdown(t.state === "RUNNING" ? t.endAt : t.startAt),
    tone: skin.tone,
    creature: skin.creature,
    format: t.format,
    brand: t.brand ?? "WM",
  };
}
