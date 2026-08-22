"use client";

import React, { useState } from "react";
import { ShoppingBag, Sparkles, Crown, Zap, Shield, RotateCcw, Moon, Check, Coins, Gem, Star, Palette } from "lucide-react";
import { ArcadeHeader } from "../../components/dune/ArcadeHeader";
import { ArcadeDrawerMenu } from "../../components/dune/ArcadeDrawerMenu";
import { OfficialRulesModal } from "../../components/dune/OfficialRulesModal";
import { AuthGateModal } from "../../components/dune/AuthGateModal";
import { useAuthStore } from "../../stores/auth-store";
import { useAvatarStore, type AvatarConfig } from "../../stores/avatar-customization-store";
import { soundManager } from "../../lib/soundManager";

type ShopTab = "skins" | "frames" | "skills" | "vault";

interface ShopItem {
  id: string;
  name: string;
  category: ShopTab;
  rarity: "Common" | "Epic" | "Mythic" | "Legendary";
  price: number;
  currency: "coins" | "gems";
  preview: string;
  description: string;
  unlocked?: boolean;
}

const SHOP_ITEMS: ShopItem[] = [
  // Skins
  { id: "golden_emperor", name: "Golden Emperor Bull", category: "skins", rarity: "Mythic", price: 1500, currency: "coins", preview: "/assets/Avatar1/avatar.png", description: "Legendary gilded monarch bull with sovereign radiance.", unlocked: true },
  { id: "base_bull", name: "Classic Varsity Bull", category: "skins", rarity: "Common", price: 0, currency: "coins", preview: "/assets/Simple Avatar no background.png", description: "The iconic Barnaby varsity athlete bull.", unlocked: true },
  { id: "barnaby", name: "Barnaby Pasture Master", category: "skins", rarity: "Epic", price: 750, currency: "coins", preview: "/assets/barnaby/barnaby-field.jpg", description: "The fearless captain of the 31 counting pasture." },
  
  // Frames
  { id: "mythic_gold", name: "Sovereign Gold Crest", category: "frames", rarity: "Mythic", price: 1000, currency: "coins", preview: "border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.8)]", description: "Forged from pure pasture gold with radiant corner gems." },
  { id: "neon_glacier", name: "Neon Glacier Frame", category: "frames", rarity: "Epic", price: 500, currency: "coins", preview: "border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.7)]", description: "Sub-zero frozen crystal border with icy pulsations." },
  { id: "inferno", name: "Infernal Volcano Crest", category: "frames", rarity: "Epic", price: 600, currency: "coins", preview: "border-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.7)]", description: "Molten volcanic rock border with burning ember particles." },

  // Skills
  { id: "skill_rewind", name: "Chrono Rewind Pack (x5)", category: "skills", rarity: "Epic", price: 300, currency: "coins", preview: "🔄 -2 STEPS", description: "Rewinds live counter by 2 digits during tough countdowns." },
  { id: "skill_turbo", name: "Turbo Leap Pack (x5)", category: "skills", rarity: "Epic", price: 300, currency: "coins", preview: "⚡ +3 LEAP", description: "Instantly leaps forward +3 numbers in a surprise rush." },
  { id: "skill_shield", name: "Bovine Barrier (x5)", category: "skills", rarity: "Legendary", price: 450, currency: "coins", preview: "🛡️ SHIELD", description: "Grants Divine Shield immunity for 1 turn against blunders." },
  { id: "skill_snooze", name: "Pasture Snooze (x5)", category: "skills", rarity: "Legendary", price: 500, currency: "coins", preview: "🌙 SKIP", description: "Safely passes turn to the next player without picking cards." },

  // Vault
  { id: "vault_1", name: "Handful of Gold (500 Coins)", category: "vault", rarity: "Common", price: 5, currency: "gems", preview: "🪙 500", description: "Starter coin stash for pasture brawlers." },
  { id: "vault_2", name: "Barnaby Chest (2,500 Coins)", category: "vault", rarity: "Epic", price: 20, currency: "gems", preview: "🪙 2,500", description: "Heavy wooden chest packed with arcade gold." },
  { id: "vault_3", name: "Royal Bull Vault (10,000 Coins)", category: "vault", rarity: "Mythic", price: 60, currency: "gems", preview: "🪙 10,000", description: "Grand treasury of royal pasture coins with 20% bonus." },
];

export default function ShopPage() {
  const [tab, setTab] = useState<ShopTab>("skins");
  const [showDrawer, setShowDrawer] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);

  const avatar = useAvatarStore();
  const setSkin = useAvatarStore((s) => s.setSkin);
  const setFrame = useAvatarStore((s) => s.setFrame);

  const [coins, setCoins] = useState(1250);
  const [gems, setGems] = useState(50);
  const [purchasedIds, setPurchasedIds] = useState<string[]>(["golden_emperor", "base_bull", "mythic_gold"]);

  function handleBuyOrEquip(item: ShopItem) {
    soundManager.playClick();

    // Guest protection: prompt account creation on purchases
    if (!accessToken && item.price > 0 && !purchasedIds.includes(item.id)) {
      setShowAuthGate(true);
      return;
    }

    const isPurchased = purchasedIds.includes(item.id);

    if (isPurchased) {
      if (item.category === "skins") {
        setSkin(item.id as AvatarConfig["skinId"]);
      } else if (item.category === "frames") {
        setFrame(item.id as AvatarConfig["frameId"]);
      }
      return;
    }

    // Purchase
    if (item.currency === "coins" && coins >= item.price) {
      setCoins((c) => c - item.price);
      setPurchasedIds((prev) => [...prev, item.id]);
    } else if (item.currency === "gems" && gems >= item.price) {
      setGems((g) => g - item.price);
      setPurchasedIds((prev) => [...prev, item.id]);
    }
  }

  const items = SHOP_ITEMS.filter((i) => i.category === tab);

  return (
    <div className="friendly-page relative w-full min-h-screen bg-[#070e0a] overflow-x-hidden flex flex-col justify-between p-2 sm:p-6 select-none text-white">
      {/* Background Pasture Atmosphere */}
      <div
        className="fixed inset-0 pointer-events-none bg-cover bg-center opacity-40 mix-blend-luminosity"
        style={{ backgroundImage: "url('/assets/barnaby/barnaby-field.jpg')" }}
      />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.3)_0%,#040906_90%)]" />

      {/* Header */}
      <div className="relative z-20">
        <ArcadeHeader onMenuClick={() => setShowDrawer(true)} />
      </div>

      {/* Main Shop Arena - WITH DEDICATED TOP CLEARANCE (Zero Overlap) */}
      <main className="relative z-10 w-full max-w-6xl mx-auto flex-1 mt-8 sm:mt-12 md:mt-14 mb-6 flex flex-col gap-5">
        {/* Top Shop Banner: Live Currency Vault */}
        <div className="w-full bg-gradient-to-r from-amber-950/95 via-[#132019]/95 to-amber-950/95 border-2 sm:border-3 border-amber-400/80 rounded-3xl p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-300 shadow">
              <ShoppingBag size={24} />
            </div>
            <div>
              <h1 className="font-title font-black text-2xl sm:text-3xl text-amber-300 tracking-wide">
                ARCADE BAZAAR
              </h1>
              <p className="text-xs text-slate-300">
                Unlock mythical skins, golden frames, and tactical battle powers!
              </p>
            </div>
          </div>

          {/* Currency Badges */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/70 border border-amber-400/60 shadow">
              <Coins size={18} className="text-yellow-400 fill-yellow-400 animate-pulse" />
              <span className="font-title font-black text-base text-amber-300">{coins.toLocaleString()}</span>
              <span className="text-[10px] font-title font-bold text-slate-400">COINS</span>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/70 border border-cyan-400/60 shadow">
              <Gem size={18} className="text-cyan-400 fill-cyan-400" />
              <span className="font-title font-black text-base text-cyan-300">{gems}</span>
              <span className="text-[10px] font-title font-bold text-slate-400">GEMS</span>
            </div>
          </div>
        </div>

        {/* Category Navigation Tabs */}
        <div className="w-full flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
          {[
            { key: "skins", label: "👑 AVATARS & SKINS" },
            { key: "frames", label: "🖼️ 3D METALLIC FRAMES" },
            { key: "skills", label: "🔮 SKILLS" },
            { key: "vault", label: "💰 COIN VAULT" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => {
                soundManager.playClick();
                setTab(t.key as ShopTab);
              }}
              className={`px-4 sm:px-6 py-2.5 rounded-2xl font-title font-black text-xs sm:text-sm tracking-wider transition-all cursor-pointer border ${
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const isOwned = purchasedIds.includes(item.id);
            const isEquipped =
              (item.category === "skins" && avatar.skinId === item.id) ||
              (item.category === "frames" && avatar.frameId === item.id);

            return (
              <div
                key={item.id}
                className="relative rounded-3xl p-5 bg-gradient-to-b from-[#192b20]/95 via-[#0e1a13]/98 to-[#060c08] border-2 border-amber-400/50 hover:border-amber-400 transition-all flex flex-col justify-between shadow-xl"
              >
                {/* Rarity & Ownership Tag */}
                <div className="flex items-center justify-between mb-3">
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
                      OWNED
                    </span>
                  ) : null}
                </div>

                {/* Preview Box */}
                <div className="w-full h-32 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-center relative overflow-hidden my-2 shadow-inner">
                  {item.category === "skins" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.preview} alt={item.name} className="h-28 object-contain drop-shadow-xl" />
                  ) : item.category === "frames" ? (
                    <div className={`w-20 h-20 rounded-2xl border-3 bg-emerald-950/40 flex items-center justify-center ${item.preview}`}>
                      <Palette size={24} className="text-amber-300" />
                    </div>
                  ) : (
                    <span className="font-title font-black text-2xl text-amber-300 tracking-wider">
                      {item.preview}
                    </span>
                  )}
                </div>

                {/* Name & Description */}
                <div className="my-2">
                  <h3 className="font-title font-black text-base text-white">{item.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-snug">{item.description}</p>
                </div>

                {/* Buy / Equip Button */}
                <button
                  onClick={() => handleBuyOrEquip(item)}
                  className={`w-full py-2.5 rounded-2xl font-title font-black text-xs uppercase tracking-wider transition-all mt-2 cursor-pointer flex items-center justify-center gap-1.5 shadow-lg ${
                    isEquipped
                      ? "bg-slate-900 text-slate-400 border border-slate-700 cursor-default"
                      : isOwned
                        ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 hover:brightness-110 active:scale-95"
                        : "bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 hover:brightness-110 active:scale-95"
                  }`}
                >
                  {isEquipped ? (
                    <span>CURRENTLY EQUIPPED</span>
                  ) : isOwned ? (
                    <span>EQUIP ITEM</span>
                  ) : (
                    <>
                      <span>UNLOCK FOR {item.price} {item.currency === "coins" ? "🪙" : "💎"}</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </main>

      {/* Drawer & Modals */}
      <ArcadeDrawerMenu
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        onOpenRules={() => setShowRules(true)}
      />
      <OfficialRulesModal
        isOpen={showRules}
        onClose={() => setShowRules(false)}
      />
      <AuthGateModal
        isOpen={showAuthGate}
        onClose={() => setShowAuthGate(false)}
        title="Marketplace Account Required"
        description="Sign in or create an account to unlock rare skins, frames, and power-up packs with your coins & gems!"
        featureName="the Marketplace"
        redirectTo="/shop"
      />
    </div>
  );
}
