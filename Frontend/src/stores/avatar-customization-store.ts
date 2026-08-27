import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_AVATAR_VARIANT_ID,
  getAvatarVariant,
  type AvatarVariantId,
} from "../lib/avatar-catalog";
import type { AvatarBackgroundId, AvatarFrameId } from "../lib/avatar-decorations";

export interface AvatarConfig {
  variantId: AvatarVariantId | null;
  skinId: "base_bull" | "golden_emperor" | "barnaby";
  backgroundId: AvatarBackgroundId;
  frameId: AvatarFrameId;
  hasGlasses: boolean;
  hasMustache: boolean;
  hasCrown: boolean;
  title: string;
  unlockedItemIds: string[];
}

interface AvatarStore extends AvatarConfig {
  setVariant: (variantId: AvatarVariantId) => void;
  setSkin: (skinId: AvatarConfig["skinId"]) => void;
  setBackground: (bgId: AvatarConfig["backgroundId"]) => void;
  setFrame: (frameId: AvatarConfig["frameId"]) => void;
  toggleGlasses: () => void;
  toggleMustache: () => void;
  toggleCrown: () => void;
  setTitle: (title: string) => void;
  unlockItem: (itemId: string) => void;
  isItemUnlocked: (itemId: string) => boolean;
  equipAll: () => void;
  removeAll: () => void;
  resetDefault: () => void;
}

const DEFAULT_CONFIG: AvatarConfig = {
  variantId: DEFAULT_AVATAR_VARIANT_ID,
  skinId: "base_bull",
  backgroundId: "emerald",
  frameId: "mythic_gold",
  hasGlasses: false,
  hasMustache: false,
  hasCrown: false,
  title: "The 31 Evader 👑",
  unlockedItemIds: [
    "champion",
    "cow_v1_base",
    "emerald",
    "none",
    "base_bull",
    "golden_emperor",
    "mythic_gold",
  ],
};

export const useAvatarStore = create<AvatarStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_CONFIG,
      setVariant: (variantId) => {
        const variant = getAvatarVariant(variantId);
        set({
          variantId,
          skinId: "base_bull",
          hasGlasses: variant.hasGlasses,
          hasMustache: false,
          hasCrown: false,
        });
      },
      setSkin: (skinId) => set({ skinId, variantId: skinId === "base_bull" ? DEFAULT_AVATAR_VARIANT_ID : null }),
      setBackground: (backgroundId) => set({ backgroundId }),
      setFrame: (frameId) => set({ frameId }),
      toggleGlasses: () => set((s) => ({ hasGlasses: !s.hasGlasses })),
      toggleMustache: () => set((s) => ({ hasMustache: !s.hasMustache })),
      toggleCrown: () => set((s) => ({ hasCrown: !s.hasCrown })),
      setTitle: (title) => set({ title }),
      unlockItem: (itemId) =>
        set((s) => ({
          unlockedItemIds: s.unlockedItemIds.includes(itemId)
            ? s.unlockedItemIds
            : [...s.unlockedItemIds, itemId],
        })),
      isItemUnlocked: (itemId) => {
        const { unlockedItemIds } = get();
        return (unlockedItemIds || DEFAULT_CONFIG.unlockedItemIds).includes(itemId);
      },
      equipAll: () => set({ hasGlasses: true, hasMustache: true, hasCrown: true }),
      removeAll: () => set({ hasGlasses: false, hasMustache: false, hasCrown: false }),
      resetDefault: () => set({ ...DEFAULT_CONFIG }),
    }),
    { name: "cd31-avatar-customization" },
  ),
);
