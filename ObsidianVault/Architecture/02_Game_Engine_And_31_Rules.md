# 🎲 Game Engine & Countdown 31 Rules

## 1. Core Game Rules
- **Target Bomb**: **31** 💣
- **Playable Steps**: Players can pick **1, 2, or 3 consecutive cards** on their turn.
- **Losing Condition**: The player forced to hit or count **31** is eliminated!

---

## 2. Turn Mechanics & Card Selection
- On a player's turn:
  - Card at `offset = 0` (e.g. `15`) is the 1st pick.
  - Card at `offset = 1` (e.g. `16`) is the 2nd pick.
  - Card at `offset = 2` (e.g. `17`) is the 3rd pick.
- Selecting any card triggers the solid, non-pulsing **`CONFIRM MOVE (k CARDS) ➔`** button.
- Submitting the move advances `currentCount` and passes the turn to the next player.

---

## 3. Bot Count & Testing Engine
- Supported Bot Counts:
  - **1v1 Duel**: 1 opponent bot (`cpu_bessie`). Match concludes in seconds for rapid testing.
  - **4-Player Match**: 3 opponent bots (`cpu_bessie`, `cpu_clover`, `cpu_angus`).
- Fast Defeat Trigger: `triggerDefeat("31")` exported via `useCountdownLive.ts` for instant 1-click defeat animation testing.

---

## 4. Related Links
- [[01_3D_Cylinder_And_Geometry]]
- [[03_Video_Engine_And_Transparencies]]
