# 🐮 COUNT DOWN 31 — GAME MASTER CONTEXT & UI SPECIFICATION

> **Version**: 2.0.0 — Arcade Bovine Edition  
> **Platform**: Web (Next.js 15 / React 19 / Tailwind CSS / Framer Motion / Web Audio) & Mobile Target  
> **Author & Mascot**: Barnaby the Bovine Champion  
> **Purpose**: Master context document for developers, UI/UX designers, and Generative AI brainstorming tools (ChatGPT, Claude, Midjourney, Figma AI).

---

## 📖 TABLE OF CONTENTS
1. [Game Overview & Core Vision](#1-game-overview--core-vision)
2. [Game Rules & Mathematical Strategy (Nim Theory)](#2-game-rules--mathematical-strategy-nim-theory)
3. [Character & Mascot Bible (Barnaby)](#3-character--mascot-bible-barnaby)
4. [3D Rolling Cylinder Reel (Core Interaction)](#4-3d-rolling-cylinder-reel-core-interaction)
5. [Tactical Pay-To-Win Skills System](#5-tactical-pay-to-win-skills-system)
6. [Visual Design Language & Aesthetics](#6-visual-design-language--aesthetics)
7. [Sound & Micro-Interactions Engine](#7-sound--micro-interactions-engine)
8. [Codebase Architecture & File Map](#8-codebase-architecture--file-map)
9. [Mobile Native UI Guidelines](#9-mobile-native-ui-guidelines)
10. [AI Brainstorming & Image Generation Prompts](#10-ai-brainstorming--image-generation-prompts)

---

## 1. 🌟 GAME OVERVIEW & CORE VISION

### Elevator Pitch
**Count Down 31** (also known as the *Baskin-Robbins 31* or *Nim-31* battle) is a high-stakes, turn-based arcade strategy game where players take turns counting numbers from **1 up to 31**. On each turn, a player can advance the counter by **+1 or +2** (or use tactical skills). 

**The Golden Rule**: The player who is forced to say or land on **31** triggers the **Dizzy Cow Elimination Defeat** and loses the round!

### Aesthetic & Mood
- **NOT a gloomy monster/carnival game** (ogres and dark witches are removed).
- **NOT an overly childish baby cartoon**.
- **Target Vibe**: High-energy, luminous, juicy arcade gaming (similar to modern mobile blockbusters like *Brawl Stars*, *Coin Master*, *Cookie Run*, *Dice Dreams*).
- **Core Elements**: Sunlit emerald pasture arena, golden balance scales, brass coin medallions, red varsity bomber jackets, floating golden confetti, and tactile 3D cylinder mechanics.

---

## 2. 🧮 GAME RULES & MATHEMATICAL STRATEGY (NIM THEORY)

### Basic Rules
| Parameter | Value | Description |
| :--- | :--- | :--- |
| **Track Length** | 1 to 31 | Numbers roll in order from 1 to 31 on a 3D cylinder reel. |
| **Standard Move** | +1 or +2 | Player chooses to step 1 number ahead or leap 2 numbers ahead. |
| **Losing Condition** | Number 31 | The player who lands on 31 loses immediately. |
| **Turn Limit** | 7 Seconds | Timer arms on turn start; timeout defaults to auto-step or elimination. |
| **Players** | 2 to 6 | Multi-player turn order rotates clockwise on a 3D carousel. |

### Mathematical Modulo-3 Nim Strategy
The game is a variation of the classic **subtraction game / misère Nim**:
- The target to avoid is **31**. Therefore, the winning safe point is **30**.
- If a player lands on **30**, the opponent is forced to take 31 and loses.
- By working backwards in modulo 3: $(30 - 3k)$, the guaranteed **Key Safe Numbers** are:
  $$\mathbf{30, 27, 24, 21, 18, 15, 12, 9, 6, 3}$$
- Any player who lands on these safe numbers can always maintain control by responding with $(3 - x)$ to whatever move the opponent makes.

---

## 3. 🐮 CHARACTER & MASCOT BIBLE (BARNABY)

### Mascot Profile: Barnaby
- **Species**: Anthropomorphic Black & White Dairy Bull.
- **Personality**: Charismatic, confident, sporty, playful, sharp-witted referee and champion.
- **Attire**:
  - Crimson/burgundy satin varsity bomber jacket with cream ribbed cuffs and collar.
  - Antique golden cowbell pendant on a leather cord.
  - Golden polished horns with metallic sheen.
  - Classic dark denim jeans and leather work boots.
- **Signature Prop**: Golden balance scale (representing the fair weight of every count).
- **Defeat State**: 
  - When 31 is hit, Barnaby undergoes the **Dizzy Cow Spin**: he spins 360° with **5 golden rotating stars** circling his head on a golden confetti podium.
  - Signature Catchphrase: **“Countdown 31, Round and Round 31! 💫😵”**
- **Victory State**: Barnaby wears a golden crown (`👑`) and delivers the victory fanfare: **“Udder perfection! You conquered 31! 🏆”**

### AI Bot Rivals in Roster
1. **Bessie AI 🐮**: Tactical AI bot that plays optimal modulo-3 mathematical strategy.
2. **Daisy Cow 🌸**: Cheerful risk-taking bot with pink floral avatar badges.
3. **Barnaby Horns 👑**: Elite veteran champion bot featuring the official mascot headshot.

---

## 4. 🎡 3D ROLLING CYLINDER REEL (CORE INTERACTION)

### Reel Geometry & Spatial Perspective
Unlike flat 1–31 number grids, Count Down 31 uses a **3D Cylindrical Horizon Reel**:
- **Front Frame (`.cd31-front-box`)**: An illuminated golden brass chassis framing the active 2–3 numbers in focus.
- **3D Curved Flanks**: Numbers prior to and ahead of the front frame dynamically curve away in 3D perspective space using CSS `rotateY`, `translateZ`, and `translateX`.

### Mathematical Transformation Formula:
```ts
const TARGET = 31;
const WINDOW = 3; // 3 numbers each side of the front
const wrapOffset = (raw: number, n = TARGET): number => raw - n * Math.round(raw / n);

// For each tile n:
const d = wrapOffset(n - center); // center = currentCount + 2
const ad = Math.abs(d);

let x = 0, ry = 0, z = 0, op = 1;
if (ad <= 1) {
  x = d * 128; // flat inside the front frame
} else {
  const s = Math.sign(d);
  const r = ad - 1;
  x = s * (214 + (r - 1) * 70); // spaced outward
  ry = -s * 52;                  // 52-degree cylindrical perspective rotation
  z = -r * 82;                   // recessed into the z-plane
  op = Math.max(0.14, 0.78 - (r - 1) * 0.3); // atmospheric fade
}
```

### Direct 1-Click Interaction (Zero Friction)
- **Tile `count + 1`**: Displays animated **`+1 MOVE`** badge. One click immediately plays that number and advances the turn.
- **Tile `count + 2`**: Displays **`+2 LEAP`** badge. One click leaps 2 numbers forward.
- **No separate submit button needed** — instantaneous tactile response!

---

## 5. ⚡ TACTICAL PAY-TO-WIN SKILLS SYSTEM

Players can equip and activate tactical power-ups during their turn to escape danger traps or disrupt opponents:

| Skill | Name | Cost / Charge | Effect | Tactical Use Case |
| :--- | :--- | :--- | :--- | :--- |
| 🔄 | **Rewind -2** *(Time Hoof)* | 1 charge / match | Decrements counter by **-2 steps**. | Escape the lethal 28–30 danger zone when trapped by an opponent. |
| ⚡ | **Turbo +3** *(Bovine Rush)* | 1 charge / match | Jumps **+3 numbers forward** in a single turn. | Blitz directly onto key safe numbers (e.g. 24 → 27 or 27 → 30) to trap rival. |
| 🛡️ | **Bovine Shield** *(Pass/Deflect)* | 1 charge / match | Passes turn directly to opponent without advancing count. | Emergency dodge when facing a forced loss. |
| 🍀 | **Nudge -1** *(Lucky Shift)* | 1 charge / match | Nudges counter back by **-1 step**. | Micro-adjustment to realign with the modulo-3 sequence. |

---

## 6. 🎨 VISUAL DESIGN LANGUAGE & AESTHETICS

### Color Palette Tokens
| Token | Hex | Usage |
| :--- | :--- | :--- |
| **Barnaby Crimson** | `#991b1b` / `#ef4444` | Varsity jacket, 31 bomb medallion, danger highlights. |
| **Pasture Emerald** | `#5be348` / `#16a34a` | Safe numbers, player action glows, active turn highlights. |
| **Championship Gold** | `#ffdf78` / `#e5a419` | Front frame bracket, crowns, star badges, brass rivets. |
| **Pasture Night Glass** | `rgba(16, 28, 22, 0.85)` | Glassmorphism card surfaces, dark backdrop veil. |
| **Electric Cyan** | `#38bdf8` / `#0284c7` | +2 leap badge, rewind skill glow, player status pills. |

### Card Anatomy: Championship Bovine Medallions
- **Dimensions**: $118\text{px} \times 126\text{px}$, $24\text{px}$ rounded squircle corners.
- **Rim**: $3\text{px}$ solid golden brass border with inner specular reflection.
- **Body**: Deep lacquer finish with subtle engraved lucky clover watermark (`🍀`).
- **Typography**: 3D embossed golden gradient (`#ffffff` → `#ffea9f` → `#e5a71b` → `#a16c02`) with deep drop shadows.
- **States**:
  - `Normal`: Crisp gold rim, dark lacquer base.
  - `Clickable (+1 / +2)`: Neon green/cyan border, pulsating scale on hover, action badge.
  - `Done / Passed`: Soft jade green translucent finish with `✓` checkmark.
  - `Danger Zone (28–30)`: Blazing amber-fire rim with heat shimmer and `🔥 DANGER` banner.
  - `Bomb 31`: Dark crimson skull medallion with flashing hazard aura and `💣 31` tag.

---

## 7. 🔊 SOUND & MICRO-INTERACTIONS ENGINE

Built with a zero-latency synthesized Web Audio engine (`soundManager.ts`):
- `playClick()`: Short 800Hz tactile pop for UI taps.
- `playStep(count, delta)`: Musical rising chime scaled dynamically with count progression (higher pitch as count nears 31).
- `playDanger()`: Low ominous 220Hz pulse alert triggered at count 28+.
- `playSpinDefeat()`: Cartoon slide whistle down + 8Hz vibrato boing + bass thud when 31 is hit.
- `playVictory()`: C-major celebratory arpeggio fanfare (C5, E5, G5, C6) + confetti burst.
- `playMoo()`: Playful synthesized cow moo with formant filtering.
- `playSkillRewind()`, `playSkillTurbo()`, `playSkillShield()`: Distinct audio signatures for tactical skills.

---

## 8. 📂 CODEBASE ARCHITECTURE & FILE MAP

```
Frontend/
├── src/
│   ├── app/
│   │   ├── globals.css          # Arcade typography, 3D button classes, keyframe animations
│   │   ├── dune.css             # Shell styling, 3D cylinder reel transforms, medallion shaders
│   │   ├── layout.tsx           # Google Fonts (Lilita One, Fredoka)
│   │   └── home/page.tsx        # Practice room landing page + PastureAmbiance wrapper
│   ├── components/
│   │   └── dune/
│   │       ├── CountDown31.tsx  # Core 3D cylinder number reel, 1-click play, skill dock, player roll
│   │       ├── BarnabyMascot.tsx# Companion commentary bar, victory screen, 360 dizzy defeat sequence
│   │       ├── PastureAmbiance.tsx# Floating sunbeams, rolling green hills SVG, particles
│   │       ├── Shell.tsx        # TopNav, profile menu, wallet chip, logo
│   │       └── Avatar.tsx       # DiceBear Avataaars + Bovine thumbnail generator
│   └── lib/
│       ├── soundManager.ts      # Zero-latency Web Audio API synthesizers
│       └── hooks/
│           └── useCountdownLive.ts # Socket.io state machine + offline AI Nim simulation
└── public/
    └── assets/
        └── barnaby/             # Official 3D character renders & arena backdrops
            ├── barnaby-field.jpg           # Barnaby thumbs up with golden scales
            ├── barnaby-dizzy-stars.jpg     # Barnaby spinning on podium with 5 golden stars
            ├── barnaby-pasture-arena.jpg   # Photorealistic 3D sunlit arena background
            └── barnaby-character.jpg       # Character portrait & full-body reference
```

---

## 9. 📱 MOBILE NATIVE UI GUIDELINES

For the upcoming dedicated mobile native layout:
1. **Vertical Orientation (9:16)**:
   - Header: Compact TopNav + wallet chip + Barnaby mini-mascot badge.
   - Upper Middle: 3D Rolling Cylinder Reel occupying a focused $340\text{px}$ central stage.
   - Lower Middle: Direct 1-Click Card action dock (`+1 MOVE` and `+2 LEAP` cards within thumb reach).
   - Bottom Dock: Horizontal Tactical Skills Deck (`-2`, `+3`, `Shield`, `-1`).
   - Footer: Horizontal 3D Avatar Carousel with active player indicators.
2. **Thumb-Zone Optimization**:
   - All interactive gameplay buttons must sit within the lower $40\%$ of the viewport for comfortable one-handed mobile play.

---

## 10. 🤖 AI BRAINSTORMING & IMAGE GENERATION PROMPTS

Use these exact prompts in **Midjourney / DALL-E 3 / Figma AI / Claude** to brainstorm new UI components, cards, and screens:

### Prompt 1: Number Reel Medallion Cards (Midjourney v6)
> `UI game asset, 3D stylized arcade coin medallion cards for a game called CountDown 31, bovine cow theme, brass golden beveled rim with rivets, deep emerald green lacquer background, embossed 3D golden number typography, glossy glass reflection, floating action pill tag with "+1 MOVE", vibrant lighting, mobile game UI, Supercell Brawl Stars and Coin Master aesthetic, high detail, 8k, isolated on dark background --ar 16:9 --v 6.0`

### Prompt 2: Mobile Game Screen Mockup
> `Mobile game UI interface design, portrait 9:16 screen for an arcade number counting game, Count Down 31, friendly anthropomorphic cow mascot in red varsity jacket in the background, 3D cylindrical rolling wheel with glowing golden number tiles in center, tactile green and amber 3D arcade action buttons, cozy sunlit pasture background with golden balance scale, polished UI, game hud, casual mobile game style --ar 9:16 --v 6.0`

### Prompt 3: Victory & Dizzy Defeat Screens
> `Mobile game victory screen popup modal, 3D cartoon bull cow mascot with golden crown celebrating under golden confetti, trophy banner, golden stars, wooden and gold frame, glowing emerald and gold buttons "PLAY AGAIN", high polish arcade game UI, vibrant colors, clean layout --ar 16:9 --v 6.0`

---
*End of Master Context Document — Count Down 31*
