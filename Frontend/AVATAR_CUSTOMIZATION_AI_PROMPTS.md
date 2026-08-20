# 🐮 COUNT DOWN 31 — AVATAR & BATTLE CARD CUSTOMIZATION AI PROMPTS
### Official Asset Generation & Prompt Engineering Specification for ChatGPT / DALL-E 3 / Midjourney v6

---

## 📖 1. Context & Visual Identity Guidelines (For AI Models)

### Theme & Art Direction:
- **Style**: Stylized 3D mobile arcade game character art (similar to *Brawl Stars*, *Coin Master*, *Clash Royale*, *Fortnite*, *PUBG Mobile*).
- **Core Aesthetic**: High-energy, confident, slightly humorous, vibrant anthropomorphic bulls, cows, and bovine champions with detailed textures, cinematic rim lighting, volumetric studio lighting, and high-gloss metallic/lacquer shaders.
- **Tone**: Energetic, playful, competitive flex, premium "pay-to-show-off" cosmetics (gold chains, varsity jackets, cybernetic visors, glowing horns, crown jewels).
- **Strict Guidelines**:
  - NO grimdark, horror, blood, or gory elements.
  - Characters should be waist-up or three-quarter busts on a solid/clean contrast background so they can easily be extracted or framed inside avatar badges.

---

## 🎨 2. Copy-Pasteable Prompts for ChatGPT / DALL-E 3 / Midjourney

### Category A: Premium Avatar Characters & Skins (Tiered Cosmetics)

#### 🌟 Prompt 1: The Golden Emperor Bull (Mythic Tier 👑)
> **Prompt**:
> `A stylized 3D mobile arcade game character portrait of an anthropomorphic black-and-white bovine champion cow named 'The Golden Emperor'. He wears a regal crimson and gold velvet varsity jacket with heavy solid gold bullion chains, an ornate diamond-encrusted cowbell necklace, polished gleaming golden horns with glowing runic etchings, and dark gold aviator sunglasses. Confident smirking champion expression, three-quarter bust pose flexing a thumbs up. High-end 3D Pixar/Supercell render style, octane render, volumetric golden studio rim lighting, cinematic depth of field, vibrant warm colors, solid dark emerald background, ultra-detailed 8k resolution. --ar 1:1 --v 6.0`

#### ⚡ Prompt 2: Cyber-Pasture Mecha-Bull (Legendary Tier 🤖)
> **Prompt**:
> `A stylized 3D arcade game character portrait of a futuristic cyberpunk anthropomorphic cyber-cow champion. Sleek matte black carbon-fiber chassis with glowing electric-cyan neon panel lines, holographic glowing digital visor across the eyes, chrome-plated titanium horns with pulsating laser tips, metallic cowbell core glowing with turquoise plasma energy. Confident competitive grin, high-tech streetwear jacket with neon patches. 3D mobile game hero render, Unreal Engine 5 aesthetic, clean neon rim lighting, high-contrast dark pasture backdrop, 8k resolution. --ar 1:1 --v 6.0`

#### 🌸 Prompt 3: Valkyrie Daisy — The Pasture Queen (Epic Tier 🌸)
> **Prompt**:
> `A stylized 3D arcade game character portrait of an anthropomorphic jersey dairy cow champion named 'Daisy Valkyrie'. She has warm caramel-and-white fur, sparkling emerald eyes, a winged golden tiara between her curved pearl horns, a stylish pastel-pink leather pilot jacket with golden clover embroidery, and a miniature golden bell pendant. Playful, winking champion expression, confident pose holding a golden horseshoe. 3D stylized mobile game render, soft cinematic pasture lighting, pastel accents, clean studio background, 8k. --ar 1:1 --v 6.0`

#### 🤠 Prompt 4: Outlaw Bessie — The Wild West Gunslinger (Legendary Tier 🤠)
> **Prompt**:
> `A stylized 3D arcade game character portrait of a tough, swaggering anthropomorphic spotted cow outlaw named 'Bessie Kid'. She wears a tilted brown leather stetson hat with a golden sheriff star badge, a faded denim vest over a red flannel shirt, polished silver horn tips, and a chewing straw of pasture grass. Cool smirking expression, crossed arms pose. Stylized mobile arcade 3D hero art, warm golden sunset rim lighting, dust particles, clean contrasting background, 8k resolution. --ar 1:1 --v 6.0`

#### 🕶️ Prompt 5: Streetwear Hypebeast Bovine (Epic Tier 🔥)
> **Prompt**:
> `A stylized 3D mobile arcade character portrait of an anthropomorphic streetwear hypebeast bull. He wears an oversized glossy metallic crimson puffer jacket, a chunky diamond Cuban-link cowbell chain, tinted ski goggles perched on his forehead, and gold-plated horn rings. Ultra-cool swagger pose, wink and grin. High-end 3D mobile game asset, studio turntable lighting, rich textures, vibrant saturated colors, 8k resolution. --ar 1:1 --v 6.0`

---

### Category B: PUBG / Brawl Stars Style Battle Cards & Avatar Frames

#### 💎 Prompt 6: Mythic Gold Dragon Frame (Battle Card Frame)
> **Prompt**:
> `A high-end 3D mobile game UI avatar frame border, square format with curved corners and hollow center. The frame is constructed from embossed molten gold and emerald lacquer, featuring two miniature stylized Chinese dragons wrapping around the sides with glowing ruby eyes, diamond-studded corner rivets, and a pulsating golden crown badge at the top center. Transparent dark inner cutout, heavy 3D beveled edges, specular highlights, mobile arcade game UI asset, PNG style on solid dark background, 8k. --ar 1:1 --v 6.0`

#### ❄️ Prompt 7: Diamond Frost & Neon Glacier Battle Card (Nameplate Frame)
> **Prompt**:
> `A stylized 3D mobile game player banner and battle card frame. Horizontal rectangular card plate with beveled frost-crystal edges, glowing cyan neon energy conduits, metallic platinum brackets with industrial bolts, and a level 50 prestige badge on the left side. Sleek dark obsidian glass center for player stats, high-tech glowing particle aura, mobile esports UI asset, clean render, 8k resolution. --ar 16:9 --v 6.0`

#### 🔥 Prompt 8: Inferno Flame Win-Streak Frame
> **Prompt**:
> `A 3D mobile game UI avatar border and nameplate frame surrounded by stylized cartoon 3D burning fire flames, charred dark metallic obsidian bezel with glowing magma cracks, golden skull emblems at the bottom corners, and an animated-style 'x5 STREAK' blazing badge at the top. High-energy mobile game cosmetic, game UI asset, 8k. --ar 1:1 --v 6.0`

---

## 🛠️ 3. Frontend Implementation Plan for Battle Showcase

Once you generate the character images from ChatGPT:
1. Save the images into `Frontend/public/assets/avatars/`:
   - `emperor-bull.jpg`
   - `cyber-bull.jpg`
   - `valkyrie-daisy.jpg`
   - `outlaw-bessie.jpg`
   - `hypebeast-bull.jpg`
2. We will upgrade the **Player & Opponent Showcase Stages**:
   - **Left Stage (`YOU`)**: Large 3D Battle Card with your custom skin, animated frame, prestige title (`“The 31 Evader”`), trophy count, and win-streak flame.
   - **Right Stage (`ACTIVE OPPONENT`)**: Whenever an AI or live multiplayer rival takes their turn, their **Full 3D Battle Banner & Avatar** lights up with their custom frame, flex title, and character skin!
