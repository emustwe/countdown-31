"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, CheckCircle2, ChevronLeft, Clock, Gift, KeyRound, Lock, Trophy, Users, Vote } from "lucide-react";
import { PageShell } from "../../../components/dune/Shell";
import { PastureAmbiance } from "../../../components/dune/PastureAmbiance";
import { ArcadeHeader } from "../../../components/dune/ArcadeHeader";
import { OfficialRulesModal } from "../../../components/dune/OfficialRulesModal";
import { CountDown31 } from "../../../components/dune/CountDown31";
import { StartingWheel } from "../../../components/dune/StartingWheel";
import { TournamentLobby } from "../../../components/dune/TournamentLobby";
import { ArenaLoading } from "../../../components/dune/ArenaLoading";
import { SkillLoadoutModal } from "../../../components/dune/SkillLoadoutModal";
import type { SkillType } from "../../../lib/hooks/useCountdownLive";
import { usePromoDetail, useJoinPromo, useVoteStartTime, useCreateInquiry, usePromoRoster } from "../../../lib/hooks/useSponsors";
import { useProfile } from "../../../lib/hooks/useAuth";
import { useAuthStore } from "../../../stores/auth-store";
import { soundManager } from "../../../lib/soundManager";
import { resolveCampaignAssetUrl, useActiveTournamentCampaign } from "../../../lib/hooks/useTournamentCampaign";
import { useGameThemes } from "../../../lib/hooks/useGameConfig";

function fmtGmtDate(iso: string | null): string {
  if (!iso) return "TBA";
  return new Date(iso).toLocaleDateString([], { dateStyle: "full", timeZone: "UTC" });
}
function fmtGmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " GMT";
}
function fmtCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const hh = String(Math.floor((s % 86400) / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return (d > 0 ? `${d}d ` : "") + `${hh}:${mm}:${ss}`;
}

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const search = useSearchParams();
  const code = search.get("code") ?? undefined;
  const authed = !!useAuthStore((s) => s.user);

  const { data: t, isLoading, isError } = usePromoDetail(id, { code, authed });
  // The sponsor THEME chosen for this tournament (Game Studio) — applied to its arena game.
  const { data: allThemes } = useGameThemes();
  const tournamentTheme =
    (allThemes ?? []).find((x) => x.id === (t as { themeId?: string | null } | undefined)?.themeId) ?? null;
  // Sponsor campaign (co-branded tournament skin) — published campaign for this tournament, if any.
  const { data: campaignData } = useActiveTournamentCampaign(id);
  const campaign = campaignData?.campaign?.manifest ?? null;
  const { data: profile } = useProfile();
  const join = useJoinPromo();
  const voteTime = useVoteStartTime();
  const requestCode = useCreateInquiry();
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  const [refCode, setRefCode] = useState(code ?? "");
  const [showVote, setShowVote] = useState(false);
  const [slotPick, setSlotPick] = useState("");
  const [showRules, setShowRules] = useState(false);
  const [requested, setRequested] = useState(false);
  const [showSkillPicker, setShowSkillPicker] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  // The Grand Starting Wheel plays ONCE per tournament (persisted), at the very start. On any later
  // re-entry the player skips straight to a short loading screen and then into the arena.
  const [wheelDone, setWheelDone] = useState(false);
  const [loadingArena, setLoadingArena] = useState(false);

  useEffect(() => {
    const h = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(h);
  }, []);

  // Hydrate "wheel already seen" for this tournament so it never replays on re-entry.
  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage.getItem(`cd31-wheel-${id}`)) {
      setWheelDone(true);
    }
  }, [id]);

  const isPrivate = t?.visibility === "PRIVATE";
  // GROUP = the multi-day 31-per-group format. A joined player plays THEIR group's room at THEIR
  // group's scheduled time (not one shared tournament room).
  const isGroup = t?.type === "GROUP";
  const groupsAssigned = !!t?.groupsAssignedAt;
  const myStage = t?.myGroup?.stage ?? null;
  const myFinal = t?.myGroup?.final ?? null;
  // The group the player should enter next: their stage group while it's still live, otherwise the
  // final (either because they advanced, or because a single-group tournament's group IS the final).
  const activeGroup = isGroup ? (myStage && myStage.status !== "DONE" ? myStage : (myFinal ?? myStage)) : null;
  // A knocked-out member is out whether or not the group has formally finished — eliminations are now
  // persisted mid-game, so route on their OWN result, not the group's status. This is what stops a
  // returning eliminated player from being revived into a fresh game after a server restart.
  const eliminatedInStage = isGroup && myStage?.result === "ELIMINATED" && !myFinal;
  const eliminatedInFinal = isGroup && myFinal?.result === "ELIMINATED";
  // A knocked-out participant → spectator/status lobby (can watch the whole event, can't enter a game).
  const isEliminated = !!t?.joined && (eliminatedInStage || eliminatedInFinal);
  const groupPlayable = (!isGroup || (!!activeGroup && activeGroup.status !== "DONE")) && !isEliminated;

  const hasTimeVote = (t?.timeOptions?.length ?? 0) > 0;
  // For REGULAR: the shared tournament room at startAt. For GROUP: the player's active group room at
  // that group's scheduled time.
  const roomId = isGroup && activeGroup ? `tour:${id}:${activeGroup.groupId}` : `tour:${id}`;
  const enterAtIso = isGroup ? (activeGroup?.scheduledAt ?? null) : (t?.startAt ?? null);
  const enterMs = enterAtIso ? Date.parse(enterAtIso) : null;
  const started = enterMs != null && now >= enterMs;
  // TEMPORARY: an always-open test tournament ("[TEST] …") can be entered any time (bypasses lobby).
  const isTest = !!t?.title?.startsWith("[TEST]");
  const canEnter = (started || isTest) && groupPlayable;
  // The kickoff wheel plays for a joined REGULAR player the moment the tournament starts, before the
  // arena — but ONLY the first time (wheelDone). GROUP play skips the tournament-wide wheel.
  const showWheel = !isGroup && !!t?.joined && started && !isTest && !wheelDone && !playing && !loadingArena;
  const roster = usePromoRoster(id, showWheel);

  // Re-entry / wheel-already-seen / test arena / GROUP: show a brief loading screen, then drop in.
  // A ref guards against re-scheduling (and `loadingArena` is deliberately NOT a dependency, so the
  // effect's cleanup can't cancel the pending transition when the loading screen turns on).
  const enterStartedRef = useRef(false);
  useEffect(() => {
    if (t?.joined && canEnter && !isTest && (isGroup || wheelDone) && !playing && !enterStartedRef.current) {
      enterStartedRef.current = true;
      setLoadingArena(true);
      const h = setTimeout(() => {
        setLoadingArena(false);
        setPlaying(true);
      }, 3200);
      return () => clearTimeout(h);
    }
  }, [t?.joined, canEnter, isTest, isGroup, wheelDone, playing]);

  // The wheel finished → remember it (once per tournament), then a 3.2s "seating players" load.
  function finishWheel() {
    if (typeof window !== "undefined") window.localStorage.setItem(`cd31-wheel-${id}`, "1");
    setWheelDone(true);
    setLoadingArena(true);
    setTimeout(() => {
      setLoadingArena(false);
      setPlaying(true);
    }, 3200);
  }

  useEffect(() => {
    if (showVote && t) setSlotPick(t.myTimeVote ?? t.timeOptions?.[0] ?? "");
  }, [showVote, t]);

  // #3 Auto-enter: the moment a joined tournament reaches its start time, the Grand Starting Wheel
  // takes over (see the `showWheel` render branch below); when it finishes it drops the player into
  // the arena. No "Enter the game" button.

  // Joining: validate, then register directly. Tournaments are now CLASSIC (no skill loadout), so
  // there is no skill-picker step — we register with no skills and go straight to the time survey.
  function onJoin() {
    setError("");
    if (!authed) {
      router.push("/register");
      return;
    }
    if (isPrivate && !refCode.trim()) {
      setError("Enter the tournament referral code to enter this private tournament.");
      return;
    }
    void confirmJoinWithSkills([]);
  }

  // Register with the (empty) loadout, then show the start-time survey.
  async function confirmJoinWithSkills(skills: SkillType[]) {
    setShowSkillPicker(false);
    setError("");
    try {
      await join.mutateAsync({
        id,
        joinCode: isPrivate ? refCode.trim() : undefined,
        skills,
      });
      if (hasTimeVote) setShowVote(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join");
    }
  }

  async function onRequestCode() {
    setError("");
    if (!authed) {
      router.push("/register");
      return;
    }
    try {
      await requestCode.mutateAsync({
        type: "ENTRY",
        tournamentId: id,
        email: profile?.email ?? "",
        name: profile?.fullName ?? undefined,
        message: `Requesting the referral code for the private tournament "${t?.title ?? id}".`,
      });
      setRequested(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your request");
    }
  }

  async function submitVote() {
    if (!slotPick) return;
    try {
      await voteTime.mutateAsync({ id, slot: slotPick });
      setShowVote(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your vote");
    }
  }

  // Kickoff ceremony: the Grand Starting Wheel spins the whole field to one spotlight, then drops
  // the player into the arena. Shown once, after start, before the arena.
  if (t && showWheel) {
    return <StartingWheel draw={roster.data} onComplete={finishWheel} />;
  }

  // Short "seating players / adjusting the arena" load before play (after the wheel, or on re-entry).
  if (t && loadingArena) {
    return <ArenaLoading title="Entering the arena" subtitle="Seating players & syncing the pasture…" />;
  }

  // In-game view: full-screen arcade. Once you're in an active session (`playing`), stay here even
  // after being eliminated — the arena becomes watch-only so you can spectate the rest of the live
  // match (`canEnter` is only required to ENTER, above, so a reload while eliminated won't revive you).
  if (t && playing) {
    return (
      <PageShell className="practice-page relative">
        <PastureAmbiance />
        <main className="page-main cd31-page relative z-10">
          <CountDown31 roomId={roomId} testArena={isTest} theme={tournamentTheme} />
        </main>
      </PageShell>
    );
  }

  // Full-screen SPECTATOR lobby: a knocked-out participant can still open the tournament and watch the
  // whole event unfold (day/group/player progress) — but cannot enter a game.
  if (t && isEliminated) {
    return (
      <TournamentLobby
        title={t.title}
        isPrivate={isPrivate}
        isGroup={isGroup}
        group={null}
        winnerCount={t.winnerCount}
        entryCount={t.entryCount}
        enterMs={0}
        now={now}
        schedule={isGroup ? t.schedule : null}
        myDay={isGroup ? (myStage?.day ?? null) : null}
        progress={isGroup ? t.progress : null}
        eliminated
        eliminatedGroup={myStage?.index ?? null}
        accent={campaign?.theme.secondaryColor ?? "#fbbf24"}
        backgroundImage={resolveCampaignAssetUrl(campaign?.theme.backgroundImage) ?? tournamentTheme?.backgroundImage ?? null}
        lobby={tournamentTheme?.lobby ?? null}
        onBack={() => router.push("/events")}
      />
    );
  }

  // Full-screen LOBBY: a joined player waiting for a resolved start time (or scheduled group match).
  // Replaces the old "You're in — Starts in…" card. It just counts down; when the clock hits zero the
  // effects above take over (the wheel for REGULAR, or straight into the group arena for GROUP).
  if (t && t.joined && !isTest && !canEnter && groupPlayable && !eliminatedInStage && enterMs != null) {
    return (
      <TournamentLobby
        title={t.title}
        isPrivate={isPrivate}
        isGroup={isGroup}
        group={isGroup ? activeGroup : null}
        winnerCount={t.winnerCount}
        entryCount={t.entryCount}
        enterMs={enterMs}
        now={now}
        schedule={isGroup ? t.schedule : null}
        myDay={isGroup ? (activeGroup?.day ?? null) : null}
        progress={isGroup ? t.progress : null}
        accent={campaign?.theme.secondaryColor ?? "#fbbf24"}
        backgroundImage={resolveCampaignAssetUrl(campaign?.theme.backgroundImage) ?? tournamentTheme?.backgroundImage ?? null}
        lobby={tournamentTheme?.lobby ?? null}
        onBack={() => router.push("/events")}
      />
    );
  }

  return (
    <div className="friendly-page relative w-full min-h-screen bg-[#070e0a] overflow-x-hidden flex flex-col p-2 sm:p-6 select-none text-white">
      <div className={`fixed inset-0 pointer-events-none bg-cover bg-center ${campaign ? "opacity-70" : "opacity-40 mix-blend-luminosity"}`} style={{ backgroundImage: `url('${resolveCampaignAssetUrl(campaign?.theme.backgroundImage) ?? "/assets/barnaby/barnaby-field.jpg"}')` }} />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.3)_0%,#040906_90%)]" />

      <div className="relative z-20">
        <ArcadeHeader
          onOpenRules={() => setShowRules(true)}
          isTournament={true}
          campaign={campaign}
          causePaused={campaignData?.campaign?.isCausePaused}
          tournamentId={id}
          campaignRevision={campaignData?.campaign?.revision}
        />
      </div>

      <main className="relative z-10 w-full max-w-3xl mx-auto flex-1 mt-8 sm:mt-12 md:mt-14 mb-6 flex flex-col gap-5">
        <button
          onClick={() => router.push("/events")}
          className="self-start flex items-center gap-1.5 text-amber-300 hover:text-white font-title font-bold text-xs cursor-pointer"
        >
          <ChevronLeft size={16} /> ALL TOURNAMENTS
        </button>

        {isLoading && (
          <div className="p-12 text-center text-slate-400 font-title font-bold">Loading…</div>
        )}

        {(isError || (!isLoading && !t)) && (
          <div className="p-8 rounded-3xl bg-black/60 border border-slate-800 text-center flex flex-col items-center gap-2">
            <Lock size={30} className="text-slate-500" />
            <h1 className="font-title font-black text-xl text-white">Not available</h1>
            <p className="text-xs text-slate-400 max-w-sm">This tournament is private or no longer open. If it&apos;s private, use its referral code on the Tournaments page.</p>
          </div>
        )}

        {t && (
          <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-b from-[#192b20]/95 via-[#0e1a13]/98 to-[#060c08] border-2 shadow-2xl flex flex-col gap-5" style={{ borderColor: campaign?.theme.secondaryColor ?? "rgba(251,191,36,.6)" }}>
            {/* Sponsor campaign branding panel (co-branded tournaments only). */}
            {campaign && (
              <div className="rounded-2xl border border-white/15 bg-black/65 p-4 backdrop-blur-md">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-title font-black uppercase tracking-[.18em]" style={{ color: campaign.theme.secondaryColor }}>{campaign.identity.disclosureLabel} {campaign.identity.sponsorName}</div>
                    <strong className="mt-1 block font-title text-xl font-black text-white">{campaign.identity.campaignTitle}</strong>
                    <p className="mb-0 mt-1 text-xs text-slate-300">{campaign.featurePanel.body}</p>
                  </div>
                  <div className="grid min-h-16 min-w-28 place-items-center rounded-2xl border-2 bg-black/70 p-3 font-title text-sm font-black" style={{ borderColor: campaign.theme.secondaryColor, color: campaign.theme.primaryColor }}>
                    {campaign.logoTile.mediaUrl ? <img src={resolveCampaignAssetUrl(campaign.logoTile.mediaUrl)} alt={campaign.identity.sponsorName} className="h-12 w-24 object-contain" /> : campaign.logoTile.logoText}
                  </div>
                </div>
                {campaign.cause?.enabled && !campaignData?.campaign?.isCausePaused && (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2 text-[11px]">
                    <span className="text-slate-300"><b style={{ color: campaign.theme.secondaryColor }}>{campaign.cause.label}:</b> {campaign.cause.title}</span>
                    <span className="shrink-0 font-black text-white">{campaign.cause.raisedAmount.toLocaleString()} / {campaign.cause.targetAmount.toLocaleString()} {campaign.cause.currency}</span>
                  </div>
                )}
              </div>
            )}
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-300 shadow">
                <Trophy size={26} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-title font-black text-3xl sm:text-5xl text-white leading-tight">{t.title}</h1>
                  <span className={`text-[10px] font-title font-black px-2 py-0.5 rounded-full uppercase ${isPrivate ? "bg-fuchsia-500/25 text-fuchsia-200" : "bg-emerald-500/25 text-emerald-200"}`}>
                    {isPrivate ? "Private" : "Public"}
                  </span>
                </div>
                {t.sponsor && <p className="text-xs text-amber-300/80 mt-0.5">Sponsored by {t.sponsor.name}</p>}
              </div>
            </div>

            <p className="text-sm text-slate-300">{t.description || "A brand-new tournament."}</p>

            {/* Facts */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { icon: <Gift size={15} />, label: "Prize", value: t.prizePool || "—" },
                isGroup
                  ? { icon: <CalendarDays size={15} />, label: "Duration", value: t.durationDays ? `${t.durationDays} days` : "—" }
                  : { icon: <Trophy size={15} />, label: "Winners", value: String(t.winnerCount) },
                { icon: <Users size={15} />, label: "Joined", value: String(t.entryCount) },
                { icon: <CalendarDays size={15} />, label: "Date (GMT)", value: fmtGmtDate(t.startDate) },
              ].map((f) => (
                <div key={f.label} className="p-3 rounded-2xl bg-black/60 border border-slate-800 flex flex-col gap-0.5">
                  <span className="text-[10px] font-title font-bold text-slate-400 uppercase flex items-center gap-1">{f.icon}{f.label}</span>
                  <span className="font-title font-black text-sm text-amber-300 truncate">{f.value}</span>
                </div>
              ))}
            </div>

            {/* Start-time vote survey (GMT) */}
            {hasTimeVote && (
              <div className="rounded-2xl border border-amber-400/40 bg-black/40 p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-title font-bold text-slate-300 flex items-center gap-1.5"><Clock size={14} className="text-amber-400" /> START TIME (GMT) — VOTED BY PLAYERS</span>
                  <b className="text-amber-300 font-title text-sm">{t.startAt ? fmtGmt(t.startAt) : "Awaiting votes"}</b>
                </div>
                <div className="flex flex-col gap-2">
                  {(t.timeVotes ?? t.timeOptions.map((slot) => ({ slot, votes: 0 }))).map((v) => {
                    const total = (t.timeVotes ?? []).reduce((a, x) => a + x.votes, 0) || 1;
                    const pct = Math.round((v.votes / total) * 100);
                    const mine = t.myTimeVote === v.slot;
                    return (
                      <div key={v.slot} className="grid grid-cols-[64px_1fr_28px] items-center gap-3">
                        <span className={`font-title font-black text-xs ${mine ? "text-amber-300" : "text-slate-200"}`}>{v.slot}{mine && " ★"}</span>
                        <span className="h-2 rounded-full bg-white/10 overflow-hidden"><i className={`block h-full rounded-full ${mine ? "bg-gradient-to-r from-amber-400 to-yellow-500" : "bg-gradient-to-r from-sky-400 to-sky-500"}`} style={{ width: `${pct}%` }} /></span>
                        <span className="text-right font-title font-bold text-xs text-slate-400">{v.votes}</span>
                      </div>
                    );
                  })}
                </div>
                {/* One-time vote: you pick a start time ONCE and it cannot be changed afterwards. */}
                {t.joined && !t.myTimeVote && (
                  <button onClick={() => { soundManager.playClick(); setShowVote(true); }} className="mt-1 py-2 rounded-xl bg-black/60 border border-amber-400/50 text-amber-300 font-title font-black text-xs hover:text-white hover:border-amber-400 transition-all cursor-pointer flex items-center justify-center gap-1.5">
                    <Vote size={14} /> VOTE FOR THE START TIME
                  </button>
                )}
                {t.joined && t.myTimeVote && (
                  <div className="mt-1 py-2 rounded-xl bg-emerald-950/40 border border-emerald-400/40 text-emerald-300 font-title font-black text-xs flex items-center justify-center gap-1.5">
                    <CheckCircle2 size={14} /> You voted for {t.myTimeVote} GMT
                  </div>
                )}
              </div>
            )}

            {/* Join / lobby / enter */}
            {isTest ? (
              <>
                <div className="flex items-center gap-2 text-amber-300 font-title font-bold text-sm"><CheckCircle2 size={18} /> Always-open TEST arena — 100 CPU cows are already playing.</div>
                <button onClick={() => { soundManager.playClick(); setPlaying(true); }} className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 text-slate-950 font-title font-black text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.6)] hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2">
                  <Trophy size={18} /> Enter the game
                </button>
              </>
            ) : t.joined ? (
              <>
                <div className="flex items-center gap-2 text-emerald-300 font-title font-bold text-sm"><CheckCircle2 size={18} /> You&apos;re in{isGroup ? "" : " — knockout: last one standing wins."}</div>

                {/* GROUP: the player's group placement + their match time. */}
                {isGroup && (
                  eliminatedInStage ? (
                    <div className="rounded-2xl border border-slate-700 bg-black/50 p-4 flex items-center justify-center gap-2 text-slate-300 font-title font-bold text-sm"><Lock size={16} /> You were knocked out in Group {myStage?.index}. Thanks for playing!</div>
                  ) : !groupsAssigned ? (
                    <div className="rounded-2xl border border-sky-400/40 bg-sky-500/10 p-4 flex items-center gap-2 text-sky-200 font-title font-bold text-sm"><Users size={16} /> You&apos;ll be placed in a group of 31 when entry closes{t.entryClosesAt ? <> · {fmtGmt(t.entryClosesAt)}</> : null}.</div>
                  ) : activeGroup ? (
                    <div className={`rounded-2xl border p-4 flex flex-col gap-1.5 ${activeGroup.isFinal ? "border-fuchsia-400/50 bg-fuchsia-500/10" : "border-indigo-400/40 bg-indigo-500/10"}`}>
                      <span className="font-title font-black text-base text-white flex items-center gap-2">
                        {activeGroup.isFinal ? <><Trophy size={17} className="text-fuchsia-300" /> You reached the FINAL!</> : <><Users size={16} className="text-indigo-300" /> You&apos;re in Group {activeGroup.index}</>}
                      </span>
                      <span className="text-xs text-slate-300">Plays Day {activeGroup.day ?? "—"} · <b className="text-white">{fmtGmt(activeGroup.scheduledAt)}</b></span>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-sky-400/40 bg-sky-500/10 p-4 flex items-center justify-center gap-2 text-sky-200 font-title font-bold text-sm"><Clock size={16} /> Waiting for your group to be scheduled…</div>
                  )
                )}

                {canEnter ? (
                  <div className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400/90 via-yellow-500/90 to-amber-400/90 text-slate-950 font-title font-black text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.6)] flex items-center justify-center gap-2">
                    <Trophy size={18} /> Entering the arena{isGroup ? "…" : " — the wheel is spinning…"}
                  </div>
                ) : groupPlayable ? (
                  <div className="rounded-2xl border border-sky-400/40 bg-sky-500/10 p-4 flex items-center justify-center gap-2 text-sky-200 font-title font-bold text-sm">
                    <Clock size={16} />
                    {enterMs != null ? (
                      <span>{isGroup ? "Your group starts" : "Starts"} in <b className="text-white font-title">{fmtCountdown(enterMs - now)}</b> · {fmtGmt(enterAtIso)}</span>
                    ) : (
                      <span>Start time not set yet{hasTimeVote ? " — vote for a time above" : ""}.</span>
                    )}
                  </div>
                ) : null}
              </>
            ) : (started && !isTest && !isGroup) || (isGroup && !!t.entryClosesAt && now >= Date.parse(t.entryClosesAt)) ? (
              <div className="rounded-2xl border border-slate-700 bg-black/50 p-4 flex items-center justify-center gap-2 text-slate-300 font-title font-bold text-sm"><Lock size={16} /> Entry closed for this tournament.</div>
            ) : (
              <>
                {isPrivate && authed && (
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-title font-bold text-slate-400 flex items-center gap-1"><KeyRound size={13} /> Tournament referral code (required)</span>
                    <input value={refCode} onChange={(e) => setRefCode(e.target.value)} placeholder="e.g. JOIN-XXXXXXXX" autoCapitalize="characters" className="px-4 py-3 rounded-2xl bg-black/70 border border-amber-400/50 outline-none focus:border-amber-400 font-title font-black text-sm text-white placeholder:text-slate-500 tracking-wider" />
                  </label>
                )}
                {isGroup && (
                  <p className="text-[11px] text-sky-200/90 bg-black/40 p-2.5 rounded-xl border border-sky-400/30">
                    You&apos;ll be placed into a group of 31 automatically. A day before the tournament, entry closes and each group is scheduled to a day — you&apos;ll see your group and its match time here.
                  </p>
                )}
                <button onClick={onJoin} disabled={join.isPending} className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-400 text-slate-950 font-title font-black text-sm uppercase tracking-wider shadow hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-40">
                  {join.isPending ? "Joining…" : authed ? "Join tournament" : "Sign up to join"}
                </button>
                {/* Private tournament: no code? Request one from the admin. */}
                {isPrivate && (
                  requested ? (
                    <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-3 flex items-center justify-center gap-2 text-emerald-200 font-title font-bold text-xs text-center">
                      <CheckCircle2 size={15} /> Request sent — the admin will share the referral code with you.
                    </div>
                  ) : (
                    <button
                      onClick={() => { soundManager.playClick(); onRequestCode(); }}
                      disabled={requestCode.isPending}
                      className="w-full py-2.5 rounded-2xl bg-black/60 border border-fuchsia-400/50 text-fuchsia-200 font-title font-black text-xs uppercase tracking-wider hover:border-fuchsia-400 hover:text-white transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5"
                    >
                      <KeyRound size={14} /> {requestCode.isPending ? "Sending request…" : "Don't have a code? Request it from the admin"}
                    </button>
                  )
                )}
              </>
            )}
            {error && <div className="text-xs text-rose-400 font-bold">{error}</div>}

            <p className="text-[11px] text-slate-500 text-center">Knockout Vera 31 — every elimination shrinks the field until one winner remains. The game opens for everyone at the GMT start time.</p>
          </div>
        )}
      </main>

      {/* Start-time survey popup (GMT) — arcade themed */}
      {showVote && t && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none" onClick={() => setShowVote(false)}>
          <div className="relative w-full max-w-md bg-gradient-to-b from-[#132019] via-[#0a1410] to-[#050b08] p-6 rounded-3xl border-2 border-amber-400/80 shadow-[0_0_60px_rgba(0,0,0,0.9)] flex flex-col gap-4 text-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300"><Clock size={20} /></div>
              <div>
                <h2 className="font-title font-black text-lg text-amber-300">PICK A START TIME</h2>
                <p className="text-xs text-slate-400">On {fmtGmtDate(t.startDate)} · all times GMT — most-voted wins.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {t.timeOptions.map((slot) => (
                <button key={slot} type="button" onClick={() => setSlotPick(slot)} className={`py-3 rounded-2xl border font-title font-black text-sm flex items-center justify-center gap-1 transition-all cursor-pointer ${slotPick === slot ? "bg-amber-400/20 border-amber-400 text-amber-300" : "bg-black/60 border-slate-700 text-slate-200 hover:border-amber-400/60"}`}>
                  <Clock size={13} /> {slot}
                </button>
              ))}
            </div>
            <button onClick={submitVote} disabled={!slotPick || voteTime.isPending} className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-title font-black text-xs uppercase tracking-wider shadow hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-40">
              {voteTime.isPending ? "Saving…" : "Save my vote"}
            </button>
          </div>
        </div>
      )}

      <OfficialRulesModal isOpen={showRules} onClose={() => setShowRules(false)} />

      {/* Lock in your skill loadout BEFORE the start-time survey (step 1 of joining). */}
      <SkillLoadoutModal
        isOpen={showSkillPicker}
        onClose={() => setShowSkillPicker(false)}
        onConfirm={confirmJoinWithSkills}
      />
    </div>
  );
}
