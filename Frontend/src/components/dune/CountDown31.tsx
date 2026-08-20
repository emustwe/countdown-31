"use client";

import React, { useEffect, useRef, useState } from "react";
import { Crown, LogIn, Sparkles, Skull, Clock, Dices, Send } from "lucide-react";
import { useSettingsStore } from "../../stores/settings-store";
import { useGuestStore } from "../../stores/guest-store";
import { useAuthStore } from "../../stores/auth-store";
import { useCosmetics } from "../../lib/hooks/useSponsors";
import {
  useCountdownLive,
  type LiveReason,
  type SkillType,
  type GameMode,
} from "../../lib/hooks/useCountdownLive";
import { soundManager } from "../../lib/soundManager";
import { BarnabyMascot } from "./BarnabyMascot";
import { ArcadeHeader } from "./ArcadeHeader";
import { Arcade3DCylinder } from "./Arcade3DCylinder";
import { ArcadeActionConsole } from "./ArcadeActionConsole";
import { ArcadePlayerCard, ArcadeOpponentCard } from "./ArcadePlayerCards";
import { ArcadeHUD } from "./ArcadeHUD";
import { ArcadeDrawerMenu } from "./ArcadeDrawerMenu";
import { OfficialRulesModal } from "./OfficialRulesModal";
import { SkillLoadoutModal } from "./SkillLoadoutModal";
import confetti from "canvas-confetti";

export function CountDown31({ roomId = "practice" }: { roomId?: string }) {
  const guestName = useGuestStore((s) => s.username);
  const setGuestName = useGuestStore((s) => s.setUsername);
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const defaultName = user?.fullName || user?.email?.split("@")[0] || guestName || "";
  const soundOn = useSettingsStore((s) => s.soundEnabled);
  const { data: cosmetics } = useCosmetics(!!accessToken);
  const { state, myId, join, arm, submit, useSkill, triggerDefeat } = useCountdownLive(roomId);
  const [botCount, setBotCount] = useState<number>(1); // 1 = 1v1 Duel for fastest testing!

  const [chosenName, setChosenName] = useState("");
  const [showNameGate, setShowNameGate] = useState(false);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [isShaking, setIsShaking] = useState(false);

  // Game Mode: Classic 31 (pure counting) vs. Tactical Skill Mode (loadout cards)
  const [gameMode, setGameMode] = useState<GameMode>("skills");
  const [equippedSkills, setEquippedSkills] = useState<SkillType[]>(["rewind", "turbo"]);

  // Direct Card Selection State on the 3D Reel
  const [selectedCards, setSelectedCards] = useState<number[]>([]);

  const [now, setNow] = useState(() => Date.now());
  const prevCount = useRef(0);
  const prevStatus = useRef(state?.status);
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, []);

  const count = state?.count ?? 0;
  const players = state?.players ?? [];
  const status = state?.status ?? "waiting";
  const currentId = state?.currentId ?? null;
  const amIn = !!myId && players.some((p) => p.id === myId);
  const myTurn = status === "playing" && currentId === myId;
  const myPlayer = players.find((p) => p.id === myId) ?? null;
  const opponentPlayer = players.find((p) => p.id !== myId) ?? players[1] ?? null;
  const isOpponentTurn = status === "playing" && currentId !== myId && currentId !== null;

  const remaining = state?.turnEndsAt ? Math.max(0, state.turnEndsAt - now) : 0;
  const remainingSeconds = Math.ceil(remaining / 1000);
  const timerRunning = status === "playing" && !!state?.turnEndsAt;
  const isLowTime = remainingSeconds <= 2 && timerRunning;

  const mySkills = myPlayer?.skills ?? {
    rewind: 1,
    turbo: 1,
    shield: 1,
    nudge: 1,
    double: 1,
  };

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

  // Audio & confetti on game end / defeat / victory
  useEffect(() => {
    if (status === "over" && prevStatus.current !== "over") {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 700);

      const isWinner = state?.winner && players.find((p) => p.id === myId)?.name === state.winner.name;
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
        setSelectedCards((prev) => prev.slice(0, -1));
      }
      return;
    }

    // Adding first card
    if (selectedCards.length === 0) {
      if (num !== count + 1) {
        // Player committed a blunder and skipped to a higher card!
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 700);
        submit([num]); // Triggers blunder elimination in useCountdownLive!
        return;
      }
      setSelectedCards([num]);
      return;
    }

    // Adding 2nd card
    if (selectedCards.length === 1) {
      if (num !== count + 2) {
        // Player committed a blunder and skipped card (count + 2)!
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 700);
        submit([...selectedCards, num]); // Triggers blunder elimination!
        return;
      }
      setSelectedCards([count + 1, count + 2]);
      return;
    }

    // Adding 3rd card
    if (selectedCards.length === 2) {
      if (num !== count + 3) {
        // Player committed a blunder!
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 700);
        submit([...selectedCards, num]); // Triggers blunder elimination!
        return;
      }
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
        join(chosenName, { card: cosmetics?.card as Record<string, unknown> | undefined, avatar: cosmetics?.avatar }, "classic", []);
      }
    }
  }

  function openNameGate() {
    soundManager.playClick();
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
    setEquippedSkills(skills);
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

  return (
    <div className={`relative w-full min-h-screen flex flex-col justify-between px-2 sm:px-6 py-2 overflow-x-hidden ${isShaking ? "animate-screen-shake" : ""}`}>
      {/* Top Arcade Header Marquee with Game Mode Switcher */}
      <ArcadeHeader
        onMenuClick={() => setShowDrawer(true)}
        gameMode={gameMode}
        onToggleMode={handleModeChange}
        showModeToggle={true}
      />

      {/* Main Arcade Arena Battlefield (3 Columns on Desktop) - Generous Clearance */}
      <main className="w-full max-w-[1500px] mx-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-start mt-10 sm:mt-14 md:mt-16 mb-4">
        {/* Left Column: Local Player Big Battle Card Showcase */}
        <div className="lg:col-span-3 flex items-start justify-center order-2 lg:order-1 w-full max-w-[280px] mx-auto">
          <div className="w-full">
            <ArcadePlayerCard
              myPlayer={myPlayer}
              myTurn={myTurn}
              onJoinClick={openNameGate}
              amIn={amIn}
              gameMode={gameMode}
            />
          </div>
        </div>

        {/* Center Column: 3D Horizontal Number Cylinder Drum & Action/Skill Hand */}
        <div className="lg:col-span-6 flex flex-col items-center justify-start gap-3 order-1 lg:order-2 w-full max-w-[780px] mx-auto">
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

          {/* Action Area: Tactical Skill Cards in Skill Mode OR Classic Turn Bar OR In-Place Game Over Mascot Stage */}
          {status === "over" ? (
            /* In-Place Defeat/Victory 3D Video & Outcome Console */
            <BarnabyMascot
              count={count}
              status={status}
              myTurn={myTurn}
              winner={state?.winner ?? null}
              lastEliminated={state?.lastEliminated ?? null}
              isMyWin={!!(state?.winner && players.find((p) => p.id === myId)?.name === state.winner.name)}
              onPlayAgain={rejoin}
            />
          ) : amIn && status === "playing" ? (
            gameMode === "skills" ? (
              <ArcadeActionConsole
                myTurn={myTurn}
                remainingSeconds={remainingSeconds}
                timerRunning={timerRunning}
                onSkill={handleSkill}
                skills={mySkills}
                equippedSkills={equippedSkills}
                count={count}
              />
            ) : (
              /* Sleek Classic Mode Turn Console */
              <div className="w-full max-w-xl mx-auto flex items-center justify-between bg-gradient-to-r from-amber-950/80 via-black/90 to-amber-950/80 border-2 border-amber-400/50 rounded-2xl px-5 py-3 shadow-xl">
                <div className="flex items-center gap-2">
                  <Dices size={18} className="text-amber-400" />
                  <span className="font-title font-black text-sm text-white uppercase tracking-wider">
                    {myTurn ? "🎯 YOUR TURN · SELECT CARDS ON DRUM" : "⌛ OPPONENT IS COUNTING..."}
                  </span>
                </div>

                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-title font-black text-xs border ${
                    isLowTime
                      ? "bg-rose-950/90 text-rose-300 border-rose-500 animate-bounce"
                      : "bg-amber-950/70 text-amber-300 border-amber-400/50"
                  }`}
                >
                  <Clock size={13} className={isLowTime ? "text-rose-400" : "text-amber-400"} />
                  <span>{timerRunning ? `${remainingSeconds}s` : "7s"}</span>
                </div>
              </div>
            )
          ) : (
            <button
              onClick={chosenName ? rejoin : openNameGate}
              className="btn-arcade-3d btn-arcade-amber text-lg sm:text-xl py-4 px-10 rounded-2xl flex items-center justify-center gap-2 shadow-2xl my-2 cursor-pointer hover:scale-105 transition-transform"
            >
              <LogIn size={22} />
              <span>{chosenName ? "REJOIN GAME" : "JOIN THE GAME"}</span>
            </button>
          )}
        </div>

        {/* Right Column: Opponent Panel & Match Roster */}
        <div className="lg:col-span-3 flex flex-row lg:flex-col items-start justify-center order-3 w-full max-w-xs mx-auto">
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

      {/* Bottom Arcade Match HUD with Bot Count Config & Instant Test Button */}
      <div className="w-full max-w-5xl mx-auto mt-4 mb-3 pb-2 flex flex-col gap-2.5">
        <ArcadeHUD
          playerCount={players.length}
          maxPlayers={botCount + 1}
          round={state?.round ?? 1}
          arenaName="Pasture"
          turnTime={7}
          pingMs={48}
        />

        {/* Quick Testing Bar: Bot Count & Instant Defeat Trigger */}
        <div className="flex items-center justify-between flex-wrap gap-2 px-3 py-1.5 rounded-2xl bg-black/60 border border-amber-400/40 backdrop-blur-md">
          {/* Bot Count Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-title font-bold text-slate-300">OPPONENT BOTS:</span>
            <div className="flex items-center gap-1 bg-black/80 p-0.5 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setBotCount(1);
                  if (chosenName) rejoin();
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-title font-black transition-all cursor-pointer ${
                  botCount === 1 ? "bg-emerald-400 text-slate-950 shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                1v1 DUEL (1 Bot)
              </button>
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setBotCount(3);
                  if (chosenName) rejoin();
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-title font-black transition-all cursor-pointer ${
                  botCount === 3 ? "bg-amber-400 text-slate-950 shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                4-PLAYER (3 Bots)
              </button>
            </div>
          </div>

          {/* 1-Click Instant Defeat Animation Tester */}
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              triggerDefeat("31");
            }}
            className="px-3.5 py-1 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-title font-black text-[10px] shadow-[0_0_12px_rgba(244,63,94,0.6)] hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
          >
            <span>⚡ TEST DEFEAT COW ANIMATION</span>
          </button>
        </div>
      </div>

      {/* Pre-Match 2-Skill Loadout Selector Modal */}
      <SkillLoadoutModal
        isOpen={showSkillModal}
        onClose={() => setShowSkillModal(false)}
        onConfirm={confirmSkillLoadout}
      />

      {/* Hamburger Drawer Menu */}
      <ArcadeDrawerMenu
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        onOpenRules={() => setShowRules(true)}
      />

      {/* Official 31 Game Rules Modal */}
      <OfficialRulesModal
        isOpen={showRules}
        onClose={() => setShowRules(false)}
      />

      {/* Choose Your Name Gate Modal */}
      {showNameGate && (
        <div className="cd31-gate-overlay" onClick={() => setShowNameGate(false)}>
          <div className="cd31-gate glass" onClick={(e) => e.stopPropagation()}>
            <span className="cd31-gate-ico"><Crown size={22} /></span>
            <h2 className="font-title text-2xl font-black">Choose Your Name</h2>
            <p className="font-ui text-sm">Enter the arcade pasture and battle for the crown!</p>
            <input
              autoFocus
              value={nameInput}
              maxLength={20}
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
