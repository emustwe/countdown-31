import catalogManifest from "../../public/assets/avatar-catalog/cow-v1/manifest.json";

export const AVATAR_CHARACTER_IDS = ["champion", "daisy", "rusty", "nova"] as const;
export type AvatarCharacterId = (typeof AVATAR_CHARACTER_IDS)[number];

export const AVATAR_VARIANT_IDS = [
  "cow_v1_base",
  "cow_v1_glasses",
  "cow_v1_cowboy",
  "cow_v1_cowboy_glasses",
  "daisy_v1_base",
  "daisy_v1_glasses",
  "daisy_v1_cowboy",
  "daisy_v1_cowboy_glasses",
  "rusty_v1_base",
  "rusty_v1_glasses",
  "rusty_v1_cowboy",
  "rusty_v1_cowboy_glasses",
  "nova_v1_base",
  "nova_v1_glasses",
  "nova_v1_cowboy",
  "nova_v1_cowboy_glasses",
] as const;

export type AvatarVariantId = (typeof AVATAR_VARIANT_IDS)[number];

export interface AvatarVariant {
  id: AvatarVariantId;
  characterId: AvatarCharacterId;
  characterLabel: string;
  label: string;
  shortLabel: string;
  image: string;
  hasGlasses: boolean;
  hasHat: boolean;
}

export interface AvatarCharacter {
  id: AvatarCharacterId;
  name: string;
  tagline: string;
  accent: string;
  baseVariant: AvatarVariant;
}

const CHARACTER_DETAILS: Record<AvatarCharacterId, Omit<AvatarCharacter, "id" | "baseVariant">> = {
  champion: { name: "Champion", tagline: "The original hero", accent: "from-amber-300 to-orange-400" },
  daisy: { name: "Daisy", tagline: "Kind farm star", accent: "from-emerald-300 to-teal-500" },
  rusty: { name: "Rusty", tagline: "Wild highland pal", accent: "from-orange-300 to-red-500" },
  nova: { name: "Nova", tagline: "Cosmic adventurer", accent: "from-cyan-300 to-violet-500" },
};

function isAvatarCharacterId(value: unknown): value is AvatarCharacterId {
  return typeof value === "string" && AVATAR_CHARACTER_IDS.includes(value as AvatarCharacterId);
}

export function isAvatarVariantId(value: unknown): value is AvatarVariantId {
  return typeof value === "string" && AVATAR_VARIANT_IDS.includes(value as AvatarVariantId);
}

export const AVATAR_VARIANTS: readonly AvatarVariant[] = catalogManifest.variants
  .filter(
    (variant): variant is typeof variant & { id: AvatarVariantId; characterId: AvatarCharacterId } =>
      isAvatarVariantId(variant.id) && isAvatarCharacterId(variant.characterId),
  )
  .map((variant) => ({
    id: variant.id,
    characterId: variant.characterId,
    characterLabel: variant.characterLabel,
    label: variant.label,
    shortLabel: variant.hatId && variant.glassesId ? "Hat + Glasses" : variant.hatId ? "Hat" : variant.glassesId ? "Glasses" : "Classic",
    image: variant.image,
    hasGlasses: variant.glassesId !== null,
    hasHat: variant.hatId !== null,
  }));

export const DEFAULT_AVATAR_VARIANT_ID: AvatarVariantId = "cow_v1_base";

export function getAvatarVariant(value: unknown): AvatarVariant {
  const id = isAvatarVariantId(value) ? value : DEFAULT_AVATAR_VARIANT_ID;
  return AVATAR_VARIANTS.find((variant) => variant.id === id) ?? AVATAR_VARIANTS[0]!;
}

export const AVATAR_CHARACTERS: readonly AvatarCharacter[] = AVATAR_CHARACTER_IDS.map((id) => ({
  id,
  ...CHARACTER_DETAILS[id],
  baseVariant: AVATAR_VARIANTS.find((variant) => variant.characterId === id && !variant.hasHat && !variant.hasGlasses)!,
}));

export function resolveAvatarVariant(characterId: AvatarCharacterId, hasHat: boolean, hasGlasses: boolean): AvatarVariant {
  return (
    AVATAR_VARIANTS.find(
      (variant) =>
        variant.characterId === characterId &&
        variant.hasHat === hasHat &&
        variant.hasGlasses === hasGlasses,
    ) ?? getAvatarVariant(DEFAULT_AVATAR_VARIANT_ID)
  );
}
