import { create } from "zustand";
import { soundManager } from "../lib/soundManager";
import confetti from "canvas-confetti";

export type Turn = "player" | "ai" | "player2";
export type GameStatus = "idle" | "playing" | "spin_defeat" | "victory";
export type GameMode = "vs-ai" | "pass-and-play";
export type Difficulty = "easy" | "normal" | "master";

export type CowEmotion = "confident" | "sweating" | "dizzy" | "celebrating" | "shocked";

export interface MoveHistoryItem {
  id: string;
  player: string;
  turn: Turn;
  amount: 1 | 2;
  from: number;
  to: number;
  timestamp: number;
}

export interface GameState {
  currentCount: number;
  targetCount: number;
  turn: Turn;
  gameMode: GameMode;
  difficulty: Difficulty;
  gameStatus: GameStatus;
  isProcessing: boolean;
  history: MoveHistoryItem[];
  loser: Turn | null;
  winner: Turn | null;
  screenShake: boolean;
  speechBubble: {
    text: string;
    speaker: "player" | "opponent";
  } | null;
  playerEmotion: CowEmotion;
  opponentEmotion: CowEmotion;
  stats: {
    playerWins: number;
    opponentWins: number;
    totalGames: number;
  };

  // Actions
  startGame: (mode?: GameMode, difficulty?: Difficulty) => void;
  addCount: (amount: 1 | 2) => Promise<void>;
  trigger31Defeat: (loser: Turn) => void;
  resetGame: () => void;
  setGameMode: (mode: GameMode) => void;
  setDifficulty: (diff: Difficulty) => void;
  setSpeech: (text: string, speaker: "player" | "opponent") => void;
  clearSpeech: () => void;
}

const AI_QUOTES = {
  confident: [
    "Moo-ve aside, amateur! 🐮",
    "I've calculated 31 steps ahead.",
    "Udder dominance incoming!",
    "Just grazing through your defenses!",
  ],
  danger: [
    "Wait... 28?! Sweat is dripping! 💦",
    "Don't you dare leave me on 30!",
    "My cow senses are tingling with fear!",
    "This pasture is getting hazardous!",
  ],
  defeat: [
    "COW DOWN 31! ROUND & ROUND! 💫",
    "MOOOOO! Everything is spinning! 😵",
    "I can't feel my hooves!",
    "31 strikes again! AAAAAHH!",
  ],
  victory: [
    "Udder perfection! I win! 🏆",
    "Champion of the Meadow! 🐮👑",
    "Moo-yah! Never in doubt!",
  ],
};

const PLAYER_QUOTES = {
  confident: [
    "Your turn, cow! Let's see your move.",
    "Easy pasture! 🍀",
    "Calculated precision!",
  ],
  danger: [
    "Careful now... one slip and it's 31!",
    "The pressure is on!",
    "Hold the milk, it's danger time!",
  ],
};

function getRandomItem<T>(arr: T[]): T {
  const index = Math.floor(Math.random() * arr.length);
  return arr[index] as T;
}

export const useGameStore = create<GameState>((set, get) => ({
  currentCount: 0,
  targetCount: 31,
  turn: "player",
  gameMode: "vs-ai",
  difficulty: "normal",
  gameStatus: "idle",
  isProcessing: false,
  history: [],
  loser: null,
  winner: null,
  screenShake: false,
  speechBubble: {
    speaker: "opponent",
    text: "Welcome to Count Down 31! Don't hit 31 or you spin out! 🐮",
  },
  playerEmotion: "confident",
  opponentEmotion: "confident",
  stats: {
    playerWins: 0,
    opponentWins: 0,
    totalGames: 0,
  },

  setGameMode: (mode: GameMode) => set({ gameMode: mode }),
  setDifficulty: (difficulty: Difficulty) => set({ difficulty }),

  setSpeech: (text: string, speaker: "player" | "opponent") => {
    set({ speechBubble: { text, speaker } });
  },

  clearSpeech: () => set({ speechBubble: null }),

  startGame: (mode?: GameMode, diff?: Difficulty) => {
    const gameMode = mode ?? get().gameMode;
    const difficulty = diff ?? get().difficulty;

    soundManager.playClick();
    set({
      currentCount: 0,
      turn: "player",
      gameMode,
      difficulty,
      gameStatus: "playing",
      isProcessing: false,
      history: [],
      loser: null,
      winner: null,
      screenShake: false,
      playerEmotion: "confident",
      opponentEmotion: "confident",
      speechBubble: {
        speaker: "opponent",
        text: "Game on! You go first! Pick +1 or +2.",
      },
    });
  },

  resetGame: () => {
    soundManager.playClick();
    set({
      currentCount: 0,
      turn: "player",
      gameStatus: "idle",
      isProcessing: false,
      history: [],
      loser: null,
      winner: null,
      screenShake: false,
      playerEmotion: "confident",
      opponentEmotion: "confident",
      speechBubble: {
        speaker: "opponent",
        text: "Ready for another round? Press Start!",
      },
    });
  },

  trigger31Defeat: (loserTurn: Turn) => {
    const { gameMode, stats } = get();
    const isPlayerLoser = loserTurn === "player";
    const winnerTurn: Turn = isPlayerLoser ? (gameMode === "vs-ai" ? "ai" : "player2") : "player";

    // Play dizzy cartoon slide and spin effect
    soundManager.playSpinDefeat();

    // Trigger Screen Shake
    set({ screenShake: true });
    setTimeout(() => set({ screenShake: false }), 700);

    // Update emotions and speech
    if (isPlayerLoser) {
      set({
        playerEmotion: "dizzy",
        opponentEmotion: "celebrating",
        speechBubble: {
          speaker: "opponent",
          text: getRandomItem(AI_QUOTES.victory),
        },
      });
    } else {
      set({
        playerEmotion: "celebrating",
        opponentEmotion: "dizzy",
        speechBubble: {
          speaker: "opponent",
          text: getRandomItem(AI_QUOTES.defeat),
        },
      });

      // Confetti burst for player win
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#22c55e", "#fbbf24", "#f43f5e", "#38bdf8", "#a855f7"],
        });
      } catch {}
      soundManager.playVictory();
    }

    set({
      gameStatus: "spin_defeat",
      loser: loserTurn,
      winner: winnerTurn,
      isProcessing: false,
      stats: {
        playerWins: winnerTurn === "player" ? stats.playerWins + 1 : stats.playerWins,
        opponentWins: winnerTurn !== "player" ? stats.opponentWins + 1 : stats.opponentWins,
        totalGames: stats.totalGames + 1,
      },
    });
  },

  addCount: async (amount: 1 | 2) => {
    const { currentCount, targetCount, turn, gameStatus, isProcessing, history, gameMode, difficulty } = get();

    if (gameStatus !== "playing" || isProcessing) return;
    if (currentCount >= targetCount) return;

    const from = currentCount;
    const nextCount = Math.min(from + amount, targetCount);
    const actorName = turn === "player" ? "Player" : gameMode === "vs-ai" ? "Bessie AI" : "Player 2";

    const moveItem: MoveHistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      player: actorName,
      turn,
      amount,
      from,
      to: nextCount,
      timestamp: Date.now(),
    };

    // Play rising step sound
    soundManager.playStep(nextCount, amount);

    // Check danger zone sound (28-30)
    if (nextCount >= 28 && nextCount < 31) {
      setTimeout(() => soundManager.playDanger(), 120);
    }

    // Determine emotions based on count
    let pEmotion: CowEmotion = "confident";
    let oEmotion: CowEmotion = "confident";

    if (nextCount >= 28 && nextCount <= 30) {
      pEmotion = turn === "player" ? "confident" : "sweating";
      oEmotion = turn === "player" ? "sweating" : "confident";
    }

    set({
      currentCount: nextCount,
      history: [moveItem, ...history],
      playerEmotion: pEmotion,
      opponentEmotion: oEmotion,
    });

    // Check if 31 was hit
    if (nextCount === targetCount) {
      get().trigger31Defeat(turn);
      return;
    }

    // Switch turn
    const nextTurn: Turn = turn === "player" ? (gameMode === "vs-ai" ? "ai" : "player2") : "player";

    // Speech bubble commentary
    if (nextCount >= 28) {
      set({
        speechBubble: {
          speaker: nextTurn === "ai" ? "opponent" : "player",
          text: getRandomItem(nextTurn === "ai" ? AI_QUOTES.danger : PLAYER_QUOTES.danger),
        },
      });
    }

    set({ turn: nextTurn });

    // Handle AI turn
    if (nextTurn === "ai" && gameMode === "vs-ai") {
      set({ isProcessing: true });

      // Realistic thinking delay for AI (700ms - 1300ms)
      const thinkTime = 700 + Math.random() * 550;
      await new Promise((res) => setTimeout(res, thinkTime));

      const stateNow = get();
      if (stateNow.gameStatus !== "playing") return;

      const aiCount = stateNow.currentCount;
      let aiAmount: 1 | 2 = 1;

      // Smart AI calculation:
      // Winning target is 30. Key modulo is n % 3 === 0.
      if (difficulty === "master") {
        if (aiCount === 29) {
          aiAmount = 1; // take 30! opponent forced to 31
        } else if (aiCount === 28) {
          aiAmount = 2; // take 30! opponent forced to 31
        } else {
          // Try to land on multiple of 3 (0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30)
          if ((aiCount + 1) % 3 === 0) {
            aiAmount = 1;
          } else if ((aiCount + 2) % 3 === 0) {
            aiAmount = 2;
          } else {
            aiAmount = Math.random() > 0.5 ? 2 : 1;
          }
        }
      } else if (difficulty === "normal") {
        // 70% smart, 30% random
        if (Math.random() < 0.7) {
          if (aiCount === 29) aiAmount = 1;
          else if (aiCount === 28) aiAmount = 2;
          else if ((aiCount + 1) % 3 === 0) aiAmount = 1;
          else if ((aiCount + 2) % 3 === 0) aiAmount = 2;
          else aiAmount = Math.random() > 0.5 ? 2 : 1;
        } else {
          aiAmount = Math.random() > 0.5 ? 2 : 1;
        }
      } else {
        // Easy: mostly random
        aiAmount = Math.random() > 0.5 ? 2 : 1;
      }

      // Avoid jumping to 31 if 1 is safe (e.g. at 29, don't pick 2)
      if (aiCount === 29 && aiAmount === 2) {
        aiAmount = 1;
      }

      set({ isProcessing: false });
      await get().addCount(aiAmount);
    }
  },
}));
