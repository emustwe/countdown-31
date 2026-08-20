# 📐 COUNT DOWN 31 — STANDARDIZED 1024×1024 MASTER AVATAR SPECIFICATION
### The Production Standard for AI Generation, Asset Normalization, and Multi-Screen Responsiveness

---

## 🎯 The Core Problem & The Golden Rule

### The Problem:
When characters are generated with their head touching the top of the canvas, adding a hat or crown causes the accessory to clip outside the avatar frame or requires awkward vertical shifting.

### The Golden Standard:
Every asset in Count Down 31 is authored or normalized onto a **`1024 x 1024` Transparent PNG Master Canvas**.
Every character is framed with **~20% Headroom Clearance** above the horn base, ensuring hats, crowns, and auras fit comfortably inside the frame without clipping.

```
                          1024 x 1024 MASTER CANVAS
+-------------------------------------------------------------------------------+ (0, 0)
|                                                                               |
|  [ ZONE 1: HEADWEAR & CROWNS ]       -> Y: 40px  to 240px  (H: ~200px)        |
|  (Hats, Caps, Helmets, King's Crown)                                          |
|                                                                               |
|  [ ZONE 2: HORNS & EARS ]            -> Y: 180px to 360px  (H: ~180px)        |
|  (Golden Horns, Ear Piercings)                                                |
|                                                                               |
|  [ ZONE 3: EYEWEAR & VISORS ]        -> Y: 340px to 480px  (H: ~140px)        |
|  (Aviator Sunglasses, Cyber Visors)                                           |
|                                                                               |
|  [ ZONE 4: SNOUT, MUSTACHE & MOUTH ] -> Y: 460px to 620px  (H: ~160px)        |
|  (Handlebar Mustache, Straw, Goatee)                                          |
|                                                                               |
|  [ ZONE 5: CHEST, CHAINS & TORSO ]   -> Y: 600px to 1024px (H: ~424px)        |
|  (Varsity Jacket, Diamond Bell Chain)                                         |
|                                                                               |
+-------------------------------------------------------------------------------+ (1024, 1024)
```

---

## 🎨 1. Standardized AI Prompts for Future Asset Generation

### 🐮 Prompt Template: Base Customizable Character (20% Headroom Standard)
> **Copy-Paste Prompt for ChatGPT / DALL-E 3 / Midjourney v6**:
> `A stylized 3D mobile arcade character portrait of an anthropomorphic bovine cow champion. Centered composition with 25% empty headroom space at the top of the canvas above the horns. Facing straight forward, friendly confident expression. Completely plain with NO clothing, NO sunglasses, NO hats, NO jewelry. Three-quarter bust view from chest up. 3D Supercell / Pixar mobile game hero render, octane render, clean volumetric studio lighting, solid dark emerald background, ultra-detailed 8k resolution, centered with generous top clearance. --ar 1:1 --v 6.0`

---

## 🛠️ 2. How the Frontend Renders This Master Stack
With all assets normalized onto `1024x1024`, the frontend uses the **Zero-Math Stack**:

```tsx
<div className="relative aspect-square w-full overflow-hidden rounded-3xl">
  {/* Layer 0: Background */}
  <img src="/assets/master/bg_emerald.png" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />

  {/* Layer 1: Base Character */}
  <img src="/assets/master/base_bull.png" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />

  {/* Layer 2: Mustache (if equipped) */}
  {hasMustache && <img src="/assets/master/mustache.png" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />}

  {/* Layer 3: Glasses (if equipped) */}
  {hasGlasses && <img src="/assets/master/glasses.png" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />}

  {/* Layer 4: Crown / Hat (if equipped) */}
  {hasCrown && <img src="/assets/master/crown.png" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />}

  {/* Layer 5: Battle Card Frame */}
  <img src="/assets/master/frame_mythic_gold.png" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
</div>
```

---

## 📱 3. Multi-Device Scalability Guarantee
- **32px** (Match Roster / Scoreboard Pill) $\to$ Scales 100% proportionally.
- **64px** (Player Action Card) $\to$ Scales 100% proportionally.
- **160px** (Rival Battle Card Showcase) $\to$ Scales 100% proportionally.
- **360px** (Avatar Studio / Locker) $\to$ Scales 100% proportionally.
- **Native Mobile Screen (iOS / Android React Native or Web View)** $\to$ Scales 100% proportionally.
