"use client";

import { useMemo } from "react";
import { createAvatar } from "@dicebear/core";
import { avataaars } from "@dicebear/collection";

// A full-body cartoon avatar: the illustrated head + torso comes from the Avataaars library (the
// open Bitmoji-style system), composited with matching legs + shoes so the figure is full-body.
// Everything is driven by the user's saved cosmetics, so the same figure appears on the player
// card, in the Shop creator (live), and in Settings.

export interface AvatarConfig {
  top: string;
  hairColor: string;
  skin: string;
  eyes: string;
  eyebrows: string;
  mouth: string;
  clothing: string;
  clothesColor: string;
  facialHair: string; // "none" | avataaars value
  facialHairColor: string;
  glasses: string; // "none" | avataaars accessory
  pants: string;
  shoeStyle: "sneakers" | "boots";
  shoeColor: string;
}

// ---- Option catalogs (hex colours are WITHOUT the leading #, per Avataaars) -------------------
export const TOPS = [
  "shortFlat", "shortRound", "shortWaved", "shortCurly", "theCaesar", "shaggy", "shaggyMullet",
  "dreads01", "dreads02", "frizzle", "curly", "curvy", "bob", "bun", "longButNotTooLong",
  "miaWallace", "straight01", "straight02", "fro", "froBand", "sides", "bigHair",
];
export const HAIR_COLORS = ["2c1b18", "4a312c", "724133", "a55728", "b58143", "d6b370", "e8e1e1", "f59797", "d94f8a", "8a4bd4", "c93305", "5199e4"];
export const SKIN_TONES = ["ffdbb4", "f2d3b1", "edb98a", "fd9841", "d08b5b", "ae5d29", "614335"];
export const EYES = ["default", "happy", "wink", "squint", "surprised", "hearts", "side", "closed", "winkWacky", "xDizzy", "cry", "eyeRoll"];
export const EYEBROWS = ["default", "defaultNatural", "flatNatural", "raisedExcited", "raisedExcitedNatural", "angry", "angryNatural", "sadConcerned", "upDown", "frownNatural"];
export const MOUTHS = ["smile", "default", "twinkle", "serious", "tongue", "grimace", "eating", "disbelief", "sad", "screamOpen"];
export const FACIAL_HAIR = ["none", "beardLight", "beardMedium", "beardMajestic", "moustacheFancy", "moustacheMagnum"];
export const GLASSES = ["none", "round", "prescription01", "prescription02", "sunglasses", "wayfarers", "kurt", "eyepatch"];
export const CLOTHING = ["hoodie", "shirtCrewNeck", "shirtVNeck", "shirtScoopNeck", "collarAndSweater", "blazerAndShirt", "blazerAndSweater", "graphicShirt", "overall"];
export const CLOTHES_COLORS = ["5199e4", "25557c", "262e33", "65c9ff", "929598", "a7ffc4", "b1e2ff", "ff488e", "ff5c5c", "ffafb9", "ffffff", "3c4f5c", "e6e6e6", "ffdc5e"];
export const PANTS_COLORS = ["2f3a4a", "39304f", "1c1c28", "5a3a2e", "2e4d3a", "44403c", "6b3f6b"];
export const SHOE_STYLES: ("sneakers" | "boots")[] = ["sneakers", "boots"];
export const SHOE_COLORS = ["ffffff", "222222", "ff5252", "3d7bff", "f4b942", "5adc8c", "8a4bd4"];

export const DEFAULT_AVATAR: AvatarConfig = {
  top: "shortFlat", hairColor: "2c1b18", skin: "f2d3b1", eyes: "default", eyebrows: "default", mouth: "smile",
  clothing: "hoodie", clothesColor: "5199e4", facialHair: "none", facialHairColor: "2c1b18", glasses: "none",
  pants: "2f3a4a", shoeStyle: "sneakers", shoeColor: "ffffff",
};

function cfgOf(c?: Partial<AvatarConfig>): AvatarConfig {
  return { ...DEFAULT_AVATAR, ...(c ?? {}) };
}

// Avataaars colours are 6-digit hex WITHOUT a leading '#'. Be tolerant of older saved values that
// stored '#rrggbb'.
function hx(v: string | undefined, fallback: string): string {
  const s = (v ?? "").replace(/^#/, "");
  return /^[0-9a-fA-F]{6}$/.test(s) ? s : fallback;
}

// Build the Avataaars head+torso options from our config.
function avataaarsOptions(c: AvatarConfig) {
  const hasBeard = c.facialHair && c.facialHair !== "none";
  const hasGlasses = c.glasses && c.glasses !== "none";
  return {
    seed: "wm",
    flip: false,
    style: ["default"] as const,
    backgroundColor: [] as string[],
    top: [c.top],
    hairColor: [hx(c.hairColor, "2c1b18")],
    skinColor: [hx(c.skin, "f2d3b1")],
    eyes: [c.eyes],
    eyebrows: [c.eyebrows],
    mouth: [c.mouth],
    clothing: [c.clothing],
    clothesColor: [hx(c.clothesColor, "5199e4")],
    clothingGraphic: ["skull"],
    facialHair: hasBeard ? [c.facialHair] : [],
    facialHairProbability: hasBeard ? 100 : 0,
    facialHairColor: [hx(c.facialHairColor || c.hairColor, "2c1b18")],
    accessories: hasGlasses ? [c.glasses] : [],
    accessoriesProbability: hasGlasses ? 100 : 0,
  };
}

function headDataUri(c: AvatarConfig): string {
  // Our option arrays are plain string[]; DiceBear's types want narrow unions but accept them at
  // runtime. Cast through `never` to satisfy the compiler without using `any`.
  return createAvatar(avataaars, avataaarsOptions(c) as never).toDataUri();
}

// The avatar is shown as a clean head-and-shoulders bust (like a Snapchat profile avatar) — no
// legs. (pants / shoe config are kept in the type for later but not rendered.)
export function Avatar({ config, className }: { config?: Partial<AvatarConfig>; className?: string }) {
  const c = cfgOf(config);
  const uri = useMemo(() => headDataUri(c), [JSON.stringify(c)]);
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={className} src={uri} alt="Player avatar" />;
}

// Head-only thumbnail for the shop pickers (isolated <img>, no id collisions).
export function AvatarThumb({ config, size = 56 }: { config?: Partial<AvatarConfig>; size?: number }) {
  const c = cfgOf(config);
  const uri = useMemo(() => headDataUri(c), [JSON.stringify(c)]);
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={uri} alt="" width={size} height={size} style={{ display: "block" }} />;
}
