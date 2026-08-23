"use client";

import React, { useEffect, useRef, useState } from "react";
import { Crown, LogIn, Clock, Dices } from "lucide-react";
import { useSettingsStore } from "../../stores/settings-store";
import { useGuestStore } from "../../stores/guest-store";
import { useAuthStore } from "../../stores/auth-store";
import { useCosmetics } from "../../lib/hooks/useSponsors";
import { useCountdownLive, type SkillType, type GameMode } from "../../lib/hooks/useCountdownLive";
import { soundManager } from "../../lib/soundManager";
import { BarnabyMascot } from "./BarnabyMascot";
import { ArcadeHeader } from "./ArcadeHeader";
import { Arcade3DCylinder } from "./Arcade3DCylinder";
import { ArcadePlayerCard, ArcadeOpponentCard } from "./ArcadePlayerCards";
import { ArcadeHUD } from "./ArcadeHUD";
import { OfficialRulesModal } from "./OfficialRulesModal";
import { SkillLoadoutModal } from "./SkillLoadoutModal";
import confetti from "canvas-confetti";
import { useGameConfig } from "../../lib/hooks/useGameConfig";
import { useRouter } from "next/navigation";

import { DEFAULT_GAME_CONFIG } from "../../lib/game-config";

export function CountDown31({ roomId = "practice" }: { roomId?: string }) {
  const router = useRouter();
  const { data: serverConfig } = useGameConfig();
  const isTournament = roomId !== "practice";
  const gameConfig = isTournament ? (serverConfig ?? DEFAULT_GAME_CONFIG) : DEFAULT_GAME_CONFIG;
  const guestName = useGuestStore((s) => s.username);
  const setGuestName = useGuestStore((s) => s.setUsername);
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const defaultName = user?.fullName || user?.email?.split("@")[0] || guestName || "";
  const soundOn = useSettingsStore((s) => s.soundEnabled);
  const { data: cosmetics } = useCosmetics(!!accessToken);
  const { state, myId, join, submit, useSkill } = useCountdownLive(roomId);
  const [botCount, setBotCount] = useState<number>(gameConfig.gameplay.defaultBotCount);

  const [chosenName, setChosenName] = useState("");
  const [showNameGate, setShowNameGate] = useState(false);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [isShaking, setIsShaking] = useState(false);

  // Game Mode: Classic 31 (pure counting) vs. Tactical Skill Mode (loadout cards)
  const [gameMode, setGameMode] = useState<GameMode>(gameConfig.gameplay.defaultMode);
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
    setGameMode(gameConfig.gameplay.defaultMode);
  }, [chosenName, gameConfig]);

  const count = state?.count ?? 0;
  const players = state?.players ?? [];
  const status = state?.status ?? "waiting";
  const currentId = state?.currentId ?? null;
  const amIn = !!myId && players.some((p) => p.id === myId);
  const myTurn = status === "playing" && currentId === myId;
  const myPlayer = players.find((p) => p.id === myId) ?? null;
  // "In and alive" — an eliminated player should get an immediate rejoin, not a spectator strip.
  const amInAlive = amIn && !!myPlayer && !myPlayer.eliminated;
  const opponentPlayer = players.find((p) => p.id !== myId) ?? players[1] ?? null;
  const isOpponentTurn = status === "playing" && currentId !== myId && currentId !== null;
  const isMyWin = !!(
    state?.winner &&
    players.find((player) => player.id === myId)?.name === state.winner.name
  );
  const isLocalDefeat = !!(
    myPlayer?.eliminated &&
    state?.lastEliminated?.name === myPlayer.name
  );

  const remaining = state?.turnEndsAt ? Math.max(0, state.turnEndsAt - now) : 0;
  const remainingSeconds = Math.ceil(remaining / 1000);
  const timerRunning = status === "playing" && !!state?.turnEndsAt;
  const isLowTime = remainingSeconds <= 2 && timerRunning;

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

      const isWinner =
        state?.winner && players.find((p) => p.id === myId)?.name === state.winner.name;
      if (isWinner) {
        soundManager.playVictory();
        try {
          confetti({
            particleCount: 130,
            spread: 85,
            origin: { y: 0.6 },
            colors: ["#5be348", "#ffdf78", "#ff43c4", "#21e6d7"],
          });
        } catch {}
      } else {
        soundManager.playSpinDefeat();
      }
    }
    prevStatus.current = status;
  }, [status, state?.winner, players, myId]);

  /**
   * Direct Card Selection & Mistake Elimination Handler:
   * Players click cards directly on the reel.
   * - If player clicks an invalid card out of sequence (skips a card) -> INSTANT ELIMINATION BLUNDER!
   * - If player selects valid contiguous cards (1, 2, or 3) -> added to selection.
   */
  function handleToggleCard(num: number) {
    if (!myTurn || status !== "playing") return;

    // If card is already selected, allow toggling off if it is the last card
    if (selectedCards.includes(num)) {
      if (num === selectedCards[selectedCards.length - 1]) {
        soundManager.playClose();
        setSelectedCards((prev) => prev.slice(0, -1));
      }
      return;
    }

    // Adding first card
    if (selectedCards.length === 0) {
      if (num !== count + 1) {
        soundManager.playError();
        // Player committed a blunder and skipped to a higher card!
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 700);
        submit([num]); // Triggers blunder elimination in useCountdownLive!
        return;
      }
      soundManager.playCardSelect();
      setSelectedCards([num]);
      return;
    }

    // Adding 2nd card
    if (selectedCards.length === 1) {
      if (num !== count + 2) {
        soundManager.playError();
        // Player committed a blunder and skipped card (count + 2)!
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 700);
        submit([...selectedCards, num]); // Triggers blunder elimination!
        return;
      }
      soundManager.playCardSelect();
      setSelectedCards([count + 1, count + 2]);
      return;
    }

    // Adding 3rd card
    if (selectedCards.length === 2) {
      if (num !== count + 3) {
        soundManager.playError();
        // Player committed a blunder!
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 700);
        submit([...selectedCards, num]); // Triggers blunder elimination!
        return;
      }
      soundManager.playCardSelect();
      // 3 cards max reached -> automatically submit the 3-card move!
      submit([count + 1, count + 2, count + 3]);
      setSelectedCards([]);
      return;
    }
  }

  function handleConfirmMove() {
    if (!myTurn || selectedCards.length === 0) return;
    submit(selectedCards);
    setSelectedCards([]);
  }

  function handleSkill(skill: SkillType) {
    if (!myTurn) return;
    useSkill(skill);
  }

  function handleModeChange(mode: GameMode) {
    setGameMode(mode);
    if (chosenName) {
      if (mode === "skills") {
        setShowSkillModal(true);
      } else {
        join(
          chosenName,
          {
            card: cosmetics?.card as Record<string, unknown> | undefined,
            avatar: cosmetics?.avatar,
          },
          "classic",
          [],
        );
      }
    }
  }

  function openNameGate() {
    soundManager.playClick();
    if (!accessToken && !gameConfig.gameplay.guestPlayEnabled) {
      router.push("/login?next=%2Fhome");
      return;
    }
    setNameInput(chosenName || defaultName);
    setShowNameGate(true);
  }

  function confirmJoin() {
    soundManager.playClick();
    const name =
      nameInput.trim().slice(0, 20) || `Player ${Math.floor(1000 + Math.random() * 9000)}`;
    setChosenName(name);
    if (!user) setGuestName(name);
    setShowNameGate(false);

    if (gameMode === "skills") {
      setShowSkillModal(true);
    } else {
      join(
        name,
        { card: cosmetics?.card as Record<string, unknown> | undefined, avatar: cosmetics?.avatar },
        "classic",
        [],
        botCount,
      );
    }
  }

  function confirmSkillLoadout(skills: SkillType[]) {
    setShowSkillModal(false);
    const name = chosenName || defaultName || "Player 1";
    join(
      name,
      { card: cosmetics?.card as Record<string, unknown> | undefined, avatar: cosmetics?.avatar },
      "skills",
      skills,
      botCount,
    );
  }

  function rejoin() {
    soundManager.playClick();
    if (chosenName) {
      if (gameMode === "skills") {
        setShowSkillModal(true);
      } else {
        join(
          chosenName,
          {
            card: cosmetics?.card as Record<string, unknown> | undefined,
            avatar: cosmetics?.avatar,
          },
          "classic",
          [],
          botCount,
        );
      }
    } else {
      openNameGate();
    }
  }

  return (
    <div
      className={`arena-viewport relative flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden px-2 py-1 sm:px-6 ${isShaking ? "animate-screen-shake" : ""}`}
    >
      {/* Top Arcade Header Marquee with Game Mode Switcher */}
      <ArcadeHeader
        onOpenRules={() => setShowRules(true)}
        gameMode={gameMode}
        onToggleMode={handleModeChange}
        showModeToggle={gameConfig.gameplay.allowClassic && gameConfig.gameplay.allowSkills}
      />

      {/* Main Arcade Arena Battlefield (3 Columns on Desktop with Expanded Center) */}
      <main className="arena-main mx-auto grid min-h-0 w-full max-w-[1580px] flex-1 grid-cols-1 items-start gap-2 overflow-hidden lg:grid-cols-[270px_minmax(0,1fr)_270px] lg:gap-4">
        {/* Left Column: Local Player Big Battle Card Showcase */}
        <div className="arena-player-panel order-2 mx-auto flex w-full max-w-[270px] items-start justify-center lg:order-1">
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
        </div>

        {/* Center Column: 3D Horizontal Number Cylinder Drum & Action/Skill Hand */}
        <div className="arena-center order-1 mx-auto flex w-full max-w-[850px] flex-col items-center justify-start gap-2 lg:order-2">
          {/* The Hero 3D Horizontal Arcade Cylinder with Direct Card Selection */}
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

          {/* A compact turn prompt leaves the arena open; tactical skills live beside the avatar. */}
          {status !== "over" && amInAlive && status === "playing" ? (
            <div className="arena-turn-strip mx-auto flex w-full max-w-xl items-center justify-between rounded-2xl border-2 border-amber-400/50 bg-gradient-to-r from-amber-950/80 via-black/90 to-amber-950/80 px-5 py-2 shadow-xl">
              <div className="flex items-center gap-2">
                <Dices size={18} className="text-amber-400" />
                <span className="font-title text-sm font-black uppercase tracking-wider text-white">
                  {myTurn ? "YOUR TURN · PICK 1, 2, OR 3" : "OPPONENT IS COUNTING..."}
                </span>
              </div>

              <div
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 font-title text-xs font-black ${
                  isLowTime
                    ? "border-rose-500 bg-rose-950/90 text-rose-300 animate-bounce"
                    : "border-amber-400/50 bg-amber-950/70 text-amber-300"
                }`}
              >
                <Clock size={13} className={isLowTime ? "text-rose-400" : "text-amber-400"} />
                <span>{timerRunning ? `${remainingSeconds}s` : "7s"}</span>
              </div>
            </div>
          ) : (
            status !== "over" && (
              <button
                onClick={chosenName ? rejoin : openNameGate}
                className="btn-arcade-3d btn-arcade-amber my-2 flex cursor-pointer items-center justify-center gap-2 rounded-2xl px-10 py-4 text-lg shadow-2xl transition-transform hover:scale-105 sm:text-xl"
              >
                <LogIn size={22} />
                <span>{chosenName ? "REJOIN GAME" : "JOIN THE GAME"}</span>
              </button>
            )
          )}
        </div>

        {/* Right Column: Opponent Panel & Match Roster */}
        <div className="arena-opponent-panel order-3 mx-auto flex w-full max-w-[270px] flex-row items-start justify-center lg:flex-col">
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

      {/* Stats are the only bottom dock. */}
      <div className="arena-bottom mx-auto w-full max-w-5xl shrink-0 pb-1">
        <ArcadeHUD
          playerCount={players.length}
          maxPlayers={botCount + 1}
          round={state?.round ?? 1}
          arenaName={gameConfig.arena.name}
          turnTime={gameConfig.gameplay.turnSeconds}
          pingMs={48}
          showPing={gameConfig.features.showPing}
        />

      </div>

      <BarnabyMascot
        status={status}
        winner={state?.winner ?? null}
        lastEliminated={state?.lastEliminated ?? null}
        isMyWin={isMyWin}
        isLocalDefeat={isLocalDefeat}
        onPlayAgain={rejoin}
      />

      {/* Pre-Match 2-Skill Loadout Selector Modal */}
      <SkillLoadoutModal
        isOpen={showSkillModal}
        onClose={() => setShowSkillModal(false)}
        onConfirm={confirmSkillLoadout}
      />

      {/* Official 31 Game Rules Modal */}
      <OfficialRulesModal isOpen={showRules} onClose={() => setShowRules(false)} />

      {/* Choose Your Name Gate Modal */}
      {showNameGate && (
        <div className="cd31-gate-overlay" onClick={() => setShowNameGate(false)}>
          <div className="cd31-gate glass" onClick={(e) => e.stopPropagation()}>
            <span className="cd31-gate-ico">
              <Crown size={22} />
            </span>
            <h2 className="font-title text-2xl font-black">
              {gameConfig.gameplay.guestNamePrompt}
            </h2>
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
            <button
              className="btn-arcade-3d btn-arcade-green text-base py-3 w-full"
              onClick={confirmJoin}
              disabled={!nameInput.trim()}
            >
              <LogIn size={18} /> Enter Game
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
