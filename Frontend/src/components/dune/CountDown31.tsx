"use client";

import React, { useEffect, useRef, useState } from "react";
import { Crown, LogIn, Clock, Dices, Sparkles, Send } from "lucide-react";
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
import { MobileArenaShell } from "./MobileArenaShell";

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
  const [dismissedDefeat, setDismissedDefeat] = useState(false);

  const myPlayer = players.find((p) => p.id === myId) ?? null;
  const opponentPlayer = players.find((p) => p.id !== myId) ?? players[1] ?? null;
  const isOpponentTurn = status === "playing" && currentId !== myId && currentId !== null;
  const isMyWin = !!(
    state?.winner &&
    players.find((player) => player.id === myId)?.name === state.winner.name
  );
  const isLocalDefeat = !dismissedDefeat && !!(
    myPlayer?.eliminated &&
    state?.lastEliminated?.name === myPlayer.name
  );

  // Reset dismissed defeat whenever a new active round starts
  useEffect(() => {
    if (status === "playing" && !myPlayer?.eliminated) {
      setDismissedDefeat(false);
    }
  }, [status, myPlayer?.eliminated]);

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

  function handlePlayAgain() {
    soundManager.playClick();
    setDismissedDefeat(true);
    rejoin();
  }

  function rejoin() {
    soundManager.playClick();
    setDismissedDefeat(true);
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
      <main className="desktop-arena-layout arena-main mx-auto grid min-h-0 w-full max-w-[1580px] flex-1 grid-cols-[270px_minmax(0,1fr)_270px] items-start gap-6 overflow-hidden mt-4">
        {/* Left Column: Local Player Big Battle Card Showcase (Desktop) */}
        <div className="arena-player-panel hidden lg:flex order-2 mx-auto w-full max-w-[270px] items-start justify-center lg:order-1">
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

        {/* Center Column: 3D Horizontal Number Cylinder Drum, Mobile Battle Cards, & Actions */}
        <div className="arena-center order-1 mx-auto flex w-full max-w-[850px] flex-col items-center justify-start gap-2 lg:order-2 pt-1 sm:pt-2">
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

          {/* Action Zone: Confirm Move Button (when cards selected) OR Turn Strip OR Join Button */}
          <div className="w-full max-w-xl mx-auto flex items-center justify-center min-h-[48px] my-2 sm:my-3 z-30">
            {status !== "over" && amIn && status === "playing" ? (
              myTurn && selectedCards.length > 0 ? (
                <div className="w-full flex items-center justify-between gap-2.5 rounded-2xl border-2 border-emerald-400/80 bg-gradient-to-r from-emerald-950/90 via-black/90 to-emerald-950/90 p-1.5 shadow-[0_0_25px_rgba(52,211,153,0.35)]">
                  <button
                    onClick={() => {
                      soundManager.playConfirm();
                      handleConfirmMove();
                    }}
                    data-sound="none"
                    className="flex-1 py-2 sm:py-2.5 px-4 sm:px-6 rounded-xl bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-400 text-slate-950 font-title font-black text-sm sm:text-base shadow-[0_0_20px_rgba(52,211,153,0.8)] hover:brightness-110 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>CONFIRM MOVE ({selectedCards.length} {selectedCards.length === 1 ? "CARD" : "CARDS"})</span>
                    <Send size={16} />
                  </button>

                  <div
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 font-title text-xs font-black shrink-0 ${
                      isLowTime
                        ? "border-rose-500 bg-rose-950/90 text-rose-300 animate-bounce"
                        : "border-emerald-400/50 bg-emerald-950/70 text-emerald-300"
                    }`}
                  >
                    <Clock size={13} className={isLowTime ? "text-rose-400" : "text-emerald-400"} />
                    <span>{timerRunning ? `${remainingSeconds}s` : "7s"}</span>
                  </div>
                </div>
              ) : (
                <div className="arena-turn-strip w-full flex items-center justify-between rounded-2xl border-2 border-amber-400/50 bg-gradient-to-r from-amber-950/80 via-black/90 to-amber-950/80 px-4 py-1.5 sm:px-5 sm:py-2 shadow-xl">
                  <div className="flex items-center gap-2">
                    <Dices size={18} className="text-amber-400" />
                    <span className="font-title text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                      {myTurn ? "YOUR TURN · PICK 1, 2, OR 3" : "OPPONENT IS COUNTING..."}
                    </span>
                  </div>

                  <div
                    className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 sm:px-3 sm:py-1 font-title text-xs font-black ${
                      isLowTime
                        ? "border-rose-500 bg-rose-950/90 text-rose-300 animate-bounce"
                        : "border-amber-400/50 bg-amber-950/70 text-amber-300"
                    }`}
                  >
                    <Clock size={13} className={isLowTime ? "text-rose-400" : "text-amber-400"} />
                    <span>{timerRunning ? `${remainingSeconds}s` : "7s"}</span>
                  </div>
                </div>
              )
            ) : (
              status !== "over" && (
                <button
                  onClick={chosenName ? rejoin : openNameGate}
                  className="btn-arcade-3d btn-arcade-amber flex cursor-pointer items-center justify-center gap-2 rounded-2xl px-8 py-2.5 text-base shadow-2xl transition-transform hover:scale-105 sm:text-lg"
                >
                  <LogIn size={20} />
                  <span>{chosenName ? "REJOIN GAME" : "JOIN THE GAME"}</span>
                </button>
              )
            )}
          </div>

          {/* Dedicated Mobile & Tablet Battle Dock (Rendered with Generous Space Below Cylinder) */}
          <div className="w-full flex lg:hidden flex-col items-center gap-2 mt-8 sm:mt-14 mb-1">
            {/* The Two Yellow Boxes: User on Left, Active Opponent on Right */}
            <div className="w-full grid grid-cols-2 gap-2 sm:gap-3 max-w-xl mx-auto items-stretch">
              {/* Local Player Side with Avatar & Attached Tactical Skills */}
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

              {/* Rival Opponent Side with Avatar & Skills */}
              <div className="w-full h-full">
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

            {/* The Red Box Area: Classic vs Skill Mode Toggle (Mobile & Tablet) */}
            {gameConfig.gameplay.allowClassic && gameConfig.gameplay.allowSkills && (
              <div className="w-full flex items-center justify-center my-0.5 sm:my-1.5 z-20">
                <div className="flex items-center bg-black/85 border-2 border-amber-400/70 rounded-2xl p-1 shadow-xl backdrop-blur-md max-w-xs sm:max-w-sm w-full justify-between">
                  <button
                    onClick={() => {
                      soundManager.playClick();
                      handleModeChange("classic");
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 sm:py-2 px-3 rounded-xl text-xs font-title font-black transition-all cursor-pointer ${
                      gameMode === "classic"
                        ? "bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.8)] scale-102"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    <Dices size={15} />
                    <span>CLASSIC</span>
                  </button>

                  <button
                    onClick={() => {
                      soundManager.playClick();
                      handleModeChange("skills");
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 sm:py-2 px-3 rounded-xl text-xs font-title font-black transition-all cursor-pointer ${
                      gameMode === "skills"
                        ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-[0_0_14px_rgba(168,85,247,0.8)] scale-102"
                        : "text-slate-300 hover:text-white"
                    }`}
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

      <MobileArenaShell
        board={(
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
        )}
        action={(
          <div className="mobile-turn-action">
            {status !== "over" && amIn && status === "playing" ? (
              myTurn && selectedCards.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playConfirm();
                    handleConfirmMove();
                  }}
                  data-sound="none"
                  className="mobile-confirm-move"
                >
                  <Send size={16} />
                  <span>PLAY {selectedCards.length}</span>
                  <b>{timerRunning ? `${remainingSeconds}s` : "7s"}</b>
                </button>
              ) : (
                <div className={`mobile-turn-status ${isLowTime ? "is-low" : ""}`}>
                  <Dices size={16} />
                  <span>{myTurn ? "YOUR TURN · PICK 1–3" : "RIVAL'S TURN"}</span>
                  <b>{timerRunning ? `${remainingSeconds}s` : "7s"}</b>
                </div>
              )
            ) : (
              status !== "over" && (
                <button
                  type="button"
                  onClick={chosenName ? rejoin : openNameGate}
                  className="mobile-join-game"
                >
                  <LogIn size={18} />
                  <span>{chosenName ? "REJOIN" : "JOIN GAME"}</span>
                </button>
              )
            )}
          </div>
        )}
        player={(
          <ArcadePlayerCard
            myPlayer={myPlayer}
            myTurn={myTurn}
            onJoinClick={openNameGate}
            amIn={amIn}
            gameMode={gameMode}
            onSkill={handleSkill}
            skillsLocked={count >= 22}
            compact
          />
        )}
        opponent={(
          <ArcadeOpponentCard
            opponentPlayer={opponentPlayer}
            status={status}
            isOpponentTurn={isOpponentTurn}
            allPlayers={players}
            currentId={currentId}
            gameMode={gameMode}
            compact
          />
        )}
        modeSwitch={
          gameConfig.gameplay.allowClassic && gameConfig.gameplay.allowSkills ? (
            <div className="mobile-mode-switch" role="group" aria-label="Game mode">
              <button
                type="button"
                onClick={() => handleModeChange("classic")}
                className={gameMode === "classic" ? "active" : ""}
              >
                <Dices size={15} /> Classic
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("skills")}
                className={gameMode === "skills" ? "active skills" : ""}
              >
                <Sparkles size={15} /> Skills
              </button>
            </div>
          ) : null
        }
      />

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
        onPlayAgain={handlePlayAgain}
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
