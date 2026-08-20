import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AvatarConfig {
  skinId: "base_bull" | "golden_emperor" | "barnaby";
  backgroundId: "emerald" | "golden" | "cyber" | "inferno" | "obsidian" | "none";
  frameId: "mythic_gold" | "neon_glacier" | "inferno" | "emerald" | "none";
  hasGlasses: boolean;
  hasMustache: boolean;
  hasCrown: boolean;
  title: string;
}

interface AvatarStore extends AvatarConfig {
  setSkin: (skinId: AvatarConfig["skinId"]) => void;
  setBackground: (bgId: AvatarConfig["backgroundId"]) => void;
  setFrame: (frameId: AvatarConfig["frameId"]) => void;
  toggleGlasses: () => void;
  toggleMustache: () => void;
  toggleCrown: () => void;
  setTitle: (title: string) => void;
  equipAll: () => void;
  removeAll: () => void;
  resetDefault: () => void;
}

const DEFAULT_CONFIG: AvatarConfig = {
  skinId: "base_bull",
  backgroundId: "emerald",
  frameId: "mythic_gold",
  hasGlasses: true,
  hasMustache: true,
  hasCrown: true,
  title: "The 31 Evader 👑",
};

export const useAvatarStore = create<AvatarStore>()(
  persist(
    (set) => ({
      ...DEFAULT_CONFIG,
      setSkin: (skinId) => set({ skinId }),
      setBackground: (backgroundId) => set({ backgroundId }),
      setFrame: (frameId) => set({ frameId }),
      toggleGlasses: () => set((s) => ({ hasGlasses: !s.hasGlasses })),
      toggleMustache: () => set((s) => ({ hasMustache: !s.hasMustache })),
      toggleCrown: () => set((s) => ({ hasCrown: !s.hasCrown })),
      setTitle: (title) => set({ title }),
      equipAll: () => set({ hasGlasses: true, hasMustache: true, hasCrown: true }),
      removeAll: () => set({ hasGlasses: false, hasMustache: false, hasCrown: false }),
      resetDefault: () => set({ ...DEFAULT_CONFIG }),
    }),
    { name: "cd31-avatar-customization" },
  ),
);
