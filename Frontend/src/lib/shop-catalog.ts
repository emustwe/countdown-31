import { AVATAR_VARIANTS, type AvatarVariantId } from "./avatar-catalog";
import {
  AVATAR_BACKGROUNDS,
  AVATAR_FRAMES,
  type AvatarBackgroundId,
  type AvatarFrameId,
} from "./avatar-decorations";

export type ShopCategory = "avatars" | "backgrounds" | "frames" | "skills";
export type ShopRarity = "Starter" | "Rare" | "Epic" | "Legendary";

export interface ShopCatalogItem {
  key: string;
  id: string;
  name: string;
  category: ShopCategory;
  rarity: ShopRarity;
  description: string;
  image?: string;
  previewClass?: string;
  previewText?: string;
}

export const variantItemKey = (id: AvatarVariantId) => `avatar:variant:${id}`;
export const backgroundItemKey = (id: AvatarBackgroundId) => `avatar:background:${id}`;
export const frameItemKey = (id: AvatarFrameId) => `avatar:frame:${id}`;

export const STARTER_ITEM_KEYS = new Set([
  variantItemKey("cow_v1_base"),
  backgroundItemKey("emerald"),
  backgroundItemKey("none"),
  frameItemKey("mythic_gold"),
  frameItemKey("none"),
]);

function avatarRarity(item: (typeof AVATAR_VARIANTS)[number]): ShopRarity {
  if (item.id === "cow_v1_base") return "Starter";
  if (item.hasHat && item.hasGlasses) return "Legendary";
  if (item.hasHat || item.hasGlasses) return "Epic";
  return "Rare";
}

export const SHOP_CATALOG: readonly ShopCatalogItem[] = [
  ...AVATAR_VARIANTS.map((item) => ({
    key: variantItemKey(item.id),
    id: item.id,
    name: `${item.characterLabel} · ${item.shortLabel}`,
    category: "avatars" as const,
    rarity: avatarRarity(item),
    description: `${item.label}, delivered as a finished and approved avatar image.`,
    image: item.image,
  })),
  ...AVATAR_BACKGROUNDS.map((item) => ({
    key: backgroundItemKey(item.id),
    id: item.id,
    name: `${item.name} Background`,
    category: "backgrounds" as const,
    rarity: STARTER_ITEM_KEYS.has(backgroundItemKey(item.id))
      ? ("Starter" as const)
      : item.isNew
        ? ("Epic" as const)
        : ("Rare" as const),
    description: `A ${item.name.toLowerCase()} scene for your player card.`,
    previewClass: item.previewClass,
  })),
  ...AVATAR_FRAMES.map((item) => ({
    key: frameItemKey(item.id),
    id: item.id,
    name: `${item.name} Frame`,
    category: "frames" as const,
    rarity: STARTER_ITEM_KEYS.has(frameItemKey(item.id))
      ? ("Starter" as const)
      : item.isNew
        ? ("Legendary" as const)
        : ("Epic" as const),
    description: `A collectible ${item.name.toLowerCase()} border for your avatar.`,
    image: item.image,
    previewClass: item.previewClass,
  })),
  {
    key: "skill:rewind",
    id: "rewind",
    name: "Chrono Rewind Pack",
    category: "skills",
    rarity: "Epic",
    description: "Five Step Back uses for skill-mode matches.",
    previewText: "↶  -2 STEPS",
  },
  {
    key: "skill:turbo",
    id: "turbo",
    name: "Turbo Leap Pack",
    category: "skills",
    rarity: "Epic",
    description: "Five Jump Ahead uses for skill-mode matches.",
    previewText: "⚡  +3 LEAP",
  },
  {
    key: "skill:shield",
    id: "shield",
    name: "Bovine Barrier Pack",
    category: "skills",
    rarity: "Legendary",
    description: "Five immunity shields for critical turns.",
    previewText: "⬡  SHIELD",
  },
  {
    key: "skill:snooze",
    id: "snooze",
    name: "Pasture Snooze Pack",
    category: "skills",
    rarity: "Legendary",
    description: "Five safe turn skips for tactical play.",
    previewText: "☾  SKIP",
  },
];

export function isStarterItem(key: string): boolean {
  return STARTER_ITEM_KEYS.has(key);
}
