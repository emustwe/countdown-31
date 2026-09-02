"use client";

import React, { useEffect, useRef, useState } from "react";
import { Crown, LogIn, Dices, Sparkles, Send, Play } from "lucide-react";
import { useSettingsStore } from "../../stores/settings-store";
import { useGuestStore } from "../../stores/guest-store";
import { useAuthStore } from "../../stores/auth-store";
import { useCosmetics } from "../../lib/hooks/useSponsors";
import { useCountdownLive, type SkillType, type GameMode } from "../../lib/hooks/useCountdownLive";
import { soundManager } from "../../lib/soundManager";
import { BarnabyMascot } from "./BarnabyMascot";
import { KickoffWheel } from "./KickoffWheel";
import { WinnerCelebration } from "./WinnerCelebration";
import { CowntdownTimerCow } from "./CowntdownTimerCow";
import { SkillFXOverlay } from "./SkillFXOverlay";
import { MobileArenaOverlay } from "./MobileArenaOverlay";
import { ArcadeHeader } from "./ArcadeHeader";
import { Arcade3DCylinder } from "./Arcade3DCylinder";
import { ClassicArcBoard } from "./ClassicArcBoard";
import { ArcadePlayerCard, ArcadeOpponentCard } from "./ArcadePlayerCards";
import { OfficialRulesModal } from "./OfficialRulesModal";
import { SkillLoadoutModal } from "./SkillLoadoutModal";
import confetti from "canvas-confetti";
import { useGameConfig } from "../../lib/hooks/useGameConfig";
import { useRouter } from "next/navigation";

import { DEFAULT_GAME_CONFIG, type GameTheme } from "../../lib/game-config";
import { MobileArenaShell } from "./MobileArenaShell";
import { MobileBattleStrip } from "./MobileBattleStrip";
import { MobileLandscape } from "./MobileLandscape";
import { TournamentSponsorLayer } from "./TournamentSponsorLayer";
import { resolveCampaignAssetUrl, useActiveTournamentCampaign } from "../../lib/hooks/useTournamentCampaign";

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
  const { state, myId, join, leaveGame, submit, useSkill, endDance } = useCountdownLive(roomId, testArena ? { local: true, botCount: 100 } : undefined);
  // The practice room and the always-open test arena run the in-browser engine (which supports the
  // freeze-for-cow-dance). Real tournaments are server-driven.
  const isLocalEngine = roomId === "practice" || testArena;
  const isAdmin = user?.role === "ADMIN";
  // In the test arena, only an admin gets the join/rejoin controls + their own player card.
  const canPlay = !testArena || isAdmin;
  const [botCount, setBotCount] = useState<number>(gameConfig.gameplay.defaultBotCount);

  const [chosenName, setChosenName] = useState("");
  const [showNameGate, setShowNameGate] = useState(false);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  // A brief "joining" loader when the local player first enters a practice game (gives the arena a
  // beat to settle). Tournaments use the full ArenaLoading flow instead.
  const [joining, setJoining] = useState(false);
  const wasAliveRef = useRef(false);

  // Game Mode: Classic 31 (pure counting) vs. Tactical Skill Mode (loadout cards).
  // Real tournaments are SKILLS-ONLY; practice honours the configured default.
  const [gameMode, setGameMode] = useState<GameMode>(isTournament ? "skills" : gameConfig.gameplay.defaultMode);
  // Direct Card Selection State on the 3D Reel
  const [selectedCards, setSelectedCards] = useState<number[]>([]);

  const [now, setNow] = useState(() => Date.now());
  const prevCount = useRef(0);
  const prevStatus = useRef(state?.status);
  const prevMyTurn = useRef(false);
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (chosenName) return;
    setBotCount(gameConfig.gameplay.defaultBotCount);
    setGameMode(isTournament ? "skills" : gameConfig.gameplay.defaultMode);
  }, [chosenName, gameConfig, isTournament]);

  const count = state?.count ?? 0;
  const players = state?.players ?? [];
  const status = state?.status ?? "waiting";
  const currentId = state?.currentId ?? null;
  const amIn = !!myId && players.some((p) => p.id === myId);
  // Two dance sources: the LOCAL practice engine (`state.dancing`) and a SERVER tournament dance
  // (`state.danceEndsAt`, a timed freeze the server broadcasts to EVERYONE on each elimination). Both
  // freeze the arena; the server one is what makes every player see the cow centre-stage at once.
  const spinPhase = !!state?.spinEndsAt;
  const serverDancing = !!state?.danceEndsAt && now < state.danceEndsAt;
  const dancePhase = !!state?.dancing || serverDancing;
  const frozen = dancePhase || spinPhase;
  const myTurn = status === "playing" && currentId === myId && !frozen;
  const myPlayer = players.find((p) => p.id === myId) ?? null;
  // "In and alive" — an eliminated player should get an immediate rejoin, not a spectator strip.
  const amInAlive = amIn && !!myPlayer && !myPlayer.eliminated;
  const opponentPlayer = players.find((p) => p.id !== myId) ?? players[1] ?? null;
  const isOpponentTurn = status === "playing" && currentId !== myId && currentId !== null;
  const isMyWin = !!(state?.winner && players.find((player) => player.id === myId)?.name === state.winner.name);
  // My own elimination. In a REAL tournament the server REMOVES me from `players` when I'm out (so
  // `myPlayer` goes null) — so match on my name against the latest elimination instead of a flag.
  const myName = (myPlayer?.name ?? chosenName ?? "").slice(0, 20);
  const isLocalDefeat = !!(myName && state?.lastEliminated?.name === myName && !amInAlive);

  const remaining = state?.turnEndsAt ? Math.max(0, state.turnEndsAt - now) : 0;
  const remainingSeconds = Math.ceil(remaining / 1000);
  const timerRunning = status === "playing" && !!state?.turnEndsAt;
  const isLowTime = remainingSeconds <= 2 && timerRunning;

  // Practice / test-arena get an eliminated rejoin control; a real tournament is watch-only once out.
  const showRejoinControl = status !== "over" && !amInAlive && (!isTournament || testArena) && canPlay;
  const showWatchStrip = status !== "over" && isTournament && !testArena && amIn && !amInAlive;

  // The arc-rail board is now the board for EVERYTHING — practice (classic + skills), real
  // tournaments, and the test arena. Skills mode adds the loadout as turn actions; tournaments are
  // skills-only, server-driven, auto-join, and watch-only once eliminated (no rejoin button).
  const useArcBoard = true;
  // A manual join/rejoin control only where rejoining is allowed (practice + the admin test arena).
  // Real tournaments auto-join and are watch-only afterwards, so they never show it.
  const showArcJoin = useArcBoard && showRejoinControl;
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
      const h = setTimeout(() => setJoining(false), 1300);
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
      join(name, { card: cosmetics?.card as Record<string, unknown> | undefined, avatar: cosmetics?.avatar }, "skills", []);
    }
  }, [isTournament, testArena, user, amIn, status, join, cosmetics]);

  // A valid move is a contiguous run of 1–3 cards starting at count+1. Selecting NEVER auto-submits
  // and NEVER eliminates — the player picks/de-picks freely and only commits with CONFIRM MOVE.
  // Clicking a playable tile sets the run to reach it; clicking the current last card removes it.
  function handleToggleCard(num: number) {
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
  }

  function handleConfirmMove() {
    if (!myTurn || frozen || selectedCards.length === 0) return;
    submit(selectedCards);
    setSelectedCards([]);
  }

  function handleSkill(skill: SkillType) {
    if (!myTurn || frozen) return;
    // Using a skill IS the player's move for this turn — clear any number selection; the engine
    // applies the skill and passes the turn (so no numbers need to be submitted).
    if (useSkill(skill)) setSelectedCards([]);
  }

  function handleModeChange(mode: GameMode) {
    if (mode === gameMode) return;
    soundManager.playClick();
    setGameMode(mode);
    setSelectedCards([]);
    // Classic and Skill are SEPARATE practice games. Switching modes drops you out of the current
    // game and starts the other mode's arena — you must explicitly JOIN it (button appears).
    leaveGame(mode);
  }

  function openNameGate() {
    soundManager.playClick();
    if (!accessToken && !gameConfig.gameplay.guestPlayEnabled) {
      router.push("/login?next=%2Fhome");
      return;
    }
    // A logged-in player already HAS a name — never prompt for one. The name gate is only for a
    // GUEST playing practice without an account. Logged-in users go straight to the game using their
    // account name (skill mode → pick a loadout first; classic → join immediately).
    if (user) {
      const name = (defaultName || "Player").slice(0, 20);
      setChosenName(name);
      if (isTournament && !testArena) {
        // Tournament: skills are already locked in from the join step — just join, no modal.
        join(name, { card: cosmetics?.card as Record<string, unknown> | undefined, avatar: cosmetics?.avatar }, "skills", []);
      } else if (gameMode === "skills") {
        setShowSkillModal(true);
      } else {
        join(name, { card: cosmetics?.card as Record<string, unknown> | undefined, avatar: cosmetics?.avatar }, "classic", [], botCount);
      }
      return;
    }
    setNameInput(chosenName || defaultName);
    setShowNameGate(true);
  }

  function confirmJoin() {
    soundManager.playClick();
    const name = nameInput.trim().slice(0, 20) || `Player ${Math.floor(1000 + Math.random() * 9000)}`;
    setChosenName(name);
    if (!user) setGuestName(name);
    setShowNameGate(false);

    if (gameMode === "skills") {
      setShowSkillModal(true);
    } else {
      join(name, { card: cosmetics?.card as Record<string, unknown> | undefined, avatar: cosmetics?.avatar }, "classic", [], botCount);
    }
  }

  function confirmSkillLoadout(skills: SkillType[]) {
    setShowSkillModal(false);
    const name = chosenName || defaultName || "Player 1";
    join(name, { card: cosmetics?.card as Record<string, unknown> | undefined, avatar: cosmetics?.avatar }, "skills", skills, botCount);
  }

  function rejoin() {
    soundManager.playClick();
    if (chosenName) {
      if (gameMode === "skills") {
        setShowSkillModal(true);
      } else {
        join(chosenName, { card: cosmetics?.card as Record<string, unknown> | undefined, avatar: cosmetics?.avatar }, "classic", [], botCount);
      }
    } else {
      openNameGate();
    }
  }

  // Shared action-zone content (used by both the desktop center column and the mobile shell action).
  function actionContent(mobile: boolean) {
    if (status === "over") return null;
    if (amInAlive && status === "playing") {
      if (myTurn && selectedCards.length > 0) {
        return (
          <button
            type="button"
            onClick={() => {
              soundManager.playConfirm();
              handleConfirmMove();
            }}
            data-sound="none"
            className={mobile ? "mobile-confirm-move" : "w-full py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-300 hover:to-green-400 text-slate-950 font-title font-black text-sm sm:text-base tracking-wide shadow-lg cursor-pointer flex items-center justify-center gap-2 select-none active:scale-[0.99] transition-colors"}
          >
            <Send size={16} />
            <span>{mobile ? `PLAY ${selectedCards.length}` : `CONFIRM MOVE (${selectedCards.length} ${selectedCards.length === 1 ? "CARD" : "CARDS"})`}</span>
          </button>
        );
      }
      return (
        <div className={mobile ? `mobile-turn-status ${isLowTime ? "is-low" : ""}` : "arena-turn-strip w-full flex items-center justify-between rounded-2xl border-2 border-amber-400/50 bg-gradient-to-r from-amber-950/80 via-black/90 to-amber-950/80 px-4 py-1.5 sm:px-5 sm:py-2 shadow-xl"}>
          <div className="flex items-center gap-2">
            <Dices size={mobile ? 16 : 18} className="text-amber-400" />
            <span className="font-title text-xs sm:text-sm font-black uppercase tracking-wider text-white">
              {myTurn ? "YOUR TURN · PICK 1, 2, OR 3" : "OPPONENT IS COUNTING..."}
            </span>
          </div>
        </div>
      );
    }
    // Eliminated / not yet in.
    if (showWatchStrip) {
      return (
        <div className={mobile ? "mobile-turn-status" : "arena-turn-strip mx-auto flex w-full max-w-xl items-center justify-center gap-2 rounded-2xl border-2 border-rose-400/40 bg-black/70 px-5 py-2 font-title text-sm font-black uppercase tracking-wider text-rose-300 shadow-xl"}>
          You&apos;re eliminated — watch the rest 👀
        </div>
      );
    }
    if (showRejoinControl) {
      // Big, prominent, ICON-ONLY play button — no text (per design). A ping ring draws the eye.
      return (
        <button
          type="button"
          onClick={chosenName ? rejoin : openNameGate}
          aria-label={chosenName ? "Rejoin the game" : "Join the game"}
          title={chosenName ? "Rejoin" : "Join the game"}
          className="relative grid place-items-center rounded-full bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 text-slate-950 border-[3px] border-white shadow-[0_0_38px_rgba(245,158,11,0.9)] hover:scale-105 active:scale-95 transition-transform cursor-pointer shrink-0"
          style={{ width: mobile ? 64 : 92, height: mobile ? 64 : 92 }}
        >
          <span className="pointer-events-none absolute inset-[-6px] rounded-full ring-2 ring-amber-400/50 animate-ping" />
          <Play size={mobile ? 30 : 44} className="fill-slate-950 translate-x-[2px]" strokeWidth={2.5} />
        </button>
      );
    }
    if (testArena && !canPlay) {
      return (
        <div className={mobile ? "mobile-turn-status" : "arena-turn-strip mx-auto flex w-full max-w-xl items-center justify-center rounded-2xl border-2 border-amber-400/40 bg-black/70 px-5 py-2 font-title text-sm font-black uppercase tracking-wider text-amber-300 shadow-xl"}>
          Live test arena — spectating
        </div>
      );
    }
    return null;
  }

  return (
    <div
      className={`arena-viewport mobile-landscape-game relative flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden px-2 py-1 sm:px-6 ${campaign ? "has-tournament-campaign" : ""} ${theme ? "has-tournament-theme" : ""} ${isShaking ? "animate-screen-shake" : ""}`}
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
      <MobileArenaOverlay players={players} currentId={currentId} hidden={showSkillModal || showNameGate || showRules} hideRoster={useArcBoard} />

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

      {/* CLASSIC-PRACTICE ARC BOARD — a curved player rail with a right-side number picker, running
          total and claimed-numbers ledger. Everything else (skills, tournaments, test arena) keeps
          the horizontal cylinder board below. */}
      {useArcBoard ? (
        <main className="arena-main mx-auto flex min-h-0 w-full max-w-[1580px] flex-1 overflow-hidden mt-0 sm:mt-2">
          <ClassicArcBoard
            players={players}
            currentId={currentId}
            myId={myId}
            count={count}
            taken={state?.taken ?? {}}
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
            timerActive={timerRunning && status === "playing" && !isLocalDefeat}
            secondsLeft={remainingSeconds}
            turnKey={currentId ?? count}
            gameMode={gameMode}
            onSkill={handleSkill}
            skillsLocked={count >= 22}
            spectatorMessage={arcSpectatorMessage}
            selecting={state?.selecting ?? null}
          />
        </main>
      ) : (
      <>
      {/* Main Arcade Arena Battlefield (3 Columns on Desktop with Expanded Center) */}
      <main className="desktop-arena-layout arena-main mx-auto grid min-h-0 w-full max-w-[1580px] flex-1 grid-cols-[270px_minmax(0,1fr)_270px] items-start gap-6 overflow-hidden mt-0 sm:mt-4">
        {/* Left Column: Local Player Big Battle Card Showcase (Desktop) */}
        <div className="arena-player-panel hidden lg:flex order-2 mx-auto w-full max-w-[270px] items-start justify-center lg:order-1">
          {/* In the test arena the local-player card only shows for an admin (others just watch). */}
          {canPlay && (
            <div className="w-full">
              <ArcadePlayerCard
                myPlayer={myPlayer}
                myTurn={myTurn}
                onJoinClick={openNameGate}
                amIn={amIn}
                gameMode={gameMode}
                onSkill={handleSkill}
                skillsLocked={count >= 22}
              />
            </div>
          )}
        </div>

        {/* Center Column: 3D Horizontal Number Cylinder Drum & Actions */}
        <div className="arena-center order-1 mx-auto flex w-full max-w-[850px] flex-col items-center justify-start gap-1 sm:gap-2 lg:order-2 pt-0 sm:pt-2">
          <div className="w-full flex justify-center">
            <Arcade3DCylinder
              currentCount={count}
              myTurn={myTurn}
              selectedCards={selectedCards}
              onToggleCard={handleToggleCard}
              onConfirmMove={handleConfirmMove}
              status={status}
              lastMove={state?.lastMove ?? null}
              lastSkillUsed={state?.lastSkillUsed ?? null}
              taken={state?.taken ?? {}}
              forbiddenK={state?.lastK ?? null}
            />
          </div>

          {/* Action Zone (desktop center): Confirm / Turn strip / Rejoin */}
          <div className="w-full max-w-xl mx-auto flex items-center justify-center min-h-[42px] my-1 sm:my-3 z-30">
            {status !== "over" && amInAlive && status === "playing" && myTurn && selectedCards.length > 0 ? (
              <div className="w-full flex items-center justify-between gap-2.5 rounded-2xl border-2 border-emerald-400 bg-gradient-to-r from-[#064e3b] via-[#022c22] to-[#064e3b] p-1.5 shadow-[0_0_25px_rgba(52,211,153,0.5)] select-none">
                {actionContent(false)}
              </div>
            ) : (
              actionContent(false)
            )}
          </div>

          {/* Mobile & Tablet Battle Dock (below cylinder) */}
          <div className="w-full flex lg:hidden flex-col items-center gap-2 mt-2 sm:mt-3 mb-1">
            <div className="w-full grid grid-cols-2 gap-2 sm:gap-3 max-w-xl mx-auto items-stretch">
              {canPlay && (
                <div className="w-full h-full">
                  <ArcadePlayerCard
                    myPlayer={myPlayer}
                    myTurn={myTurn}
                    onJoinClick={openNameGate}
                    amIn={amIn}
                    gameMode={gameMode}
                    onSkill={handleSkill}
                    skillsLocked={count >= 22}
                    compact={true}
                  />
                </div>
              )}
              <div className={`w-full h-full ${canPlay ? "" : "col-span-2"}`}>
                <ArcadeOpponentCard
                  opponentPlayer={opponentPlayer}
                  status={status}
                  isOpponentTurn={isOpponentTurn}
                  allPlayers={players}
                  currentId={currentId}
                  gameMode={gameMode}
                  compact={true}
                />
              </div>
            </div>

            {/* Classic vs Skill toggle (mobile/tablet) — practice only */}
            {!isTournament && gameConfig.gameplay.allowClassic && gameConfig.gameplay.allowSkills && (
              <div className="w-full flex items-center justify-center my-0.5 sm:my-1.5 z-20">
                <div className="flex items-center bg-black/85 border-2 border-amber-400/70 rounded-2xl p-1 shadow-xl backdrop-blur-md max-w-xs sm:max-w-sm w-full justify-between">
                  <button
                    onClick={() => handleModeChange("classic")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 sm:py-2 px-3 rounded-xl text-xs font-title font-black transition-all cursor-pointer ${gameMode === "classic" ? "bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.8)] scale-102" : "text-slate-300 hover:text-white"}`}
                  >
                    <Dices size={15} />
                    <span>CLASSIC</span>
                  </button>
                  <button
                    onClick={() => handleModeChange("skills")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 sm:py-2 px-3 rounded-xl text-xs font-title font-black transition-all cursor-pointer ${gameMode === "skills" ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-[0_0_14px_rgba(168,85,247,0.8)] scale-102" : "text-slate-300 hover:text-white"}`}
                  >
                    <Sparkles size={15} className="text-yellow-300 fill-yellow-300 animate-pulse" />
                    <span>SKILL MODE</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Opponent Panel & Match Roster (Desktop) */}
        <div className="arena-opponent-panel hidden lg:flex order-3 mx-auto w-full max-w-[270px] flex-col items-start justify-center">
          <div className="w-full">
            <ArcadeOpponentCard
              opponentPlayer={opponentPlayer}
              status={status}
              isOpponentTurn={isOpponentTurn}
              allPlayers={players}
              currentId={currentId}
              gameMode={gameMode}
            />
          </div>
        </div>
      </main>

      {/* Dedicated MOBILE-LANDSCAPE arena shell (shown only in mobile landscape via CSS). */}
      <MobileArenaShell
        board={
          <div className="mobile-web-cylinder">
            <Arcade3DCylinder
              currentCount={count}
              myTurn={myTurn}
              selectedCards={selectedCards}
              onToggleCard={handleToggleCard}
              onConfirmMove={handleConfirmMove}
              status={status}
              lastMove={state?.lastMove ?? null}
              lastSkillUsed={state?.lastSkillUsed ?? null}
              taken={state?.taken ?? {}}
              forbiddenK={state?.lastK ?? null}
              compact
            />
          </div>
        }
        action={<div className="mobile-turn-action">{actionContent(true)}</div>}
        battle={
          <div className="w-full">
            <MobileBattleStrip
              myPlayer={myPlayer}
              opponentPlayer={opponentPlayer}
              allPlayers={players}
              currentId={currentId}
              myTurn={myTurn}
              gameMode={gameMode}
              onJoin={openNameGate}
              onSkill={handleSkill}
              skillsLocked={count >= 22}
            />
          </div>
        }
      />
      </>
      )}

      {/* Bottom stats dock (players/round/arena/turn/ping) removed per design — cleaner arena. */}

      {/* Kickoff wheel: auto-shown when a game begins with a spin phase (tournaments + test arena). */}
      {spinPhase && state && (
        <KickoffWheel players={players} spinEndsAt={state.spinEndsAt!} startingId={currentId} now={now} />
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

      <BarnabyMascot
        status={status}
        winner={state?.winner ?? null}
        lastEliminated={state?.lastEliminated ?? null}
        isMyWin={isMyWin}
        isLocalDefeat={isLocalDefeat}
        // The dance is CONTROLLED in BOTH engines:
        //  • Local practice → `state.dancing` (resumes via onDanceEnd when the clip ends).
        //  • Real tournament → `serverDancing` (a server-timed freeze shown to EVERY player at once).
        forceDancing={isLocalEngine ? !!state?.dancing : serverDancing}
        serverPaced={!isLocalEngine}
        // The full-screen WinnerCelebration owns the finale — mascot shows no result panel.
        showPlayAgain={false}
        onDanceEnd={endDance}
        onPlayAgain={rejoin}
      />

      {/* Animated Countdown Cow — announces + counts the local player's turn (visible number + ticks).
          The classic arc board renders its OWN cow pinned to the number-board corner, so the standalone
          upper-centre one is only for the other boards (skills / tournament / test arena). */}
      {!useArcBoard && (
        <CowntdownTimerCow
          active={timerRunning && status === "playing" && !isLocalDefeat}
          isMyTurn={myTurn}
          secondsLeft={remainingSeconds}
          turnSeconds={gameConfig.gameplay.turnSeconds}
          turnKey={currentId ?? count}
        />
      )}

      {/* 3D Cinematic Tactical Skill FX Overlay */}
      <SkillFXOverlay lastSkillUsed={state?.lastSkillUsed} />

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
      <SkillLoadoutModal isOpen={showSkillModal} onClose={() => setShowSkillModal(false)} onConfirm={confirmSkillLoadout} />

      {/* Official 31 Game Rules Modal */}
      <OfficialRulesModal isOpen={showRules} onClose={() => setShowRules(false)} />

      {/* Choose Your Name Gate Modal */}
      {showNameGate && (
        <div className="cd31-gate-overlay" onClick={() => setShowNameGate(false)}>
          <div className="cd31-gate glass" onClick={(e) => e.stopPropagation()}>
            <span className="cd31-gate-ico">
              <Crown size={22} />
            </span>
            <h2 className="font-title text-2xl font-black">{gameConfig.gameplay.guestNamePrompt}</h2>
            <p className="font-ui text-sm">Enter the arcade pasture and battle for the crown!</p>
            <input
              autoFocus
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
