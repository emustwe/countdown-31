"use client";

import { PracticeGame } from "../../../components/dune/PracticeGame";

// VA (Victory Ark) free-play — the exact VA tournament game (theme, symbols, Wild/Scatter/
// Jackpot, popups) in practice mode with dummy coins, for testing the VA look and flow.
export default function VaPracticeGamePage() {
  return <PracticeGame brand="VA" />;
}
