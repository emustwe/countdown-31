# 🐮 COUNT DOWN 31 — MODULAR AVATAR & ACCESSORY PROMPTS
### Official Asset Generation Specification for Plain Cows & Layered Wearables (ChatGPT / DALL-E 3 / Midjourney v6)

---

## 🎨 1. Base Plain Cows (Mannequin Templates — NO WEARABLES)
*Use these prompts to generate the clean base character models. They must have NO sunglasses, NO clothes, and NO accessories so users can customize them with modular wearables.*

### 🐮 Prompt A: Base Plain Male Bull (Customizable Mannequin)
> **Copy-Paste Prompt for ChatGPT / DALL-E / Midjourney**:
> `A stylized 3D mobile arcade character portrait of an anthropomorphic black-and-white spotted male bull. Centered three-quarter bust, facing forward, friendly smirking expression. Short polished golden horn stubs, clean smooth fur with crisp Holstein spots, natural cow ears. Completely plain with NO clothing, NO sunglasses, NO hats, NO jewelry, NO accessories. High-end 3D Supercell / Pixar mobile game hero render, octane render, smooth volumetric studio rim lighting, solid dark emerald green background, ultra-detailed 8k resolution, centered composition. --ar 1:1 --v 6.0`

---

### 🌸 Prompt B: Base Plain Female Dairy Cow (Customizable Mannequin)
> **Copy-Paste Prompt for ChatGPT / DALL-E / Midjourney**:
> `A stylized 3D mobile arcade character portrait of an anthropomorphic caramel-brown and cream jersey dairy cow. Centered three-quarter bust, facing forward, gentle confident smile, big sparkling eyes. Small smooth polished horn tips, natural floppy cow ears. Completely plain with NO clothing, NO sunglasses, NO hats, NO jewelry, NO accessories. High-end 3D Supercell / Pixar mobile game render, soft warm studio rim lighting, solid dark pasture background, ultra-detailed 8k resolution, centered composition. --ar 1:1 --v 6.0`

---

## 🕶️ 2. Modular Wearables & Accessories (To Layer On Top)
*Generate these items on a pure white or transparent background so they can be clipped into PNGs and layered over the base cows.*

### 🕶️ Prompt C: Gold Aviator Sunglasses (Wearable Layer)
> **Copy-Paste Prompt**:
> `A stylized 3D mobile game icon of classic gold aviator sunglasses with reflective dark tint lenses, polished golden metal wireframe, perfectly symmetrical, front-facing view, isolated on a pure solid white background, 3D arcade asset, specular shine, ultra clean render. --ar 1:1 --v 6.0`

---

### 🧔 Prompt D: Gentleman's Handlebar Mustache (Wearable Layer)
> **Copy-Paste Prompt**:
> `A stylized 3D cartoon gentleman's handlebar mustache with sharp curved tips, rich dark espresso brown color, perfectly symmetrical, front-facing view, isolated on a pure solid white background, 3D mobile arcade game cosmetic asset, clean bevel edges. --ar 1:1 --v 6.0`

---

### 👑 Prompt E: Royal King's Golden Crown (Wearable Layer)
> **Copy-Paste Prompt**:
> `A stylized 3D mobile game royal golden king's crown with glowing ruby and sapphire gems embedded in the arches, polished embossed gold bullion, front-facing view, isolated on a pure solid white background, 3D arcade cosmetic asset, volumetric highlights. --ar 1:1 --v 6.0`

---

### 🤠 Prompt F: Outlaw Cowboy Stetson Hat (Wearable Layer)
> **Copy-Paste Prompt**:
> `A stylized 3D mobile game brown weathered leather cowboy Stetson hat with a silver star buckle band, front-facing view, isolated on a pure solid white background, 3D arcade cosmetic asset, rich leather texture, clean render. --ar 1:1 --v 6.0`

---

## 🛠️ 3. How the Layering Code Works in the App
All items are layered using normalized CSS relative percentage anchors inside a `1:1` aspect-ratio container (`AvatarStudio.tsx`):
- **Base Cow**: `w-full h-full object-cover`
- **Mustache**: `top: 49%, left: 34%, width: 32%`
- **Glasses**: `top: 33%, left: 28%, width: 44%`
- **Hat**: `top: 4%, left: 22%, width: 56%`
- **Outer Frame**: `inset-0 w-full h-full`
