# 🎬 Video Engine & GPU Transparency

## 1. Overview
The defeat animation presents Barnaby the 3D Cow spinning in space upon match elimination.

---

## 2. Hardware-Accelerated Black Background Stripping
- **Component**: `Frontend/src/components/dune/TransparentVideo.tsx`
- **Method**: Direct GPU shader blending via `style={{ mixBlendMode: "screen" }}` on `<video autoplay playsInline />`.
- **Why it replaced Canvas Chroma Key**:
  - In Chromium browsers, hidden canvas video streams pause frame decoding to save energy, causing blank screens.
  - `mixBlendMode: "screen"` executes directly on GPU video render pipelines at full 60 FPS with guaranteed playback across all browsers and zero CPU decoding overhead.

---

## 3. Cardless Character Stage
- The character does NOT sit inside a popup or modal card.
- It floats seamlessly on top of the pasture background with floating 3D golden stars, comic speech bubble, and 3D Play Again button.

---

## 4. Related Links
- [[02_Game_Engine_And_31_Rules]]
- [[Session_History]]
