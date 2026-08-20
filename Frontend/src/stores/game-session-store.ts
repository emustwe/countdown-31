import { create } from "zustand";
import { persist } from "zustand/middleware";

// The server is the source of truth for whether a round still has free spins left
// (GameRound.freeSpinsRemaining) — this store just remembers *which* round was in
// progress so a page reload/disconnect can resume revealing it instead of stranding the
// player on a finished round with no way back to it.
interface GameSessionState {
  activeRoundId: string | null;
  setActiveRound: (roundId: string | null) => void;
}

export const useGameSessionStore = create<GameSessionState>()(
  persist(
    (set) => ({
      activeRoundId: null,
      setActiveRound: (roundId) => set({ activeRoundId: roundId }),
    }),
    { name: "aurora-ways-game-session" },
  ),
);
