"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft, Glasses, HatGlasses, ShieldCheck, Sparkles, Lock, ShoppingBag, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AVATAR_CHARACTERS,
  AVATAR_VARIANTS,
  getAvatarVariant,
  resolveAvatarVariant,
  type AvatarCharacterId,
} from "../../lib/avatar-catalog";
import {
  AVATAR_BACKGROUNDS,
  AVATAR_FRAMES,
  type AvatarBackgroundId,
  type AvatarFrameId,
} from "../../lib/avatar-decorations";
import { soundManager } from "../../lib/soundManager";
import { useAvatarStore } from "../../stores/avatar-customization-store";
import { MasterAvatar } from "./MasterAvatar";

// Character base prices in Shop
const CHARACTER_PRICES: Record<AvatarCharacterId, number> = {
  champion: 0,
  daisy: 4.99,
  rusty: 4.99,
  nova: 5.99,
  luna: 5.99,
  moss: 4.99,
};

const ACCESSORY_PRICES = {
  glasses: 1.99,
  hat: 2.99,
};

const BACKGROUND_PRICES: Record<AvatarBackgroundId, number> = {
  emerald: 0,
  none: 0,
  golden: 1.99,
  cyber: 1.99,
  inferno: 1.99,
  obsidian: 1.99,
  aurora: 2.49,
  sunset: 2.49,
  ocean: 2.49,
  candy: 2.49,
  royal: 2.49,
  starlight: 2.49,
  meadow: 2.49,
  frost: 2.49,
  lava: 2.49,
  rainbow: 2.49,
};

const FRAME_PRICES: Record<AvatarFrameId, number> = {
  none: 0,
  mythic_gold: 0,
  neon_glacier: 2.99,
  inferno: 2.99,
  emerald: 2.49,
  sunset_gold: 3.49,
  ocean_pearl: 2.99,
  candy_pop: 2.49,
  royal_amethyst: 3.49,
  star_chrome: 3.49,
  forest_vine: 2.49,
  frost_crystal: 2.99,
  lava_core: 3.49,
  rainbow_arcade: 3.99,
  shadow_onyx: 2.99,
};

export function AvatarCatalogStudio() {
  const variantId = useAvatarStore((state) => state.variantId);
  const backgroundId = useAvatarStore((state) => state.backgroundId);
  const frameId = useAvatarStore((state) => state.frameId);
  const unlockedItemIds = useAvatarStore((state) => state.unlockedItemIds) || [];
  const setVariant = useAvatarStore((state) => state.setVariant);
  const setBackground = useAvatarStore((state) => state.setBackground);
  const setFrame = useAvatarStore((state) => state.setFrame);

  const current = getAvatarVariant(variantId);
  const [previewId, setPreviewId] = useState(current.id);
  const [previewBackgroundId, setPreviewBackgroundId] = useState<AvatarBackgroundId>(backgroundId);
  const [previewFrameId, setPreviewFrameId] = useState<AvatarFrameId>(frameId);
  const [finishTab, setFinishTab] = useState<"background" | "frame">("background");
  const preview = getAvatarVariant(previewId);

  const isEquipped =
    current.id === preview.id &&
    backgroundId === previewBackgroundId &&
    frameId === previewFrameId;

  useEffect(() => {
    setPreviewId(current.id);
    setPreviewBackgroundId(backgroundId);
    setPreviewFrameId(frameId);
  }, [backgroundId, current.id, frameId]);

  const selection = useMemo(
    () => ({ hasHat: preview.hasHat, hasGlasses: preview.hasGlasses }),
    [preview.hasHat, preview.hasGlasses],
  );
  const characterVariants = useMemo(
    () => AVATAR_VARIANTS.filter((variant) => variant.characterId === preview.characterId),
    [preview.characterId],
  );

  // Check ownership of preview items
  const isCharacterUnlocked =
    CHARACTER_PRICES[preview.characterId] === 0 ||
    unlockedItemIds.includes(preview.characterId);

  const isGlassesUnlocked =
    !selection.hasGlasses ||
    ACCESSORY_PRICES.glasses === 0 ||
    unlockedItemIds.includes("accessory_glasses");

  const isHatUnlocked =
    !selection.hasHat ||
    ACCESSORY_PRICES.hat === 0 ||
    unlockedItemIds.includes("accessory_hat");

  const isBackgroundUnlocked =
    BACKGROUND_PRICES[previewBackgroundId] === 0 ||
    unlockedItemIds.includes(previewBackgroundId);

  const isFrameUnlocked =
    FRAME_PRICES[previewFrameId] === 0 ||
    unlockedItemIds.includes(previewFrameId);

  const isVariantUnlocked =
    unlockedItemIds.includes(preview.id) ||
    (isCharacterUnlocked && isGlassesUnlocked && isHatUnlocked);

  // Check if anything in the current preview is locked
  const hasLockedItems =
    !isCharacterUnlocked ||
    (selection.hasGlasses && !isGlassesUnlocked) ||
    (selection.hasHat && !isHatUnlocked) ||
    !isBackgroundUnlocked ||
    !isFrameUnlocked;

  function changeCharacter(characterId: AvatarCharacterId) {
    const next = resolveAvatarVariant(characterId, selection.hasHat, selection.hasGlasses);
    setPreviewId(next.id);
    soundManager.playCardSelect();
  }

  function changeAccessory(kind: "hat" | "glasses") {
    const next = resolveAvatarVariant(
      preview.characterId,
      kind === "hat" ? !selection.hasHat : selection.hasHat,
      kind === "glasses" ? !selection.hasGlasses : selection.hasGlasses,
    );
    setPreviewId(next.id);
    soundManager.playToggle(kind === "hat" ? !selection.hasHat : !selection.hasGlasses);
  }

  function equip() {
    if (hasLockedItems) return;
    setVariant(preview.id);
    setBackground(previewBackgroundId);
    setFrame(previewFrameId);
    soundManager.playEquip();
  }

  function unequip() {
    // Reset to default base Champion look with clean background and no frame
    const baseDefault = resolveAvatarVariant("champion", false, false);
    setVariant(baseDefault.id);
    setBackground("emerald");
    setFrame("none");
    setPreviewId(baseDefault.id);
    setPreviewBackgroundId("emerald");
    setPreviewFrameId("none");
    soundManager.playClick();
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-1 py-3 text-white sm:px-5 sm:py-6">
      {/* Top Navigation & Info Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-3xl border border-amber-300/30 bg-black/70 p-3.5 backdrop-blur-xl sm:p-4 shadow-xl">
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <Link
            href="/home"
            onClick={() => soundManager.playNavigate()}
            className="flex min-h-11 items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 font-title text-sm font-black transition hover:bg-white/10 active:scale-95 cursor-pointer"
          >
            <ChevronLeft size={19} /> Back
          </Link>
          <div className="text-left sm:hidden">
            <h1 className="font-title text-lg font-black text-amber-300">My Avatars</h1>
            <p className="text-[10px] font-semibold text-white/65">Equip & Manage Wardrobe</p>
          </div>
        </div>

        {/* Center Title (Desktop) */}
        <div className="hidden sm:block text-center">
          <h1 className="font-title text-xl sm:text-2xl font-black text-amber-300 tracking-wide">
            My Avatars
          </h1>
          <p className="text-xs font-semibold text-slate-300">
            Equip your unlocked styles · Unlock premium items in the Arcade Shop
          </p>
        </div>

        {/* Shop Button Shortcut */}
        <Link
          href="/shop"
          onClick={() => soundManager.playNavigate()}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-title font-black text-xs sm:text-sm shadow-[0_0_15px_rgba(245,158,11,0.4)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
        >
          <ShoppingBag size={16} />
          <span>VISIT SHOP</span>
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,.95fr)]">
        {/* Left: 3D Mirror Live Avatar Preview */}
        <section className="relative overflow-hidden rounded-[2rem] border-2 border-amber-400/40 bg-[radial-gradient(circle_at_50%_20%,rgba(245,158,11,.24),transparent_42%),linear-gradient(155deg,#14251a,#07100b_70%)] p-4 shadow-2xl sm:p-6 flex flex-col justify-between">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 rounded-full bg-emerald-400 px-3 py-1 font-title text-xs font-black text-slate-950">
              <ShieldCheck size={14} /> 24 READY-MADE LOOKS
            </span>
            <div className="flex items-center gap-2">
              {hasLockedItems ? (
                <span className="flex items-center gap-1 text-xs font-title font-bold text-amber-300 bg-black/70 px-3 py-1 rounded-full border border-amber-400/40">
                  <Lock size={12} className="text-amber-400" /> LOCKED
                </span>
              ) : isEquipped ? (
                <span className="flex items-center gap-1 text-xs font-title font-bold text-emerald-300 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-400/40">
                  <Check size={12} /> CURRENTLY EQUIPPED
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-title font-bold text-cyan-300 bg-cyan-950/80 px-3 py-1 rounded-full border border-cyan-400/40">
                  READY TO EQUIP
                </span>
              )}
              <span className="font-title text-xs font-black text-amber-300">{preview.characterLabel}</span>
            </div>
          </div>

          <div className="relative mx-auto aspect-square w-full max-w-[440px] overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle,#173d27,#07110b_72%)] shadow-[inset_0_0_50px_rgba(0,0,0,.65)]">
            <AnimatePresence initial={false}>
              <motion.div
                key={`${preview.id}-${previewBackgroundId}-${previewFrameId}`}
                initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 1.04, rotate: 2 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                className="absolute inset-0"
              >
                <MasterAvatar
                  config={{ variantId: preview.id, backgroundId: previewBackgroundId, frameId: previewFrameId }}
                  className="h-full w-full rounded-[2rem]"
                />
              </motion.div>
            </AnimatePresence>
            <motion.div
              key={`${preview.id}-shine`}
              initial={{ x: "-160%" }}
              animate={{ x: "180%" }}
              transition={{ duration: 0.65, ease: "easeOut" }}
              className="pointer-events-none absolute inset-y-0 w-1/3 skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/10 to-transparent"
            />
          </div>

          {/* Quick info footer */}
          <div className="mt-3 text-center">
            <p className="text-[11px] font-medium text-slate-400">
              Select any unlocked items to equip or unequip them. Unowned items can be bought in the Shop.
            </p>
          </div>
        </section>

        {/* Right: Character, Accessories & Style Picker */}
        <section className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-black/70 p-4 shadow-2xl backdrop-blur-xl sm:p-6">
          {/* Step 1: Character Selector */}
          <div>
            <h2 className="font-title text-lg font-black text-amber-300">1. Pick a character</h2>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="Avatar characters">
            {AVATAR_CHARACTERS.map((character) => {
              const selected = preview.characterId === character.id;
              const charPrice = CHARACTER_PRICES[character.id];
              const isOwned = charPrice === 0 || unlockedItemIds.includes(character.id);

              return (
                <button
                  key={character.id}
                  type="button"
                  onClick={() => changeCharacter(character.id)}
                  aria-pressed={selected}
                  className={`group relative overflow-hidden rounded-2xl border-2 p-1.5 transition hover:-translate-y-1 active:scale-95 cursor-pointer ${
                    selected
                      ? "border-amber-300 bg-amber-300/15 shadow-[0_0_18px_rgba(251,191,36,.35)]"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden">
                    <img src={character.baseVariant.image} alt="" className="mx-auto aspect-square w-full rounded-xl object-cover" />
                    {!isOwned && (
                      <div className="absolute inset-0 bg-black/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-0.5">
                        <Lock size={16} className="text-amber-400 drop-shadow" />
                        <span className="text-[8px] font-title font-black text-amber-300 bg-black/90 px-1 rounded border border-amber-400/40">
                          SHOP
                        </span>
                      </div>
                    )}
                  </div>
                  <span className={`mt-1 block truncate bg-gradient-to-r ${character.accent} bg-clip-text font-title text-[11px] font-black text-transparent sm:text-xs`}>
                    {character.name}
                  </span>
                  {selected && (
                    <span className="absolute right-1 top-1 rounded-full bg-amber-300 p-1 text-slate-950 shadow">
                      <Check size={11} strokeWidth={4} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Step 2: Accessories Selector (Equip / Unequip on/off toggle) */}
          <h2 className="font-title text-lg font-black text-amber-300">2. Accessories (Equip / Unequip)</h2>

          <div className="grid grid-cols-2 gap-3">
            <AccessoryButton
              active={selection.hasGlasses}
              icon={<Glasses size={28} />}
              label="Glasses"
              isUnlocked={isGlassesUnlocked}
              onClick={() => changeAccessory("glasses")}
            />
            <AccessoryButton
              active={selection.hasHat}
              icon={<HatGlasses size={28} />}
              label="Cowboy hat"
              isUnlocked={isHatUnlocked}
              onClick={() => changeAccessory("hat")}
            />
          </div>

          {/* Style Variants Grid */}
          <div className="grid grid-cols-4 gap-2" aria-label={`${preview.characterLabel} styles`}>
            {characterVariants.map((variant) => {
              const selected = preview.id === variant.id;
              const isVarOwned =
                unlockedItemIds.includes(variant.id) ||
                (isCharacterUnlocked &&
                  (!variant.hasGlasses || isGlassesUnlocked) &&
                  (!variant.hasHat || isHatUnlocked));

              return (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => {
                    setPreviewId(variant.id);
                    soundManager.playCardSelect();
                  }}
                  aria-label={`Preview ${variant.label}`}
                  aria-pressed={selected}
                  className={`relative aspect-square overflow-hidden rounded-2xl border-2 bg-emerald-950/60 transition hover:-translate-y-1 active:scale-95 cursor-pointer ${
                    selected ? "border-amber-300 shadow-[0_0_18px_rgba(251,191,36,.45)]" : "border-white/10"
                  }`}
                >
                  <img src={variant.image} alt="" className="h-full w-full object-cover" />
                  {!isVarOwned && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-[1px] flex items-center justify-center">
                      <Lock size={16} className="text-amber-400 drop-shadow" />
                    </div>
                  )}
                  {selected && (
                    <span className="absolute right-1 top-1 rounded-full bg-amber-300 p-1 text-slate-950 shadow">
                      <Check size={12} strokeWidth={4} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Dynamic Action Buttons: Equip, Unequip, or Buy in Shop */}
          <div className="mt-auto flex flex-col sm:flex-row items-center gap-2.5">
            {hasLockedItems ? (
              <Link
                href="/shop"
                onClick={() => soundManager.playNavigate()}
                className="w-full flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 text-slate-950 px-5 font-title text-base font-black shadow-[0_0_25px_rgba(245,158,11,0.5)] hover:brightness-110 active:scale-[.98] transition cursor-pointer border-2 border-amber-200"
              >
                <Lock size={18} className="text-slate-950" />
                <span>LOCKED · UNLOCK IN SHOP</span>
              </Link>
            ) : isEquipped ? (
              <div className="w-full flex items-center gap-2">
                <button
                  type="button"
                  disabled
                  className="flex-1 min-h-14 flex items-center justify-center gap-2 rounded-2xl bg-emerald-600/90 text-slate-950 px-4 font-title text-base font-black shadow cursor-default"
                >
                  <Check size={20} strokeWidth={4} />
                  <span>EQUIPPED</span>
                </button>
                <button
                  type="button"
                  onClick={unequip}
                  className="px-5 min-h-14 flex items-center justify-center gap-1.5 rounded-2xl border-2 border-rose-500/60 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-title font-black text-xs transition active:scale-95 cursor-pointer"
                >
                  <X size={16} />
                  <span>UNEQUIP ALL</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={equip}
                className="w-full min-h-14 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500 hover:from-emerald-300 hover:to-green-300 text-slate-950 px-5 font-title text-base font-black shadow-[0_0_25px_rgba(52,211,153,0.5)] hover:scale-[1.02] active:scale-[.98] transition cursor-pointer border-2 border-emerald-200"
              >
                <Sparkles size={20} />
                <span>EQUIP THIS AVATAR</span>
              </button>
            )}
          </div>

          <p className="text-center text-xs font-semibold text-white/45">
            Tap items to toggle Equip / Unequip · Buy locked styles in the Shop
          </p>
        </section>
      </div>

      {/* Step 3: Finish Backgrounds & 3D Frames (Equip / Unequip) */}
      <section className="rounded-[2rem] border border-white/10 bg-black/70 p-4 shadow-2xl backdrop-blur-xl sm:p-6">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-title text-xl font-black text-amber-300">3. Backgrounds & 3D Frames (Equip / Unequip)</h2>
            <p className="text-xs text-slate-400">Tap an equipped background or frame to unequip it</p>
          </div>
          <div className="grid grid-cols-2 rounded-2xl bg-white/5 p-1">
            <FinishTabButton
              active={finishTab === "background"}
              onClick={() => setFinishTab("background")}
              label="Backgrounds"
              count="10+"
            />
            <FinishTabButton
              active={finishTab === "frame"}
              onClick={() => setFinishTab("frame")}
              label="3D Frames"
              count="10+"
            />
          </div>
        </div>

        {finishTab === "background" ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8" aria-label="Avatar backgrounds">
            {AVATAR_BACKGROUNDS.map((item) => {
              const active = previewBackgroundId === item.id;
              const bgPrice = BACKGROUND_PRICES[item.id] ?? 1.99;
              const isOwned = bgPrice === 0 || unlockedItemIds.includes(item.id);

              return (
                <DecorationButton
                  key={item.id}
                  active={active}
                  label={item.name}
                  isUnlocked={isOwned}
                  onClick={() => {
                    // If already active, toggle/unequip to none, else select
                    if (active && item.id !== "none") {
                      setPreviewBackgroundId("none");
                    } else {
                      setPreviewBackgroundId(item.id);
                    }
                    soundManager.playCardSelect();
                  }}
                >
                  <span className={`h-10 w-10 rounded-full bg-gradient-to-br ${item.previewClass} shadow-inner`} />
                </DecorationButton>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8" aria-label="Avatar frames">
            {AVATAR_FRAMES.map((item) => {
              const active = previewFrameId === item.id;
              const frPrice = FRAME_PRICES[item.id] ?? 2.49;
              const isOwned = frPrice === 0 || unlockedItemIds.includes(item.id);

              return (
                <DecorationButton
                  key={item.id}
                  active={active}
                  label={item.name}
                  isUnlocked={isOwned}
                  onClick={() => {
                    // If already active, toggle/unequip to none, else select
                    if (active && item.id !== "none") {
                      setPreviewFrameId("none");
                    } else {
                      setPreviewFrameId(item.id);
                    }
                    soundManager.playCardSelect();
                  }}
                >
                  <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900/90 overflow-hidden p-0.5 shadow-inner">
                    <img
                      src="/assets/avatar-catalog/cow-v1/renders/cow_v1_base.webp"
                      alt="Avatar"
                      className="h-7 w-7 object-contain rounded-md drop-shadow"
                    />
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="absolute inset-0 h-full w-full object-contain pointer-events-none z-10"
                      />
                    ) : (
                      <div className={`absolute inset-0 rounded-xl pointer-events-none ${item.previewClass}`} />
                    )}
                  </span>
                </DecorationButton>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function FinishTabButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 whitespace-nowrap rounded-xl px-3 font-title text-xs font-black transition active:scale-95 cursor-pointer sm:px-4 ${
        active ? "bg-amber-300 text-slate-950 shadow" : "text-white/60 hover:text-white"
      }`}
    >
      {label} <span className="ml-1 text-[9px] opacity-70">{count}</span>
    </button>
  );
}

function DecorationButton({
  active,
  label,
  isUnlocked,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  isUnlocked: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border-2 px-2 transition hover:-translate-y-1 active:scale-95 cursor-pointer ${
        active
          ? "border-amber-300 bg-amber-300/15 shadow-[0_0_16px_rgba(251,191,36,.3)]"
          : "border-white/10 bg-white/5 hover:border-white/20"
      }`}
    >
      <div className="relative">
        {children}
        {!isUnlocked && (
          <div className="absolute inset-0 bg-black/70 rounded-full flex items-center justify-center backdrop-blur-[1px]">
            <Lock size={12} className="text-amber-400 drop-shadow" />
          </div>
        )}
      </div>
      <div className="flex flex-col items-center">
        <span className="truncate font-title text-[10px] font-black text-white/80">{label}</span>
        {!isUnlocked && (
          <span className="text-[8px] font-title font-bold text-amber-300/90">LOCKED</span>
        )}
      </div>
      {active && (
        <span className="absolute right-1 top-1 rounded-full bg-emerald-400 p-0.5 text-slate-950 shadow">
          <Check size={10} strokeWidth={4} />
        </span>
      )}
    </button>
  );
}

function AccessoryButton({
  active,
  icon,
  label,
  isUnlocked,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  isUnlocked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative flex min-h-28 flex-col items-center justify-center gap-2 rounded-3xl border-2 font-title font-black transition hover:-translate-y-1 active:scale-95 cursor-pointer ${
        active
          ? "border-emerald-400 bg-emerald-400/15 text-emerald-300 shadow-[0_0_22px_rgba(52,211,153,.25)]"
          : "border-white/10 bg-white/5 text-white/70 hover:border-white/25"
      }`}
    >
      {active ? (
        <span className="absolute right-2 top-2 rounded-full bg-emerald-400 p-1 text-slate-950 shadow">
          <Check size={13} strokeWidth={4} />
        </span>
      ) : null}
      {!isUnlocked && (
        <span className="absolute left-2 top-2 rounded-full bg-black/80 border border-amber-400/40 px-2 py-0.5 text-[9px] font-title font-bold text-amber-300 flex items-center gap-1">
          <Lock size={10} /> LOCKED
        </span>
      )}
      {icon}
      <span>{label}</span>
      <span className={`text-[10px] uppercase font-bold tracking-wide ${active ? "text-emerald-400" : "opacity-60"}`}>
        {active ? "Equipped" : "Unequipped"}
      </span>
    </button>
  );
}
