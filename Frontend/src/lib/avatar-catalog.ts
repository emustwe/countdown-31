import catalogManifest from "../../public/assets/avatar-catalog/cow-v1/manifest.json";

export const AVATAR_VARIANT_IDS = [
  "cow_v1_base",
  "cow_v1_glasses",
  "cow_v1_cowboy",
  "cow_v1_cowboy_glasses",
] as const;

export type AvatarVariantId = (typeof AVATAR_VARIANT_IDS)[number];

export interface AvatarVariant {
  id: AvatarVariantId;
  label: string;
  shortLabel: string;
  image: string;
  hasGlasses: boolean;
  hasHat: boolean;
}

const SHORT_LABELS: Record<AvatarVariantId, string> = {
  cow_v1_base: "Classic",
  cow_v1_glasses: "Glasses",
  cow_v1_cowboy: "Hat",
  cow_v1_cowboy_glasses: "Hat + Glasses",
};

export const AVATAR_VARIANTS: readonly AvatarVariant[] = catalogManifest.variants
  .filter((variant): variant is typeof variant & { id: AvatarVariantId } => isAvatarVariantId(variant.id))
  .map((variant) => ({
    id: variant.id,
    label: variant.label,
    shortLabel: SHORT_LABELS[variant.id],
    image: variant.image,
    hasGlasses: variant.glassesId !== null,
    hasHat: variant.hatId !== null,
  }));

export const DEFAULT_AVATAR_VARIANT_ID: AvatarVariantId = "cow_v1_base";

export function isAvatarVariantId(value: unknown): value is AvatarVariantId {
  return typeof value === "string" && AVATAR_VARIANT_IDS.includes(value as AvatarVariantId);
}

export function getAvatarVariant(value: unknown): AvatarVariant {
  const id = isAvatarVariantId(value) ? value : DEFAULT_AVATAR_VARIANT_ID;
  return AVATAR_VARIANTS.find((variant) => variant.id === id) ?? AVATAR_VARIANTS[0]!;
}

export function resolveAvatarVariant(hasHat: boolean, hasGlasses: boolean): AvatarVariant {
  return getAvatarVariant(
    hasHat
      ? hasGlasses
        ? "cow_v1_cowboy_glasses"
        : "cow_v1_cowboy"
      : hasGlasses
        ? "cow_v1_glasses"
        : "cow_v1_base",
  );
}
