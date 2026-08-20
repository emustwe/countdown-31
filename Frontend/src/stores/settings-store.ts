import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark";

interface SettingsState {
  soundEnabled: boolean;
  animationsEnabled: boolean;
  theme: ThemeMode;
  toggleSound: () => void;
  toggleAnimations: () => void;
  setTheme: (theme: ThemeMode) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      animationsEnabled: true,
      theme: "dark",
      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      toggleAnimations: () => set((s) => ({ animationsEnabled: !s.animationsEnabled })),
      setTheme: (theme) => set({ theme }),
    }),
    { name: "aurora-ways-settings" },
  ),
);
