"use client";

import React from "react";
import { type AvatarConfig } from "../../stores/avatar-customization-store";
import { getAvatarVariant, isAvatarVariantId } from "../../lib/avatar-catalog";
import { getAvatarBackground, getAvatarFrame } from "../../lib/avatar-decorations";

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

  const frame = getAvatarFrame(frameId);
  const background = getAvatarBackground(bgId);

  return (
    <div
      className={`relative aspect-square overflow-hidden rounded-2xl sm:rounded-3xl select-none shrink-0 ${background.className} ${className}`}
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
          className="absolute inset-[6%] w-[88%] h-[88%] rounded-[18%] object-cover pointer-events-none shadow-[0_0_18px_rgba(0,0,0,.35)]"
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
      {frame.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={frame.image}
          alt="Battle Frame"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"
        />
      )}
      {!frame.image && frame.id !== "none" && (
        <div className={`pointer-events-none absolute inset-0 z-10 rounded-[inherit] ${frame.className}`} aria-hidden="true" />
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
