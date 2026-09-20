"use client";

import React, { useState } from "react";
import { Check, Sparkles, Clock, Flame } from "lucide-react";
import { ArcadeHeader } from "../../components/dune/ArcadeHeader";
import { OfficialRulesModal } from "../../components/dune/OfficialRulesModal";
import { AuthGateModal } from "../../components/dune/AuthGateModal";
import { useAuthStore } from "../../stores/auth-store";
import { useAvatarStore, type AvatarConfig } from "../../stores/avatar-customization-store";
import { soundManager } from "../../lib/soundManager";
import { AVATAR_BACKGROUNDS, AVATAR_FRAMES, getAvatarFrame, type AvatarBackgroundId, type AvatarFrameId } from "../../lib/avatar-decorations";

// Characters and accessories left the shop — they are free and chosen straight from My Avatars,
// so the shop is now cosmetics-for-the-card only.
type ShopTab = "backgrounds" | "frames";

interface ShopItem {
  id: string;
  name: string;
  category: ShopTab;
  rarity: "Common" | "Epic" | "Mythic" | "Legendary";
  priceUsdt: number;
  preview: string;
  previewType: "bg" | "frame";
  description: string;
  frameSkinId?: AvatarFrameId;
}

const SHOP_ITEMS: ShopItem[] = [
  // 1. Backgrounds (Vibrant Gradient Cosmic, Forest & Arcade Worlds)
  {
    id: "emerald",
    name: "Emerald Pasture",
    category: "backgrounds",
    rarity: "Common",
    priceUsdt: 0,
    preview: "from-emerald-300 via-emerald-700 to-slate-950",
    previewType: "bg",
    description: "Classic vibrant emerald grass arena pasture backdrop.",
  },
  {
    id: "golden",
    name: "Golden Sun Meadow",
    category: "backgrounds",
    rarity: "Epic",
    priceUsdt: 1.99,
    preview: "from-yellow-200 via-amber-500 to-amber-950",
    previewType: "bg",
    description: "Sun-drenched golden harvest field with warm radiant lighting.",
  },
  {
    id: "cyber",
    name: "Cyber Grid Horizon",
    category: "backgrounds",
    rarity: "Epic",
    priceUsdt: 1.99,
    preview: "from-cyan-300 via-blue-600 to-slate-950",
    previewType: "bg",
    description: "High-tech cyberspace grid with digital electric neon waves.",
  },
  {
    id: "inferno",
    name: "Infernal Volcano Sky",
    category: "backgrounds",
    rarity: "Epic",
    priceUsdt: 1.99,
    preview: "from-yellow-300 via-red-600 to-rose-950",
    previewType: "bg",
    description: "Blazing lava volcano landscape with glowing ember smoke.",
  },
  {
    id: "obsidian",
    name: "Obsidian Dark Realm",
    category: "backgrounds",
    rarity: "Epic",
    priceUsdt: 1.99,
    preview: "from-slate-400 via-slate-800 to-black",
    previewType: "bg",
    description: "Deep obsidian shadows with titanium grey metallic contrast.",
  },
  {
    id: "aurora",
    name: "Aurora Borealis",
    category: "backgrounds",
    rarity: "Legendary",
    priceUsdt: 2.49,
    preview: "from-cyan-300 via-violet-500 to-emerald-400",
    previewType: "bg",
    description: "Shimmering northern lights dancing over the starlit sky.",
  },
  {
    id: "sunset",
    name: "Sunset Dunes",
    category: "backgrounds",
    rarity: "Legendary",
    priceUsdt: 2.49,
    preview: "from-amber-200 via-rose-400 to-violet-900",
    previewType: "bg",
    description: "Romantic golden hour twilight sky over rolling sand dunes.",
  },
  {
    id: "ocean",
    name: "Ocean Breeze",
    category: "backgrounds",
    rarity: "Legendary",
    priceUsdt: 2.49,
    preview: "from-cyan-200 via-sky-600 to-cyan-950",
    previewType: "bg",
    description: "Deep azure tropical ocean gradient with turquoise highlights.",
  },
  {
    id: "candy",
    name: "Candy Pop Dream",
    category: "backgrounds",
    rarity: "Legendary",
    priceUsdt: 2.49,
    preview: "from-pink-300 via-violet-300 to-cyan-300",
    previewType: "bg",
    description: "Playful pastel candy sky with shimmering bubble sparkles.",
  },
  {
    id: "royal",
    name: "Royal Majesty",
    category: "backgrounds",
    rarity: "Legendary",
    priceUsdt: 2.49,
    preview: "from-fuchsia-300 via-purple-700 to-violet-950",
    previewType: "bg",
    description: "Imperial purple velvet gradient fit for tournament nobility.",
  },
  {
    id: "starlight",
    name: "Starlight Cosmos",
    category: "backgrounds",
    rarity: "Legendary",
    priceUsdt: 2.49,
    preview: "from-indigo-400 via-indigo-900 to-slate-950",
    previewType: "bg",
    description: "Deep space universe backdrop dusted with sparkling stars.",
  },
  {
    id: "meadow",
    name: "Sunlit Meadow",
    category: "backgrounds",
    rarity: "Legendary",
    priceUsdt: 2.49,
    preview: "from-yellow-200 via-green-400 to-green-900",
    previewType: "bg",
    description: "Lush summer meadow with warm golden sun rays.",
  },
  {
    id: "frost",
    name: "Frost Glacier",
    category: "backgrounds",
    rarity: "Legendary",
    priceUsdt: 2.49,
    preview: "from-white via-sky-300 to-blue-900",
    previewType: "bg",
    description: "Sub-zero arctic frost with crystalline blue depths.",
  },
  {
    id: "lava",
    name: "Molten Lava Core",
    category: "backgrounds",
    rarity: "Legendary",
    priceUsdt: 2.49,
    preview: "from-yellow-300 via-orange-600 to-zinc-950",
    previewType: "bg",
    description: "High-intensity molten magma with burning volcanic cracks.",
  },
  {
    id: "rainbow",
    name: "Rainbow Pulse",
    category: "backgrounds",
    rarity: "Legendary",
    priceUsdt: 2.49,
    preview: "from-red-400 via-emerald-400 to-violet-500",
    previewType: "bg",
    description: "Full spectrum holographic rainbow pulse with arcade shine.",
  },

  // 2. 3D Frames (Live Frame Showcase with Avatar Preview)
  {
    id: "mythic_gold",
    name: "Sovereign Gold Crest",
    category: "frames",
    rarity: "Mythic",
    priceUsdt: 0,
    preview: "",
    previewType: "frame",
    frameSkinId: "mythic_gold",
    description: "Forged from pure pasture gold with radiant corner gem inlays.",
  },
  {
    id: "neon_glacier",
    name: "Neon Glacier Frame",
    category: "frames",
    rarity: "Epic",
    priceUsdt: 2.99,
    preview: "",
    previewType: "frame",
    frameSkinId: "neon_glacier",
    description: "Sub-zero frozen crystal border with icy blue pulsations.",
  },
  {
    id: "inferno",
    name: "Infernal Volcano Frame",
    category: "frames",
    rarity: "Epic",
    priceUsdt: 2.99,
    preview: "",
    previewType: "frame",
    frameSkinId: "inferno",
    description: "Molten volcanic rock border with burning ember particles.",
  },
  {
    id: "emerald",
    name: "Emerald Vine Crest",
    category: "frames",
    rarity: "Epic",
    priceUsdt: 2.49,
    preview: "",
    previewType: "frame",
    frameSkinId: "emerald",
    description: "Vibrant glowing emerald crystal border with natural leaf luster.",
  },
  {
    id: "sunset_gold",
    name: "Sunset Gold Double Border",
    category: "frames",
    rarity: "Legendary",
    priceUsdt: 3.49,
    preview: "",
    previewType: "frame",
    frameSkinId: "sunset_gold",
    description: "Warm radiant double gold border with solar flares and orange edge.",
  },
  {
    id: "ocean_pearl",
    name: "Ocean Pearl Rim",
    category: "frames",
    rarity: "Legendary",
    priceUsdt: 2.99,
    preview: "",
    previewType: "frame",
    frameSkinId: "ocean_pearl",
    description: "Iridescent sea pearl rim with deep aqua crystal reflections.",
  },
  {
    id: "candy_pop",
    name: "Candy Pop Gloss Border",
    category: "frames",
    rarity: "Legendary",
    priceUsdt: 2.49,
    preview: "",
    previewType: "frame",
    frameSkinId: "candy_pop",
    description: "Playful glossy pastel border with bubblegum pink highlights.",
  },
  {
    id: "royal_amethyst",
    name: "Royal Amethyst Jewel",
    category: "frames",
    rarity: "Legendary",
    priceUsdt: 3.49,
    preview: "",
    previewType: "frame",
    frameSkinId: "royal_amethyst",
    description: "Deep violet imperial jewel border with radiant reflections.",
  },
  {
    id: "star_chrome",
    name: "Star Chrome Titanium",
    category: "frames",
    rarity: "Legendary",
    priceUsdt: 3.49,
    preview: "",
    previewType: "frame",
    frameSkinId: "star_chrome",
    description: "Ultra-polished mirror chrome border with titanium highlights.",
  },
  {
    id: "forest_vine",
    name: "Ancient Ironwood Forest",
    category: "frames",
    rarity: "Legendary",
    priceUsdt: 2.49,
    preview: "",
    previewType: "frame",
    frameSkinId: "forest_vine",
    description: "Twisted ancient woodland vines infused with nature runes.",
  },
  {
    id: "frost_crystal",
    name: "Frost Crystal Facet",
    category: "frames",
    rarity: "Legendary",
    priceUsdt: 2.99,
    preview: "",
    previewType: "frame",
    frameSkinId: "frost_crystal",
    description: "Sub-zero diamond ice border with shimmering icicles.",
  },
  {
    id: "lava_core",
    name: "Molten Magma Core",
    category: "frames",
    rarity: "Legendary",
    priceUsdt: 3.49,
    preview: "",
    previewType: "frame",
    frameSkinId: "lava_core",
    description: "Heavy magma steel border pulsating with fiery heat.",
  },
  {
    id: "rainbow_arcade",
    name: "Rainbow Arcade RGB",
    category: "frames",
    rarity: "Mythic",
    priceUsdt: 3.99,
    preview: "",
    previewType: "frame",
    frameSkinId: "rainbow_arcade",
    description: "Prismatic RGB rainbow neon border with animated arcade flow.",
  },
  {
    id: "shadow_onyx",
    name: "Shadow Onyx Armor",
    category: "frames",
    rarity: "Legendary",
    priceUsdt: 2.99,
    preview: "",
    previewType: "frame",
    frameSkinId: "shadow_onyx",
    description: "Stealth obsidian armor frame with matte black beveling.",
  },
];

export default function ShopPage() {
  const [tab, setTab] = useState<ShopTab>("backgrounds");
  const [showRules, setShowRules] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const accessToken = useAuthStore((s) => s.accessToken);

  const unlockedItemIds = useAvatarStore((s) => s.unlockedItemIds) || [];
  const unlockItem = useAvatarStore((s) => s.unlockItem);
  const frameId = useAvatarStore((s) => s.frameId);
  const backgroundId = useAvatarStore((s) => s.backgroundId);
  const setFrame = useAvatarStore((s) => s.setFrame);
  const setBackground = useAvatarStore((s) => s.setBackground);

  function handleBuyOrEquip(item: ShopItem) {
    const isOwned = item.priceUsdt === 0 || unlockedItemIds.includes(item.id);

    if (!accessToken && !isOwned) {
      soundManager.playOpen();
      setShowAuthGate(true);
      return;
    }

    if (isOwned) {
      soundManager.playEquip();
      if (item.category === "backgrounds") {
        setBackground(item.id as AvatarConfig["backgroundId"]);
      } else if (item.category === "frames") {
        setFrame(item.id as AvatarConfig["frameId"]);
      }
      return;
    }

    // Everything is free — claim (unlock) instantly.
    soundManager.playCoin();
    unlockItem(item.id);
  }

  const items = SHOP_ITEMS.filter((i) => i.category === tab);

  return (
    <div className="friendly-page relative w-full min-h-screen bg-[#070e0a] overflow-x-hidden flex flex-col justify-between p-2 sm:p-6 select-none text-white">
      {/* Background Atmosphere */}
      <div
        className="fixed inset-0 pointer-events-none bg-cover bg-center opacity-40 mix-blend-luminosity"
        style={{ backgroundImage: "url('/assets/barnaby/barnaby-field.jpg')" }}
      />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.3)_0%,#040906_90%)]" />

      {/* Header */}
      <div className="relative z-20">
        <ArcadeHeader onOpenRules={() => setShowRules(true)} />
      </div>

      {/* Main Shop Arena */}
      <main className="relative z-10 w-full max-w-6xl mx-auto flex-1 mt-8 sm:mt-12 md:mt-14 mb-6 flex flex-col gap-5">
        {/* The "ARCADE BAZAAR" banner — title, blurb and the MY AVATARS shortcut — was removed; it ate
            a band of vertical space above the category tabs. My Avatars is in the arcade header's
            menu. The heading stays for screen readers. */}
        <h1 className="sr-only">Arcade Bazaar</h1>

        {/* Category Navigation Tabs */}
        <div className="w-full flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
          {[
            { key: "backgrounds", label: "🌄 BACKGROUNDS" },
            { key: "frames", label: "🖼️ 3D FRAMES" },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                soundManager.playClick();
                setTab(t.key as ShopTab);
              }}
              className={`px-4 sm:px-5 py-2.5 rounded-2xl font-title font-black text-xs sm:text-sm tracking-wider transition-all cursor-pointer border ${
                tab === t.key
                  ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.7)] scale-105"
                  : "bg-black/60 text-slate-300 border-slate-800 hover:border-amber-400/40"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Shop Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => {
            const isOwned = item.priceUsdt === 0 || unlockedItemIds.includes(item.id);
            const isEquipped =
              (item.category === "backgrounds" && backgroundId === item.id) ||
              (item.category === "frames" && frameId === item.id);

            const frameSkin = item.frameSkinId ? getAvatarFrame(item.frameSkinId) : null;

            return (
              <div
                key={item.id}
                className="relative rounded-3xl p-4 sm:p-5 bg-gradient-to-b from-[#192b20]/95 via-[#0e1a13]/98 to-[#060c08] border-2 border-amber-400/50 hover:border-amber-400 transition-all flex flex-col justify-between shadow-xl"
              >
                {/* Rarity & Ownership Tag */}
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-[10px] font-title font-black px-2.5 py-0.5 rounded-full uppercase shadow ${
                      item.rarity === "Mythic"
                        ? "bg-amber-400 text-slate-950"
                        : item.rarity === "Legendary"
                          ? "bg-emerald-400 text-slate-950"
                          : item.rarity === "Epic"
                            ? "bg-purple-400 text-slate-950"
                            : "bg-slate-700 text-white"
                    }`}
                  >
                    {item.rarity}
                  </span>

                  {isEquipped ? (
                    <span className="text-[10px] font-title font-black text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded-lg border border-emerald-400 flex items-center gap-1">
                      <Check size={12} /> EQUIPPED
                    </span>
                  ) : isOwned ? (
                    <span className="text-[10px] font-title font-black text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded-lg border border-cyan-400">
                      UNLOCKED
                    </span>
                  ) : (
                    <span className="text-[10px] font-title font-bold text-amber-300/90 bg-black/60 px-2 py-0.5 rounded-lg border border-amber-400/30 flex items-center gap-1">
                      <Sparkles size={10} /> FREE
                    </span>
                  )}
                </div>

                {/* Preview Box with High-Fidelity Renders */}
                <div className="w-full h-32 sm:h-36 rounded-2xl bg-black/70 border border-white/10 flex items-center justify-center relative overflow-hidden my-2 shadow-inner">
                  {item.previewType === "bg" ? (
                    <div className="relative w-24 h-24 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center border border-white/20">
                      <div className={`absolute inset-0 bg-gradient-to-br ${item.preview}`} />
                      <div className="relative z-10 w-16 h-16 rounded-xl bg-black/30 backdrop-blur-xs flex items-center justify-center border border-white/10">
                        <img
                          src="/assets/avatar-catalog/cow-v1/renders/cow_v1_base.webp"
                          alt="Avatar"
                          className="w-12 h-12 object-contain drop-shadow"
                        />
                      </div>
                    </div>
                  ) : item.previewType === "frame" && frameSkin ? (
                    /* Live 3D Frame Showcase wrapping around Champion Avatar */
                    <div className="relative w-24 h-24 rounded-2xl flex items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-950 to-slate-950 p-1">
                      <img
                        src="/assets/avatar-catalog/cow-v1/renders/cow_v1_base.webp"
                        alt="Champion in Frame"
                        className="w-16 h-16 object-contain rounded-xl drop-shadow"
                      />
                      {frameSkin.image ? (
                        <img
                          src={frameSkin.image}
                          alt={frameSkin.name}
                          className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"
                        />
                      ) : (
                        <div className={`absolute inset-0 z-10 rounded-2xl pointer-events-none ${frameSkin.className}`} />
                      )}
                    </div>
                  ) : null}
                </div>

                {/* Name & Description */}
                <div className="my-1.5">
                  <h3 className="font-title font-black text-sm sm:text-base text-white truncate">{item.name}</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-2">{item.description}</p>
                </div>

                {/* Buy / Equip Button */}
                <button
                  type="button"
                  onClick={() => handleBuyOrEquip(item)}
                  className={`w-full py-2.5 rounded-2xl font-title font-black text-xs uppercase tracking-wider transition-all mt-2 cursor-pointer flex items-center justify-center gap-2 shadow-lg ${
                    isEquipped
                      ? "bg-slate-900 text-slate-400 border border-slate-700 cursor-default"
                      : isOwned
                        ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 hover:brightness-110 active:scale-95"
                        : "bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 text-slate-950 hover:brightness-110 active:scale-95 border-2 border-amber-200"
                  }`}
                >
                  {isEquipped ? (
                    <span>CURRENTLY EQUIPPED</span>
                  ) : isOwned ? (
                    <span className="flex items-center gap-1.5"><Sparkles size={14} /> UNLOCKED · EQUIP</span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Sparkles size={14} /> CLAIM · FREE
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </main>

      <OfficialRulesModal
        isOpen={showRules}
        onClose={() => setShowRules(false)}
      />
      <AuthGateModal
        isOpen={showAuthGate}
        onClose={() => setShowAuthGate(false)}
        title="Marketplace Account Required"
        description="Sign in or create a free account to unlock rare avatars, frames, and tactical power packs — everything's free!"
        featureName="the Marketplace"
        redirectTo="/shop"
      />
    </div>
  );
}
