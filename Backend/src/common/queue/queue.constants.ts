export const SIDE_EFFECTS_QUEUE = "side-effects";

export const SIDE_EFFECTS_JOBS = {
  SPIN_COMPLETED: "spin-completed",
} as const;

export interface SpinCompletedJobData {
  roundId: string;
  userId: string;
  totalBet: string;
  totalWin: string;
}
