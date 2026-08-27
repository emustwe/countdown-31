import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark";
export type BgmTrackId =
  | "arcade"
  | "vegas"
  | "synthwave"
  | "tropical"
  | "vip"
  | "chiptune"
  | "lofi";

interface SettingsState {
  soundEnabled: boolean;
  bgmEnabled: boolean;
  bgmVolume: number;
  bgmTrack: BgmTrackId;
  animationsEnabled: boolean;
  theme: ThemeMode;
  toggleSound: () => void;
  toggleBgm: () => void;
  setBgmVolume: (vol: number) => void;
  setBgmTrack: (track: BgmTrackId) => void;
  toggleAnimations: () => void;
  setTheme: (theme: ThemeMode) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      bgmEnabled: true,
      bgmVolume: 0.85,
      bgmTrack: "arcade",
      animationsEnabled: true,
      theme: "dark",
      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      toggleBgm: () => set((s) => ({ bgmEnabled: !s.bgmEnabled })),
      setBgmVolume: (vol: number) => set({ bgmVolume: Math.max(0, Math.min(1, vol)) }),
      setBgmTrack: (track: BgmTrackId) => set({ bgmTrack: track }),
      toggleAnimations: () => set((s) => ({ animationsEnabled: !s.animationsEnabled })),
      setTheme: (theme) => set({ theme }),
    }),
    { name: "aurora-ways-settings" },
  ),
);
