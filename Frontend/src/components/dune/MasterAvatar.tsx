"use client";

import React from "react";
import { type AvatarConfig } from "../../stores/avatar-customization-store";
import { getAvatarVariant, isAvatarVariantId } from "../../lib/avatar-catalog";

interface MasterAvatarProps {
  config?: Partial<AvatarConfig>;
  className?: string;
  size?: number | string;
  showLevel?: boolean;
  level?: number;
  showRarity?: boolean;
  rarityText?: string;
  rarityColor?: string;
}

const BG_GRADIENTS: Record<string, string> = {
  emerald: "bg-gradient-to-b from-[#0e2a1b] via-[#08170e] to-[#040c07]",
  golden: "bg-gradient-to-b from-[#3a2806] via-[#1a1203] to-[#0a0701]",
  cyber: "bg-gradient-to-b from-[#0a1f2e] via-[#040e16] to-[#010508]",
  inferno: "bg-gradient-to-b from-[#350d14] via-[#170508] to-[#0a0203]",
  obsidian: "bg-gradient-to-b from-[#161616] via-[#0a0a0a] to-[#000000]",
  none: "bg-transparent",
};

const FRAME_PATHS: Record<string, string> = {
  mythic_gold: "/assets/master/frame_mythic_gold_1024.png",
  neon_glacier: "/assets/master/frame_neon_glacier_1024.png",
  inferno: "/assets/master/frame_inferno_1024.png",
  emerald: "/assets/master/frame_emerald_1024.png",
  none: "",
};

export function MasterAvatar({
  config,
  className = "w-full h-full",
  size,
  showLevel = false,
  level = 12,
  showRarity = false,
  rarityText = "Mythic",
  rarityColor = "#f59e0b",
}: MasterAvatarProps) {
  const skinId = config?.skinId ?? "base_bull";
  const bgId = config?.backgroundId ?? "emerald";
  const frameId = config?.frameId ?? "mythic_gold";
  const hasGlasses = config?.hasGlasses ?? true;
  const hasMustache = config?.hasMustache ?? true;
  const hasCrown = config?.hasCrown ?? true;
  const catalogVariant = isAvatarVariantId(config?.variantId) ? getAvatarVariant(config.variantId) : null;

  const isPlainBull = skinId === "base_bull";
  const isEmperor = skinId === "golden_emperor";
  const isBarnaby = skinId === "barnaby";

  const frameSrc = FRAME_PATHS[frameId] ?? FRAME_PATHS.mythic_gold;
  const bgClass = BG_GRADIENTS[bgId] ?? BG_GRADIENTS.emerald;

  return (
    <div
      className={`relative aspect-square overflow-hidden rounded-2xl sm:rounded-3xl select-none shrink-0 ${bgClass} ${className}`}
      style={size ? { width: size, height: size } : undefined}
    >
      {/* Layer 0: Background Radial Glow */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.18)_0%,transparent_70%)]" />

      {/* Layer 1: Base Character Skin */}
      {catalogVariant && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={catalogVariant.image}
          alt={catalogVariant.label}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />
      )}
      {isPlainBull && !catalogVariant && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/assets/master/base_bull_1024.png"
          alt="Base Bull"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />
      )}
      {isEmperor && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/assets/Avatar1"
          alt="The Golden Emperor"
          className="absolute inset-0 w-full h-full object-cover object-top pointer-events-none"
        />
      )}
      {isBarnaby && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/assets/barnaby/barnaby-field.jpg"
          alt="Barnaby Mascot"
          className="absolute inset-0 w-full h-full object-cover object-top pointer-events-none"
        />
      )}

      {/* Layer 2: Mustache (Only on customizable Plain Bull) */}
      {isPlainBull && !catalogVariant && hasMustache && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/assets/master/mustache_1024.png"
          alt="Mustache"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
        />
      )}

      {/* Layer 3: Glasses (Only on customizable Plain Bull) */}
      {isPlainBull && !catalogVariant && hasGlasses && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/assets/master/glasses_1024.png"
          alt="Glasses"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]"
        />
      )}

      {/* Layer 4: Crown (Only on customizable Plain Bull) */}
      {isPlainBull && !catalogVariant && hasCrown && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/assets/master/crown_1024.png"
          alt="Crown"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-[0_6px_12px_rgba(0,0,0,0.9)]"
        />
      )}

      {/* Layer 5: Master Outer Battle Frame */}
      {frameSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={frameSrc}
          alt="Battle Frame"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"
        />
      )}

      {/* Optional Level Badge */}
      {showLevel && (
        <span className="absolute bottom-1.5 left-1.5 text-[9px] font-title font-black bg-emerald-500 text-slate-950 px-1.5 py-0.2 rounded-md border border-white shadow-lg z-20">
          Lv.{level}
        </span>
      )}

      {/* Optional Rarity Badge */}
      {showRarity && (
        <span
          className="absolute top-1.5 right-1.5 text-[8px] font-title font-black text-white px-1.5 py-0.2 rounded-md shadow-lg z-20"
          style={{ backgroundColor: rarityColor }}
        >
          {rarityText}
        </span>
      )}
    </div>
  );
}
