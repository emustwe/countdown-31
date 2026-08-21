# 🎴 3D Cylinder & Geometry Architecture

## 1. Overview
The **Arcade 3D Cylinder** (`Frontend/src/components/dune/Arcade3DCylinder.tsx`) is the central interactive game component. It represents a horizontal rotating drum with 7 fully visible cards on screen at all times.

---

## 2. The 7-Card Symmetrical Layout
```
[ Card -3 ]   [ Card -2 ]   [ Card -1 ]   [ Card 0 (★ NEXT/NOW) ]   [ Card +1 ]   [ Card +2 ]   [ Card +3 ]
(Prev Pick 1) (Prev Pick 2) (Prev Pick 3)   (Next Playable #)       (Pick +2)     (Pick +3)     (Right Peek)
```

### Exact Coordinates & Dimensions
| Property | Value | Notes |
| :--- | :--- | :--- |
| **Center Anchor (`baseCenterX`)** | `50%` | Exact dead center of drum machine housing |
| **Container Max Width** | `1000px` | Set on `CountDown31.tsx` center column (`grid-cols-[270px_1fr_270px]`) and drum housing |
| **Card Width** | `w-[86px] sm:w-[100px] md:w-[110px]` | Chunky, wide, premium arcade proportions |
| **Card Height** | `h-[140px] sm:h-[160px] md:h-[175px]` | 3D beveled typography with vertical metallic ribs |
| **Step Spacing (`STEP`)** | `118px` | `118px - 110px = 8px` clean separation gap |
| **Golden Bracket Width** | `w-[90px] sm:w-[104px] md:w-[114px]` | Hugs center card with 2px cushion, leaving 6px from neighbors |
| **Total 7-Card Span** | `818px` | $3 \times 118 = 354\text{px}$ on left, $354\text{px}$ on right + $110\text{px}$ card width |
| **Side Wall Clearance** | `65px` | Card 29 (offset -3) and Card 4 (offset +3) have 65px clearance inside brass rim |

---

## 3. Modulo Math for Infinite Wrapping
To prevent negative offset bugs (like the duplicate `1, 1, 2` start glitch), the cylinder uses Euclidean positive modulo arithmetic:

```typescript
function calculateSlotNumber(currentCount: number, offset: number): number {
  const raw = currentCount + 1 + offset;
  const mod = (((raw - 1) % TARGET) + TARGET) % TARGET + 1;
  return mod;
}
```

---

## 4. Related Links
- [[02_Game_Engine_And_31_Rules]]
- [[01_Arcade_Theme_And_Tokens]]
