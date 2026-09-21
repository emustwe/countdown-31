"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Crown, LogIn, Play, Smartphone } from "lucide-react";
import { useSettingsStore } from "../../stores/settings-store";
import { useGuestStore } from "../../stores/guest-store";
import { useAuthStore } from "../../stores/auth-store";
import { useCosmetics } from "../../lib/hooks/useSponsors";
import { useCountdownLive, type GameMode, type LivePlayer } from "../../lib/hooks/useCountdownLive";
import { setClockDeadline, useDeadlinePassed } from "../../stores/clock-store";
import { soundManager } from "../../lib/soundManager";
import { BarnabyMascot } from "./BarnabyMascot";
import { EliminationSequence } from "./EliminationSequence";
import { KickoffWheel } from "./KickoffWheel";
import { WinnerCelebration } from "./WinnerCelebration";
import { CowntdownTimerCow } from "./CowntdownTimerCow";
import TurnIndicator from "./TurnIndicator";
import { MobileArenaOverlay } from "./MobileArenaOverlay";
import { ArcadeHeader } from "./ArcadeHeader";
import { ClassicArcBoard } from "./ClassicArcBoard";
import { OfficialRulesModal } from "./OfficialRulesModal";
import confetti from "canvas-confetti";
import { useGameConfig } from "../../lib/hooks/useGameConfig";
import { useSettledResize } from "../../lib/hooks/useSettledResize";
import { useVisualViewport } from "../../lib/hooks/useVisualViewport";
import { useRouter } from "next/navigation";

import { DEFAULT_GAME_CONFIG, DEFAULT_THEME_ADS, type GameTheme } from "../../lib/game-config";
import { MobileLandscape } from "./MobileLandscape";
import { TournamentSponsorLayer } from "./TournamentSponsorLayer";
import { ArenaAdBanners } from "./ArenaAdBanners";
import { resolveCampaignAssetUrl, useActiveTournamentCampaign } from "../../lib/hooks/useTournamentCampaign";

// Stable empty fallbacks. Inline `?? []` / `?? {}` allocate a NEW literal on every render, which
// would defeat ClassicArcBoard's memo on its `players` and `taken` props before it ever compared
// anything. Frozen so nothing can mutate a shared default.
const NO_PLAYERS: LivePlayer[] = Object.freeze([]) as unknown as LivePlayer[];
const NO_TAKEN: Record<number, string> = Object.freeze({}) as Record<number, string>;

export function CountDown31({ roomId = "practice", testArena = false, theme = null }: { roomId?: string; testArena?: boolean; theme?: GameTheme | null }) {
  const router = useRouter();
  const { data: serverConfig } = useGameConfig();
  const isTournament = roomId !== "practice";
  // A selected sponsor THEME overrides this tournament's brand (name/logo/tagline) via a header
  // config, and its backdrop via the viewport background.
  const themedHeaderConfig = theme
    ? {
        ...(serverConfig ?? DEFAULT_GAME_CONFIG),
        branding: {
          ...(serverConfig ?? DEFAULT_GAME_CONFIG).branding,
          gameTitle: theme.gameTitle,
          subtitle: theme.subtitle,
          logoUrl: theme.logoUrl,
        },
      }
    : undefined;
  // AD SURFACES from the selected sponsor theme (Game Studio → Ad placements). No theme → null, so
  // the board and roster keep their default look.
  const themeAds = useMemo(() => (theme ? { ...DEFAULT_THEME_ADS, ...(theme.ads ?? {}) } : null), [theme]);
  // Memoised so ClassicArcBoard's memo is not defeated by a fresh object every render. Null when no
  // sponsor theme is active (i.e. always, on practice), which is already stable.
  const boardBrand = useMemo(() => (themeAds
    ? {
        logoUrl: theme!.logoUrl || undefined,
        name: theme!.gameTitle || undefined,
        color: theme!.primaryColor,
        watermark: themeAds.boardWatermark,
        watermarkOpacity: themeAds.boardWatermarkOpacity,
        boardImage: themeAds.boardImage || undefined,
        boardStyle: themeAds.boardStyle,
        tileStyle: themeAds.tileStyle,
      }
    : null), [themeAds, theme]);
  // The arena list carries no banner any more — only its panel style (brand tint needs the colour).
  const rosterSponsor = useMemo(() => (themeAds ? { color: theme!.primaryColor } : null), [themeAds, theme]);
  const rosterStyle = themeAds ? themeAds.rosterStyle : undefined;
  // Sponsor campaign (co-branded tournament skin) — only for tour: rooms with a published campaign.
  const tournamentId = roomId.startsWith("tour:") ? roomId.slice(5) : null;
  const { data: campaignData } = useActiveTournamentCampaign(tournamentId);
  const campaign = campaignData?.campaign?.manifest ?? null;
  const gameConfig = isTournament ? (serverConfig ?? DEFAULT_GAME_CONFIG) : DEFAULT_GAME_CONFIG;
  const guestName = useGuestStore((s) => s.username);
  const setGuestName = useGuestStore((s) => s.setUsername);
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const defaultName = user?.fullName || user?.email?.split("@")[0] || guestName || "";
  const soundOn = useSettingsStore((s) => s.soundEnabled);
  const { data: cosmetics } = useCosmetics(!!accessToken);
  // The always-open TEST tournament runs the local engine with 100 CPU cows (auto-restarting), and is
  // playable only by an admin (everyone else watches). A real tournament uses the server socket.
  const { state, myId, join, leaveGame, submit, endDance, turnSeconds } = useCountdownLive(roomId, testArena ? { local: true, botCount: 100 } : undefined);
  // The practice room and the always-open test arena run the in-browser engine (which supports the
  // freeze-for-cow-dance). Real tournaments are server-driven.
  const isLocalEngine = roomId === "practice" || testArena;
  const isAdmin = user?.role === "ADMIN";
  // In the test arena, only an admin gets the join/rejoin controls + their own player card.
  const canPlay = !testArena || isAdmin;
  const [botCount, setBotCount] = useState<number>(gameConfig.gameplay.defaultBotCount);
  // Publishes the visible region to CSS so the name prompt can sit above the on-screen keyboard.
  useVisualViewport();

  const [chosenName, setChosenName] = useState("");
  const [showNameGate, setShowNameGate] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  // A brief "joining" loader when the local player first enters a practice game (gives the arena a
  // beat to settle). Tournaments use the full ArenaLoading flow instead.
  const [joining, setJoining] = useState(false);
  const wasAliveRef = useRef(false);

  // Game Mode: Classic 31 (pure counting) vs. Tactical Skill Mode (loadout cards).
  // Tournaments are now CLASSIC too (no skills); practice honours the configured default.
  const [gameMode, setGameMode] = useState<GameMode>(isTournament ? "classic" : gameConfig.gameplay.defaultMode);
  // Direct Card Selection State on the 3D Reel
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  // The arc board's fit scale — used to size the screen-edge ARENA roster overlay to match the board.
  const [boardScale, setBoardScale] = useState(1);
  // The arena roster is pinned to EXACTLY the number board's top (its "head" aligns with the board),
  // measured live so it survives the stage's padding + letterbox on every screen.
  const arenaMainRef = useRef<HTMLElement | null>(null);
  const arenaViewportRef = useRef<HTMLDivElement | null>(null);
  // Position (relative to the arena viewport) for the counting-cow overlay — placed just above the
  // board's top-right corner, OUTSIDE the clipped board so its head stays fully visible.
  const [cowBox, setCowBox] = useState<{ left: number; top: number } | null>(null);
  // The ARENA roster now lives INSIDE the board's own scaled stage (ClassicArcBoard), so the whole
  // arc + board + roster composition scales and centres as one unit — no parent alignment needed. The
  // ONLY overlay the parent still positions is the counting cow, which sits just above the board's
  // top-right corner OUTSIDE the clipped board so its head shows.
  const boardShiftX = 0;
  const alignArena = useCallback(() => {
    const main = arenaMainRef.current;
    if (!main) return;
    const board = main.querySelector(".nb-stage") as HTMLElement | null;
    if (!board) return;
    const b = board.getBoundingClientRect();
    const av = arenaViewportRef.current?.getBoundingClientRect();
    if (av) {
      const s = boardScale || 1;
      const COW_W = 158, COW_H = 154;
      const left = b.right - av.left - COW_W * s - 4;
      const top = b.top - av.top - COW_H * s + 10; // bottom dips ~10px into the board's title strip
      setCowBox((c) => (!c || Math.abs(c.left - left) > 0.5 || Math.abs(c.top - top) > 0.5 ? { left, top } : c));
    }
  }, [boardScale]);
  // Position the cow only once the viewport has SETTLED after a resize / orientation burst (mobile
  // auto-rotation fires a flurry of transient sizes). See useSettledResize.
  useSettledResize(alignArena, arenaMainRef);

  // Orientation-transition MASK. On a phone, auto-rotating between portrait and landscape flips the
  // orientation media query (which toggles the 90° fake-landscape transform), swaps the viewport
  // dimensions, and re-runs every measured layout — all mid-animation. Even with the measurements
  // settle-gated, that produces a visible snap. So while the device is actively rotating we cover the
  // arena with an opaque "rotating" screen and lift it only once the viewport has held steady, so the
  // player never sees the intermediate churn — the arena simply reappears already laid out.
  const [rotating, setRotating] = useState(false);
  // Portal target readiness — the rotate prompt must live at <body> level (see below), not inside the
  // arena's stacking context, so it can cover the body-level mobile profile button in portrait.
  const [portalReady, setPortalReady] = useState(false);
  useEffect(() => setPortalReady(true), []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const coarse = window.matchMedia?.("(pointer: coarse)")?.matches;
    if (!coarse) return; // phones/tablets only — desktop window-resizing shouldn't flash a cover
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    let lastLandscape = window.innerWidth >= window.innerHeight;
    const cover = () => {
      setRotating(true);
      if (hideTimer) clearTimeout(hideTimer);
      // Hold the cover across the rotation animation + the settle window, then reveal the settled arena.
      hideTimer = setTimeout(() => setRotating(false), 650);
    };
    const onOrient = () => cover();
    const onResize = () => {
      const landscape = window.innerWidth >= window.innerHeight;
      if (landscape !== lastLandscape) {
        lastLandscape = landscape;
        cover(); // aspect flipped → a rotation is under way even if orientationchange didn't fire
      }
    };
    window.addEventListener("orientationchange", onOrient);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("orientationchange", onOrient);
      window.removeEventListener("resize", onResize);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  const prevCount = useRef(0);
  const prevStatus = useRef(state?.status);
  const prevMyTurn = useRef(false);
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;

  // Tell the shared clock which deadline to align its boundaries to. This component does NOT
  // subscribe — it only points the ticker at the current turn, so it never re-renders on a tick.
  // (It used to hold `setInterval(() => setNow(Date.now()), 200)`, re-rendering this entire
  // 975-line component and its unmemoized subtree five times a second for the life of the page.)
  useEffect(() => {
    setClockDeadline(state?.turnEndsAt ?? null);
  }, [state?.turnEndsAt]);
  useEffect(() => () => setClockDeadline(null), []);

  useEffect(() => {
    if (chosenName) return;
    setBotCount(gameConfig.gameplay.defaultBotCount);
    setGameMode(isTournament ? "classic" : gameConfig.gameplay.defaultMode);
  }, [chosenName, gameConfig, isTournament]);

  const count = state?.count ?? 0;
  const players = state?.players ?? NO_PLAYERS;
  const status = state?.status ?? "waiting";
  const currentId = state?.currentId ?? null;
  const amIn = !!myId && players.some((p) => p.id === myId);
  // Two dance sources: the LOCAL practice engine (`state.dancing`) and a SERVER tournament dance
  // (`state.danceEndsAt`, a timed freeze the server broadcasts to EVERYONE on each elimination). Both
  // freeze the arena; the server one is what makes every player see the cow centre-stage at once.
  const spinPhase = !!state?.spinEndsAt;
  // A ONE-SHOT flip at the freeze deadline, not a per-second comparison. Polling this against a 1s
  // clock would let the dance overstay by up to a second; a single timeout lands on it exactly, and
  // it keeps the whole `frozen` → `myTurn` chain (18 call sites) off the clock entirely.
  const danceOver = useDeadlinePassed(state?.danceEndsAt ?? null);
  const serverDancing = !!state?.danceEndsAt && !danceOver;
  const dancePhase = !!state?.dancing || serverDancing;
  // Elimination cinematic phase (local engine): "seq" = the 4.6s ELIMINATION sequence plays on every
  // elimination; "cow" = the dancing cow, shown ONLY when that elimination completed the round (31).
  const [elimPhase, setElimPhase] = useState<"seq" | "cow" | null>(null);
  useEffect(() => {
    setElimPhase(state?.dancing ? "seq" : null);
  }, [state?.dancing?.id]);
  const frozen = dancePhase || spinPhase;
  const myTurn = status === "playing" && currentId === myId && !frozen;
  const myPlayer = players.find((p) => p.id === myId) ?? null;
  // "In and alive" — an eliminated player should get an immediate rejoin, not a spectator strip.
  const amInAlive = amIn && !!myPlayer && !myPlayer.eliminated;
  const isMyWin = !!(state?.winner && players.find((player) => player.id === myId)?.name === state.winner.name);
  // My own elimination. In a REAL tournament the server REMOVES me from `players` when I'm out (so
  // `myPlayer` goes null) — so match on my name against the latest elimination instead of a flag.
  const myName = (myPlayer?.name ?? chosenName ?? "").slice(0, 20);
  const isLocalDefeat = !!(myName && state?.lastEliminated?.name === myName && !amInAlive);

  // NOTE: `remaining` / `remainingSeconds` / `isLowTime` / `turnLap` used to live here, which made
  // every per-second value a dependency of this component. They now live in the leaves that render
  // them (CowntdownTimerCow, TurnIndicator), each subscribing to the shared clock
  // with a whole-second selector. What stays here derives only from `state`, never from the clock.
  const turnEndsAt = state?.turnEndsAt ?? null;
  const timerRunning = status === "playing" && !!state?.turnEndsAt;
  // The countdown cow belongs to whoever is CURRENTLY playing, so everyone in the arena can read the
  // clock — knocked-out players watching included. It's suppressed only while the arena is FROZEN
  // (elimination cinematic / cow dance / kickoff wheel), which is also the window my own defeat
  // sequence owns. This used to be gated on `isLocalDefeat`, which made the cow vanish for me the
  // moment I was eliminated and only reappear once somebody else went out.
  const countdownActive = timerRunning && status === "playing" && !frozen;

  // Practice / test-arena get an eliminated rejoin control; a real tournament is watch-only once out.
  const showRejoinControl = status !== "over" && !amInAlive && (!isTournament || testArena) && canPlay;
  const showWatchStrip = status !== "over" && isTournament && !testArena && amIn && !amInAlive;

  // The arc-rail board is now the board for EVERYTHING — practice (classic + skills), real
  // tournaments, and the test arena. Skills mode adds the loadout as turn actions; tournaments are
  // skills-only, server-driven, auto-join, and watch-only once eliminated (no rejoin button).
  // A manual join/rejoin control only where rejoining is allowed (practice + the admin test arena).
  // Real tournaments auto-join and are watch-only afterwards, so they never show it.
  const showArcJoin = showRejoinControl;
  // Spectator note shown in the picker slot when the local player is watching (eliminated in a real
  // tournament, or a non-admin in the test arena).
  const arcSpectatorMessage = showWatchStrip
    ? "You're eliminated — enjoy the rest of the match 👀"
    : testArena && !canPlay
      ? "Live test arena — spectating"
      : null;

  // Reset card selection whenever turn or count changes
  useEffect(() => {
    setSelectedCards([]);
  }, [count, myTurn, status]);

  // Audio on count progression & danger threshold
  useEffect(() => {
    const delta = count - prevCount.current;
    prevCount.current = count;
    if (delta > 0 && soundRef.current) {
      soundManager.playStep(count, delta === 2 ? 2 : delta === 3 ? 3 : 1);
      if (count >= 28 && count < 31) {
        setTimeout(() => soundManager.playDanger(), 150);
      }
    }
  }, [count]);

  useEffect(() => {
    if (myTurn && !prevMyTurn.current && status === "playing") soundManager.playTurnStart();
    prevMyTurn.current = myTurn;
  }, [myTurn, status]);

  // Audio & confetti on game end / defeat / victory
  useEffect(() => {
    if (status === "over" && prevStatus.current !== "over") {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 700);

      const isWinner = state?.winner && players.find((p) => p.id === myId)?.name === state.winner.name;
      // A tournament finale ALWAYS sets off fireworks to celebrate the winner (even for spectators
      // who were already eliminated). Practice keeps the old win-only confetti.
      if (isWinner || isTournament) {
        soundManager.playVictory();
        const colors = ["#5be348", "#ffdf78", "#ff43c4", "#21e6d7"];
        try {
          confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 }, colors });
          if (isTournament) {
            setTimeout(() => confetti({ particleCount: 90, angle: 60, spread: 70, origin: { x: 0, y: 0.65 }, colors }), 250);
            setTimeout(() => confetti({ particleCount: 90, angle: 120, spread: 70, origin: { x: 1, y: 0.65 }, colors }), 450);
          }
        } catch {}
      } else {
        soundManager.playSpinDefeat();
      }
    }
    prevStatus.current = status;
  }, [status, state?.winner, players, myId]);

  // Real tournament: skills were already LOCKED IN at join time (on the detail page, before the
  // start-time survey), so entering needs NO name prompt and NO skill modal — we just socket-join
  // INSTANTLY under the account name. That's what lets the kickoff wheel start at the same moment for
  // everyone. Practice + the admin test arena keep their manual join.
  // Practice-only: the instant the local player becomes an active player, flash a short cool loader.
  useEffect(() => {
    if (isLocalEngine && amInAlive && !wasAliveRef.current) {
      wasAliveRef.current = true;
      setJoining(true);
      // Just long enough to read as a deliberate transition rather than a flicker. It used to hold
      // 1.3s, which stacked on top of the wait for the first turn and made PLAY feel unresponsive.
      const h = setTimeout(() => setJoining(false), 350);
      return () => clearTimeout(h);
    }
    if (!amInAlive) wasAliveRef.current = false;
  }, [isLocalEngine, amInAlive]);

  const autoJoinedRef = useRef(false);
  useEffect(() => {
    if (isTournament && !testArena && user && !amIn && status !== "over" && !autoJoinedRef.current) {
      autoJoinedRef.current = true;
      const name = (user.fullName || user.email?.split("@")[0] || "Player").slice(0, 20);
      setChosenName(name);
      join(name, { card: cosmetics?.card as Record<string, unknown> | undefined, avatar: cosmetics?.avatar }, "classic", []);
    }
  }, [isTournament, testArena, user, amIn, status, join, cosmetics]);

  // A valid move is a contiguous run of 1–3 cards starting at count+1. Selecting NEVER auto-submits
  // and NEVER eliminates — the player picks/de-picks freely and only commits with CONFIRM MOVE.
  // Clicking a playable tile sets the run to reach it; clicking the current last card removes it.
  // Reads per-turn state by design — count, selectedCards, myTurn, frozen all change during a
  // turn, so this DOES re-create as the turn progresses. That is correct: a stale closure here
  // would validate a move against a previous board. Stability across turns is not the goal.
  const handleToggleCard = useCallback((num: number) => {
    if (!myTurn || status !== "playing" || frozen) return;
    const runLength = num - count; // count+1 -> 1, count+2 -> 2, count+3 -> 3
    if (runLength < 1 || runLength > 3) return; // only the next three cards are selectable

    // Clicking the current last-selected card de-selects it (step back one).
    if (selectedCards.length === runLength && selectedCards[selectedCards.length - 1] === num) {
      soundManager.playClose();
      setSelectedCards((prev) => prev.slice(0, -1));
      return;
    }

    soundManager.playCardSelect();
    const run: number[] = [];
    for (let i = 1; i <= runLength; i++) run.push(count + i);
    setSelectedCards(run);
    // Closes over: myTurn, status, frozen, count, selectedCards.
  }, [myTurn, status, frozen, count, selectedCards]);

  // Same reasoning as handleToggleCard: submits the CURRENT selection against the CURRENT turn.
  const handleConfirmMove = useCallback(() => {
    if (!myTurn || frozen || selectedCards.length === 0) return;
    submit(selectedCards);
    setSelectedCards([]);
    // Closes over: myTurn, frozen, selectedCards, submit.
  }, [myTurn, frozen, selectedCards, submit]);



  function handleModeChange(mode: GameMode) {
    if (mode === gameMode) return;
    soundManager.playClick();
    setGameMode(mode);
    setSelectedCards([]);
    // Classic and Skill are SEPARATE practice games. Switching modes drops you out of the current
    // game and starts the other mode's arena — you must explicitly JOIN it (button appears).
    leaveGame(mode);
  }

  // useCallback so `rejoin` (and therefore BarnabyMascot's memo) can be stable. Reads NOTHING that
  // changes per turn — no board state, no currentId, no selectedCards — so it survives a whole game
  // without re-creating.
  const openNameGate = useCallback(() => {
    soundManager.playClick();
    if (!accessToken && !gameConfig.gameplay.guestPlayEnabled) {
      router.push("/login?next=%2Fhome");
      return;
    }
    // A logged-in player already HAS a name — never prompt for one. The name gate is only for a
    // GUEST playing practice without an account. Logged-in users go straight to the game using their
    // account name — join immediately.
    if (user) {
      const name = (defaultName || "Player").slice(0, 20);
      setChosenName(name);
      if (isTournament && !testArena) {
        join(name, { card: cosmetics?.card as Record<string, unknown> | undefined, avatar: cosmetics?.avatar }, "classic", []);
      } else {
        join(name, { card: cosmetics?.card as Record<string, unknown> | undefined, avatar: cosmetics?.avatar }, "classic", [], botCount);
      }
      return;
    }
    setNameInput(chosenName || defaultName);
    setShowNameGate(true);
    // Closes over: accessToken, gameConfig, router, user, defaultName, isTournament, testArena,
    // join, cosmetics, botCount, chosenName. (setState setters are stable and omitted.)
  }, [accessToken, gameConfig, router, user, defaultName, isTournament, testArena, join, cosmetics, botCount, chosenName]);

  function confirmJoin() {
    soundManager.playClick();
    const name = nameInput.trim().slice(0, 20) || `Player ${Math.floor(1000 + Math.random() * 9000)}`;
    setChosenName(name);
    if (!user) setGuestName(name);
    setShowNameGate(false);

    join(name, { card: cosmetics?.card as Record<string, unknown> | undefined, avatar: cosmetics?.avatar }, "classic", [], botCount);
  }

  // useCallback so BarnabyMascot's `onPlayAgain` is referentially stable and its memo actually
  // holds. Like openNameGate it reads no per-turn state, so it does not re-create between turns.
  const rejoin = useCallback(() => {
    soundManager.playClick();
    if (chosenName) {
      join(chosenName, { card: cosmetics?.card as Record<string, unknown> | undefined, avatar: cosmetics?.avatar }, "classic", [], botCount);
    } else {
      openNameGate();
    }
    // Closes over: chosenName, join, cosmetics, botCount, openNameGate.
  }, [chosenName, join, cosmetics, botCount, openNameGate]);

  // Shared action-zone content (used by both the desktop center column and the mobile shell action).

  return (
    <div
      ref={arenaViewportRef}
      className={`arena-viewport mobile-landscape-game relative flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden px-2 py-1 sm:px-6 ${campaign ? "has-tournament-campaign" : ""} ${theme ? "has-tournament-theme" : ""} ${isShaking ? "animate-screen-shake" : ""} ${elimPhase === "seq" || (!isLocalEngine && serverDancing) ? "elim-frozen" : ""}`}
      style={
        campaign
          ? ({
              "--campaign-overlay": String(campaign.theme.overlayOpacity),
              "--campaign-bg-desktop": `url("${resolveCampaignAssetUrl(campaign.theme.backgroundImage)}")`,
              "--campaign-bg-mobile": `url("${resolveCampaignAssetUrl(campaign.theme.mobileBackgroundImage || campaign.theme.backgroundImage)}")`,
            } as React.CSSProperties)
          : theme && theme.backgroundImage
            ? {
                backgroundImage: `linear-gradient(rgba(2,8,5,${theme.overlayOpacity}),rgba(2,8,5,${Math.min(0.9, theme.overlayOpacity + 0.15)})), url("${theme.backgroundImage}")`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
      }
    >
      <MobileLandscape />

      {/* Mobile nav menu + single-column roster — portaled to <body> so the arena auto-rotate
          transform never drags them to the wrong screen corner. */}
      <MobileArenaOverlay players={players} currentId={currentId} hidden={showNameGate || showRules} hideRoster />

      {campaign && (
        <TournamentSponsorLayer
          manifest={campaign}
          causePaused={campaignData?.campaign?.isCausePaused}
          tournamentId={tournamentId}
          revision={campaignData?.campaign?.revision}
        />
      )}
      {/* Top Arcade Header Marquee with Game Mode Switcher */}
      <ArcadeHeader
        config={themedHeaderConfig}
        onOpenRules={() => setShowRules(true)}
        gameMode={gameMode}
        onToggleMode={handleModeChange}
        showModeToggle={!isTournament && gameConfig.gameplay.allowClassic && gameConfig.gameplay.allowSkills}
        isTournament={isTournament}
        campaign={campaign}
        causePaused={campaignData?.campaign?.isCausePaused}
        tournamentId={tournamentId}
        campaignRevision={campaignData?.campaign?.revision}
      />

      {/* Counting-cow overlay — rendered OUTSIDE the clipped board so it can rise above the board with
          its head fully visible. Positioned (measured) just above the board's top-right corner. */}
      {cowBox && (
        <div
          className="pointer-events-none absolute z-40"
          style={{ left: cowBox.left, top: cowBox.top, width: 158, height: 154, transform: `scale(${boardScale})`, transformOrigin: "top left" }}
        >
          <CowntdownTimerCow
            anchored
            active={countdownActive}
            isMyTurn={myTurn}
            turnEndsAt={turnEndsAt}
            turnSeconds={turnSeconds}
            turnKey={currentId ?? count}
          />
        </div>
      )}

      {/* PLAY button — practice join / rejoin. Pinned to the LEFT side and VERTICALLY CENTRED on the
          page (below the top-left "31" mark). Shown only when you can take a seat. */}
      {showArcJoin && (
        <div className="nb-play-pos absolute top-1/2 z-30 -translate-y-1/2 flex flex-col items-center gap-1.5 select-none">
          <button
            type="button"
            onClick={chosenName ? rejoin : openNameGate}
            aria-label={chosenName ? "Rejoin the game" : "Play — join the game"}
            title={chosenName ? "Rejoin" : "Play"}
            className="relative grid h-[44px] w-[44px] place-items-center rounded-full border-2 border-white bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 text-slate-950 shadow-[0_0_24px_rgba(245,158,11,0.85)] transition-transform hover:scale-105 active:scale-95 cursor-pointer sm:h-[52px] sm:w-[52px]"
          >
            <span className="pointer-events-none absolute inset-[-4px] rounded-full ring-2 ring-amber-400/45 animate-ping" />
            <Play size={22} className="translate-x-[1px] fill-slate-950" strokeWidth={2.5} />
          </button>
          <span className="font-title text-[10px] font-black uppercase tracking-[0.18em] text-amber-300 drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">
            {chosenName ? "Rejoin" : "Play"}
          </span>
        </div>
      )}

      {/* CLASSIC-PRACTICE ARC BOARD — a curved player rail with a right-side number picker, running
          total and claimed-numbers ledger. Everything else (skills, tournaments, test arena) keeps
          the horizontal cylinder board below. */}
      {/* The arc-rail board is the ONLY arena layout. The legacy 3-column /
          mobile-shell branch that used to sit behind `useArcBoard === false` was
          unreachable (the flag was a hardcoded `true`) and has been removed. */}
        <main ref={arenaMainRef} className="arena-main relative mx-auto flex min-h-0 w-full max-w-[1580px] flex-1 overflow-hidden mt-0 sm:mt-2">
          {/* The ARENA roster is now rendered INSIDE ClassicArcBoard's scaled stage (right of the
              board), so the whole arc + board + roster group scales and centres as one balanced unit. */}
          <ClassicArcBoard
            boardBrand={boardBrand}
            rosterSponsor={rosterSponsor}
            rosterStyle={rosterStyle}
            onScale={setBoardScale}
            shiftX={boardShiftX}
            players={players}
            currentId={currentId}
            myId={myId}
            count={count}
            taken={state?.taken ?? NO_TAKEN}
            lastMove={state?.lastMove ?? null}
            forbiddenK={state?.lastK ?? null}
            selectedCards={selectedCards}
            onToggleCard={handleToggleCard}
            onConfirmMove={handleConfirmMove}
            myTurn={myTurn}
            status={status}
            amInAlive={amInAlive}
            showJoin={showArcJoin}
            onJoin={chosenName ? rejoin : openNameGate}
            timerActive={countdownActive}
            turnKey={currentId ?? count}
            spectatorMessage={arcSpectatorMessage}
            selecting={state?.selecting ?? null}
          />
        </main>

      {/* Bottom stats dock (players/round/arena/turn/ping) removed per design — cleaner arena. */}

      {/* Kickoff wheel: auto-shown when a game begins with a spin phase (tournaments + test arena). */}
      {spinPhase && state && (
        <KickoffWheel players={players} spinEndsAt={state.spinEndsAt!} startingId={currentId} />
      )}

      {/* End of game: a full-screen takeover showing ONLY the winner + fireworks (covers the board). */}
      {status === "over" && (
        <WinnerCelebration
          winnerName={state?.winner?.name ?? "Champion"}
          isMyWin={isMyWin}
          isTournament={isTournament}
          onPlayAgain={rejoin}
          onExit={() => router.push("/events")}
        />
      )}

      {/* ELIMINATION cinematic — plays on EVERY elimination, showing the eliminated player's avatar +
          name + reason. Local: driven by state.dancing (seq phase). Server tournament: driven by the
          server freeze + lastEliminated. */}
      {isLocalEngine && state?.dancing && elimPhase === "seq" && (
        <EliminationSequence
          name={state.dancing.name}
          avatar={state.dancing.avatar}
          color={state.dancing.color}
          seat={state.dancing.seat}
          reason={state.dancing.reason}
          remaining={state.dancing.remaining}
          onDone={() => {
            // The dancing cow shows ONLY when this elimination completed the round (31); otherwise
            // resume straight away.
            if (state.dancing?.roundDone) setElimPhase("cow");
            else endDance();
          }}
        />
      )}
      {/* Mid-lap knockout (timeout/repeat/skip/over-3): the elimination cinematic. A round-completing
          "31" instead plays the dancing cow below (round over → next round). */}
      {!isLocalEngine && serverDancing && state?.lastEliminated && state.lastEliminated.reason !== "31" && (
        <EliminationSequence
          key={state.lastEliminated.name}
          name={state.lastEliminated.name}
          reason={state.lastEliminated.reason}
          remaining={players.filter((p) => !p.eliminated).length}
          onDone={() => {}}
        />
      )}

      <BarnabyMascot
        status={status}
        winner={state?.winner ?? null}
        lastEliminated={state?.lastEliminated ?? null}
        isMyWin={isMyWin}
        isLocalDefeat={isLocalDefeat}
        // The dancing cow plays ONLY at ROUND COMPLETION (a "31" elimination — the lap resets), never
        // on an ordinary mid-lap elimination (the ELIMINATION sequence above owns those). Local uses
        // the "cow" phase; the server tournament dances whenever its freeze is for a "31".
        //
        // DELIBERATELY SEPARATE from the FREEZE gate at useCountdownLive.ts:383 (`freezeEveryElim`),
        // which freezes the arena on every practice elimination. Freeze != dance; changing one does
        // not change the other.
        forceDancing={isLocalEngine ? elimPhase === "cow" : serverDancing && state?.lastEliminated?.reason === "31"}
        serverPaced={!isLocalEngine}
        // The full-screen WinnerCelebration owns the finale — mascot shows no result panel.
        showPlayAgain={false}
        onDanceEnd={endDance}
        onPlayAgain={rejoin}
      />

      {/* Animated Countdown Cow — announces + counts the local player's turn (visible number + ticks).
          The classic arc board renders its OWN cow pinned to the number-board corner, so the standalone
          upper-centre one is only for the other boards (skills / tournament / test arena). */}

      {/* Whose-turn-is-it signals — cyan frame breathe + "YOUR TURN" sweep + sound/haptic/tab-title.
          Cyan = YOU, warm white = everyone else. Shared by practice AND live tournaments. */}
      {/* Extra sponsor ad slots (centre + the side opposite the marquee). Decorative + click-through. */}
      {themeAds && (
        <div
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 18, fontSize: "clamp(9px, 1.5vh, 15px)" }}
        >
          <ArenaAdBanners ads={themeAds} />
        </div>
      )}

      <TurnIndicator
        active={status === "playing" && !frozen}
        myTurn={myTurn}
        currentName={players.find((p) => p.id === currentId)?.name ?? ""}
        turnEndsAt={turnEndsAt}
        turnSeconds={turnSeconds}
        turnKey={currentId ?? count}
        soundOn={soundOn}
      />

      {/* "Rotate your phone to play" — visibility is controlled purely by CSS (shown only on a touch
          device held in portrait). The arena's measured layout is valid only in TRUE landscape, so in
          portrait we cover it with this prompt instead of a broken 90° fake-rotate. Portaled to <body>
          so it sits above the body-level mobile profile button (which is outside the arena's stacking
          context and would otherwise peek through). */}
      {portalReady &&
        createPortal(
          <div className="rotate-to-play" aria-hidden>
            <div className="rtp-phone">
              <Smartphone size={40} />
            </div>
            <div className="rtp-title">Rotate your phone</div>
            <div className="rtp-sub">Turn sideways to enter the arena — Vera 31 plays in landscape.</div>
          </div>,
          document.body,
        )}

      {/* Orientation-transition mask — opaque cover shown only while the phone is actively rotating, so
          the layout snap/churn is never visible. Lifts once the viewport has settled. */}
      {rotating && (
        <div className="arena-rotate-cover" aria-hidden>
          <div className="arena-rotate-inner">
            <div className="relative w-14 h-14">
              <span className="absolute inset-0 rounded-full border-4 border-amber-400/25 border-t-amber-400 animate-spin" />
              <span className="absolute inset-0 grid place-items-center font-title font-black text-amber-300 text-base">31</span>
            </div>
            <span className="font-title font-black text-amber-300 text-[11px] uppercase tracking-widest">Rotating…</span>
          </div>
        </div>
      )}

      {/* Small "joining" loader when entering the practice game. */}
      {joining && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 backdrop-blur-sm pointer-events-none select-none">
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-16 h-16">
              <span className="absolute inset-0 rounded-full border-4 border-amber-400/25 border-t-amber-400 animate-spin" />
              <span className="absolute inset-0 grid place-items-center font-title font-black text-amber-300 text-lg">31</span>
            </div>
            <span className="font-title font-black text-amber-300 text-xs uppercase tracking-widest animate-pulse">Joining the pasture…</span>
          </div>
        </div>
      )}

      {/* Pre-Match 2-Skill Loadout Selector Modal */}

      {/* Official 31 Game Rules Modal */}
      <OfficialRulesModal isOpen={showRules} onClose={() => setShowRules(false)} />

      {/* Choose Your Name Gate Modal */}
      {showNameGate && (
        <div className="cd31-gate-overlay" onClick={() => setShowNameGate(false)}>
          <div className="cd31-gate" onClick={(e) => e.stopPropagation()}>
            <span className="cd31-gate-ico">
              <Crown size={22} />
            </span>
            <h2 className="font-title text-2xl font-black">{gameConfig.gameplay.guestNamePrompt}</h2>
            <p className="font-ui text-sm">Enter the arcade pasture and battle for the crown!</p>
            <input
              // NO autoFocus. On iOS it opened the keyboard the instant the prompt appeared, which
              // shrank the visual viewport and hid the card behind the keyboard — the name could
              // not be typed at all. The player taps the field when they are ready.
              value={nameInput}
              maxLength={gameConfig.gameplay.maxGuestNameLength}
              placeholder="Your cow name"
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && nameInput.trim()) confirmJoin();
              }}
            />
            <button className="btn-arcade-3d btn-arcade-green text-base py-3 w-full" onClick={confirmJoin} disabled={!nameInput.trim()}>
              <LogIn size={18} /> Enter Game
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

