"use client";

import { ChevronLeft, Trophy, Users, CalendarDays, Lock, Skull, Eye } from "lucide-react";
import type { DaySchedule, TournamentProgress } from "../../lib/hooks/useSponsors";
import type { ThemeLobby } from "../../lib/game-config";

/**
 * Full-screen tournament LOBBY page. Shown to a JOINED player once the tournament has a resolved
 * start time (REGULAR) or a scheduled group match (GROUP) but has not started yet. It replaces the
 * old compact "You're in — Starts in…" card with an immersive waiting room: a big live countdown,
 * the player's group/time, and the field of cows waiting. When the countdown reaches zero the parent
 * auto-advances (the Grand Starting Wheel for REGULAR, or straight into the group arena for GROUP),
 * so this page needs no "enter" button — it just counts down.
 */

const COWS = ["🐄", "🐮", "🐂", "🐃"];

export interface LobbyGroup {
  index: number;
  day: number | null;
  scheduledAt: string | null;
  isFinal: boolean;
}

function fmtGmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " GMT";
}
function fmtDayChip(iso: string | null): string {
  if (!iso) return "TBA";
  const d = new Date(iso);
  return d.toLocaleDateString([], { weekday: "short", timeZone: "UTC" }) + " · " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });
}

export function TournamentLobby({
  title,
  isPrivate,
  isGroup,
  group,
  winnerCount,
  entryCount,
  enterMs,
  now,
  schedule,
  myDay,
  progress,
  eliminated = false,
  eliminatedGroup,
  accent = "#fbbf24",
  backgroundImage,
  lobby = null,
  embedded = false,
  onBack,
}: {
  title: string;
  isPrivate: boolean;
  isGroup: boolean;
  group: LobbyGroup | null;
  winnerCount: number;
  entryCount: number;
  enterMs: number;
  now: number;
  schedule?: DaySchedule[] | null;
  myDay?: number | null;
  progress?: TournamentProgress | null;
  eliminated?: boolean; // knocked out → spectator/status mode (no countdown, no auto-enter)
  eliminatedGroup?: number | null;
  accent?: string;
  backgroundImage?: string | null;
  /** Admin LOBBY customisation (background, darkness, notice line, sponsor banner). */
  lobby?: ThemeLobby | null;
  /** Render inside a preview box instead of taking over the screen (admin studio). */
  embedded?: boolean;
  onBack: () => void;
}) {
  const remaining = Math.max(0, enterMs - now);
  const s = Math.floor(remaining / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const imminent = remaining <= 10_000; // last 10s: pulse hot

  // Countdown units — hide days/hours when they're zero so the timer stays big and readable.
  const units: { v: number; label: string }[] = [];
  if (days > 0) units.push({ v: days, label: "DAYS" });
  if (days > 0 || hours > 0) units.push({ v: hours, label: "HRS" });
  units.push({ v: mins, label: "MIN" });
  units.push({ v: secs, label: "SEC" });

  // A little waiting field of cows (capped) — a visual of who's in the pasture with you.
  const avatarCount = Math.min(entryCount, 15);
  const overflow = Math.max(0, entryCount - avatarCount);

  const bg = lobby?.backgroundImage || backgroundImage || "/assets/barnaby/barnaby-field.jpg";
  const scrim = lobby ? lobby.overlayOpacity : null;

  // "Which group is running right now" — with parallel rooms a whole day's groups run at once, so
  // show a range (or "The Final") rather than a single index.
  const runLabel = (() => {
    if (!progress || !progress.running.length) return "—";
    if (progress.running.some((r) => r.isFinal)) return "The Final";
    const idxs = progress.running.map((r) => r.index).sort((a, b) => a - b);
    return idxs.length === 1 ? `Group ${idxs[0]}` : `Groups ${idxs[0]}–${idxs[idxs.length - 1]}`;
  })();

  return (
    <div className={`lobby-page ${embedded ? "absolute" : "fixed"} inset-0 z-40 overflow-hidden bg-[#070e0a] text-white select-none flex flex-col`}>
      {/* Pasture backdrop */}
      <div className="absolute inset-0 pointer-events-none bg-cover bg-center opacity-45 mix-blend-luminosity" style={{ backgroundImage: `url('${bg}')` }} />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.25)_0%,#040906_92%)]" />
      {scrim !== null && <div className="absolute inset-0 pointer-events-none" style={{ background: `rgba(2,8,5,${scrim})` }} />}
      <div className="absolute inset-0 pointer-events-none opacity-70" style={{ background: `radial-gradient(circle at 50% 18%, ${accent}22, transparent 55%)` }} />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 sm:px-6 pt-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-amber-300 hover:text-white font-title font-bold text-xs cursor-pointer">
          <ChevronLeft size={16} /> ALL TOURNAMENTS
        </button>
        <span className={`text-[10px] font-title font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${isPrivate ? "bg-fuchsia-500/25 text-fuchsia-200" : "bg-emerald-500/25 text-emerald-200"}`}>
          {isPrivate ? "Private" : "Public"}
        </span>
      </div>

      {/* Center — sized with vh-based clamps so a wide-but-short landscape phone shrinks to fit;
          scrolls internally as a last resort so nothing is ever cut off. */}
      <div className="lobby-center relative z-10 flex-1 flex flex-col items-center justify-center px-4 text-center min-h-0 overflow-y-auto">
        <div className="flex items-center gap-2 font-title font-black uppercase tracking-[0.3em] lobby-eyebrow" style={{ color: eliminated ? "#fca5a5" : "#fcd34d" }}>
          <span className="lobby-dot" style={{ background: eliminated ? "#f87171" : accent }} />
          {eliminated ? "Spectating" : "Tournament Lobby"}
        </div>

        <h1 className="lobby-title font-title font-black leading-tight max-w-4xl" style={{ textWrap: "balance" as const }}>
          {title}
        </h1>

        {eliminated ? (
          /* Knocked-out banner — spectator/status mode: no countdown, no game entry. */
          <div className="flex flex-col items-center gap-1 rounded-2xl border border-rose-400/40 bg-rose-500/10 px-5 py-3 max-w-xl">
            <span className="font-title font-black text-base sm:text-lg text-rose-200 flex items-center gap-2">
              <Skull size={18} /> Knocked out{eliminatedGroup ? ` in Group ${eliminatedGroup}` : ""}
            </span>
            <span className="text-[11px] sm:text-xs text-slate-300 font-title font-bold flex items-center gap-1.5">
              <Eye size={12} /> You&apos;re spectating — follow the whole event below.
            </span>
          </div>
        ) : (
          <>
            {/* Countdown */}
            <div className="flex flex-col items-center gap-1.5">
              <span className="lobby-eyebrow font-title font-black uppercase tracking-[0.35em] text-slate-300">
                {imminent ? "Starting now" : "Starts in"}
              </span>
              <div className={`flex items-end lobby-clock ${imminent ? "lobby-imminent" : ""}`}>
                {units.map((u, i) => (
                  <div key={u.label} className="flex items-end lobby-clock">
                    {i > 0 && <span className="lobby-colon font-title font-black text-amber-400/60">:</span>}
                    <div className="flex flex-col items-center">
                      <div
                        className="lobby-cell font-title font-black tabular-nums leading-none rounded-2xl"
                        style={{ borderColor: `${accent}88`, color: imminent ? "#fff" : accent }}
                      >
                        {String(u.v).padStart(2, "0")}
                      </div>
                      <span className="lobby-unit mt-1 font-title font-black uppercase tracking-[0.25em] text-slate-400">{u.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Your slot */}
            <div className="flex flex-wrap items-stretch justify-center gap-2.5 sm:gap-3 w-full max-w-2xl">
              {isGroup && group ? (
                <div className={`flex-1 min-w-[150px] rounded-2xl border p-3.5 flex flex-col items-center gap-1 ${group.isFinal ? "border-fuchsia-400/50 bg-fuchsia-500/10" : "border-indigo-400/40 bg-indigo-500/10"}`}>
                  <span className="font-title font-black text-base flex items-center gap-1.5">
                    {group.isFinal ? <><Trophy size={16} className="text-fuchsia-300" /> THE FINAL</> : <><Users size={15} className="text-indigo-300" /> Group {group.index}</>}
                  </span>
                  <span className="text-[11px] text-slate-300 font-title font-bold flex items-center gap-1"><CalendarDays size={12} /> Day {group.day ?? "—"} · {fmtGmt(group.scheduledAt)}</span>
                </div>
              ) : (
                <div className="flex-1 min-w-[150px] rounded-2xl border border-amber-400/40 bg-amber-400/10 p-3.5 flex flex-col items-center gap-1">
                  <span className="font-title font-black text-base flex items-center gap-1.5"><Trophy size={15} className="text-amber-300" /> Knockout</span>
                  <span className="text-[11px] text-slate-300 font-title font-bold">Last cow standing · {winnerCount} winner{winnerCount === 1 ? "" : "s"}</span>
                </div>
              )}
              <div className="flex-1 min-w-[150px] rounded-2xl border border-slate-700 bg-black/50 p-3.5 flex flex-col items-center gap-1">
                <span className="font-title font-black text-base flex items-center gap-1.5"><Users size={15} className="text-emerald-300" /> {entryCount.toLocaleString()}</span>
                <span className="text-[11px] text-slate-300 font-title font-bold">cows in the pasture</span>
              </div>
            </div>
          </>
        )}

        {/* Live tournament progress dashboard (GROUP) — visible to every participant, including the
            knocked-out ones spectating. */}
        {progress && (
          <div className="w-full max-w-4xl flex flex-col gap-1.5">
            <span className="lobby-eyebrow font-title font-black uppercase tracking-[0.3em] text-slate-400">Live status</span>
            {progress.champion ? (
              <div className="rounded-2xl border border-yellow-400/50 bg-yellow-400/10 px-4 py-2.5 flex items-center justify-center gap-2 font-title font-black text-yellow-200">
                <Trophy size={17} className="fill-yellow-400 text-yellow-400" /> Champion: {progress.champion}
              </div>
            ) : null}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5">
              <Stat label="Day" value={`${progress.currentDay}/${progress.durationDays}`} sub={progress.finalDone ? "complete" : progress.currentDay >= progress.durationDays ? "final day" : `${progress.daysRemaining} left`} tone="accent" />
              <Stat label="Groups done" value={`${progress.groups.done}/${progress.groups.total}`} sub={`${progress.groups.remaining} to go`} />
              <Stat label="Live now" value={progress.groups.runningNow} sub={runLabel} tone="final" />
              <Stat label="Cows alive" value={progress.players.remaining.toLocaleString()} sub={`of ${progress.players.total.toLocaleString()}`} tone="alive" />
              <Stat label="Eliminated" value={progress.players.eliminated.toLocaleString()} sub="knocked out" tone="out" />
            </div>
          </div>
        )}

        {/* Admin NOTICE — a short announcement to everyone waiting in the lobby. */}
        {lobby?.notice && (
          <div
            className="max-w-2xl rounded-2xl border px-4 py-2 text-center font-title text-xs font-black sm:text-sm"
            style={{ borderColor: `${accent}66`, background: `${accent}1a`, color: accent }}
          >
            {lobby.notice}
          </div>
        )}

        {/* Sponsor banner on the lobby (scales with the viewport, so it fits phone + desktop). */}
        {lobby?.bannerImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={lobby.bannerImage}
            alt=""
            className="lobby-ad w-auto rounded-xl border border-white/10 object-contain"
            aria-hidden="true"
          />
        )}

        {/* Day-by-day schedule (GROUP) — one chip per day, YOUR day highlighted, final flagged.
            Falls back to a field of waiting cows for a REGULAR knockout. */}
        {schedule && schedule.length > 0 ? (
          <div className="lobby-sched w-full max-w-5xl">
            <span className="lobby-eyebrow block mb-1.5 font-title font-black uppercase tracking-[0.3em] text-slate-400">Schedule</span>
            {/* Centered when it fits, scrolls from the left when it doesn't (no end-clipping). */}
            <div className="overflow-x-auto pb-1">
              <div className="flex gap-2 w-max mx-auto px-2">
              {schedule.map((d) => {
                const mine = myDay != null && d.day === myDay;
                return (
                  <div
                    key={d.day}
                    className={`lobby-chip shrink-0 rounded-xl border px-3 py-2 flex flex-col items-center gap-0.5 ${d.isFinal ? "border-fuchsia-400/50 bg-fuchsia-500/10" : "border-slate-700 bg-black/45"}`}
                    style={mine ? { borderColor: accent, background: `${accent}1f` } : undefined}
                  >
                    <span className="text-[9px] font-title font-black uppercase tracking-wider whitespace-nowrap" style={{ color: d.isFinal ? "#f0abfc" : mine ? accent : "#94a3b8" }}>
                      {d.isFinal ? "🏆 Final" : `Day ${d.day}`}{mine ? " · YOU" : ""}
                    </span>
                    <span className="text-[11px] font-title font-black text-white whitespace-nowrap">{fmtDayChip(d.scheduledAt)}</span>
                    <span className="text-[10px] font-title font-bold text-slate-300 whitespace-nowrap">
                      {d.isFinal ? `${d.playerCount.toLocaleString()} finalists` : `${d.groupCount} group${d.groupCount !== 1 ? "s" : ""} · ${d.playerCount.toLocaleString()} cows`}
                    </span>
                  </div>
                );
              })}
              </div>
            </div>
          </div>
        ) : (
          <div className="lobby-field flex flex-wrap items-center justify-center gap-1.5 max-w-2xl">
            {Array.from({ length: avatarCount }).map((_, i) => (
              <span key={i} className="lobby-avatar grid place-items-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl text-lg sm:text-xl bg-gradient-to-br from-[#1d3122] to-[#0e1a13] border border-[#2b4531]" style={{ animationDelay: `${(i % 8) * 0.15}s` }}>
                {COWS[i % COWS.length]}
              </span>
            ))}
            {overflow > 0 && (
              <span className="grid place-items-center h-8 sm:h-9 px-2.5 rounded-xl text-[11px] font-title font-black text-amber-300 bg-black/50 border border-amber-400/40">
                +{overflow.toLocaleString()}
              </span>
            )}
          </div>
        )}

        <p className="lobby-note text-slate-400 font-title font-bold flex items-center gap-1.5 max-w-md">
          {eliminated ? (
            <><Eye size={12} /> Your run is over, but you can watch the tournament play out here any time.</>
          ) : (
            <><Lock size={12} /> The arena opens automatically when the countdown reaches zero — stay on this page.</>
          )}
        </p>
      </div>

      <style>{`
        /* vh-based clamps: on a short landscape phone everything scales down to fit one screen. */
        .lobby-center{gap:clamp(0.6rem,2.4vh,1.6rem);padding-top:clamp(0.4rem,2vh,1rem);padding-bottom:clamp(0.4rem,2vh,1rem);}
        .lobby-eyebrow{font-size:clamp(9px,1.5vh,13px);}
        .lobby-title{font-size:clamp(1.35rem,6.2vh,3.75rem);}
        .lobby-clock{gap:clamp(0.35rem,1.2vh,0.75rem);}
        .lobby-colon{font-size:clamp(1.25rem,4vh,2.25rem);padding-bottom:clamp(0.5rem,1.6vh,1.5rem);}
        .lobby-cell{background:linear-gradient(160deg,rgba(20,32,25,.92),rgba(6,12,8,.96));border-width:2px;box-shadow:0 10px 30px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.06);font-size:clamp(2rem,10vh,4.5rem);padding:clamp(0.4rem,1.4vh,1rem) clamp(0.65rem,2vh,1.25rem);}
        .lobby-unit{font-size:clamp(8px,1.3vh,11px);}
        .lobby-note{font-size:clamp(10px,1.5vh,12px);}
        .lobby-dot{width:9px;height:9px;border-radius:50%;box-shadow:0 0 10px currentColor;animation:lobby-pulse 1.4s ease-in-out infinite;}
        @keyframes lobby-pulse{0%,100%{opacity:.4;transform:scale(.85)}50%{opacity:1;transform:scale(1.15)}}
        .lobby-avatar{animation:lobby-bob 2.6s ease-in-out infinite;}
        @keyframes lobby-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        .lobby-imminent{animation:lobby-hot 1s ease-in-out infinite;}
        @keyframes lobby-hot{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
        .lobby-chip{box-shadow:0 6px 18px rgba(0,0,0,.35);}
        .lobby-ad{max-height:clamp(30px,7vh,74px);max-width:min(92%,560px);}
        .lobby-stat-v{font-size:clamp(1.1rem,3.6vh,1.7rem);}
        /* Ultra-short landscape: drop the cow strip + note (the schedule stays — it's the point) and
           compact the countdown + chips so the whole lobby, schedule included, fits one screen. */
        @media (max-height:430px){
          .lobby-field,.lobby-note{display:none;}
          .lobby-ad{max-height:34px;}
          .lobby-center{gap:0.45rem;}
          .lobby-cell{font-size:1.9rem;padding:0.28rem 0.6rem;}
          .lobby-colon{font-size:1.1rem;padding-bottom:0.4rem;}
          .lobby-chip{padding:0.28rem 0.55rem;}
        }
        @media (prefers-reduced-motion: reduce){.lobby-dot,.lobby-avatar,.lobby-imminent{animation:none!important}}
      `}</style>
    </div>
  );
}

// One stat tile in the live-progress dashboard.
function Stat({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone?: "accent" | "alive" | "out" | "final" }) {
  const color = tone === "alive" ? "#6ee7b7" : tone === "out" ? "#fca5a5" : tone === "final" ? "#f0abfc" : "#fcd34d";
  return (
    <div className="rounded-2xl border border-slate-700 bg-black/45 px-3 py-2 flex flex-col items-center min-w-[90px] shadow-[0_6px_18px_rgba(0,0,0,.35)]">
      <span className="text-[9px] font-title font-black uppercase tracking-wider text-slate-400 whitespace-nowrap">{label}</span>
      <span className="lobby-stat-v font-title font-black leading-none tabular-nums" style={{ color }}>{value}</span>
      {sub ? <span className="text-[9px] font-title font-bold text-slate-400 whitespace-nowrap mt-0.5">{sub}</span> : null}
    </div>
  );
}
