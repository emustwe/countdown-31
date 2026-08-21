# 📝 Session History & Changelog

## 📅 2026-08-21
- **Card Geometry & Spacing Fix**:
  - Main arena grid converted to `lg:grid-cols-[270px_minmax(0,1fr)_270px]` allowing the central column to expand up to `1000px`.
  - Restored wide, chunky card proportions (`w-[86px] sm:w-[100px] md:w-[110px]`) with `STEP = 118px` for 8px clean separation gaps.
  - Card 29 (offset -3) and Card 4 (offset +3) now enjoy 65px of clearance inside the brass rim, ensuring 100% full visibility across all 7 cards.
- **Modulo Calculation Fix**:
  - Implemented positive Euclidean modulo `(((raw - 1) % 31) + 31) % 31 + 1` to resolve the duplicate `1, 1, 2` start glitch.
- **Turn Pointer & Previous Move Alignment**:
  - Golden diamond pointer and `★ PICK 1ST` frame locked at 50% dead center over the next playable card (`offset = 0`).
  - All previously played cards grouped clearly on the left (`offset = -3, -2, -1`) with `PREV` badges and player color glowing borders.
- **Solid Confirm Move Button**:
  - Removed `animate-pulse` opacity fading for instant, crisp, solid click feedback.
- **Obsidian Knowledge Vault Created**:
  - Created complete structured vault under `ObsidianVault/` with internal linking and documentation.

---

## 4. Related Links
- [[00_Index]]
- [[01_3D_Cylinder_And_Geometry]]
- [[02_Game_Engine_And_31_Rules]]
