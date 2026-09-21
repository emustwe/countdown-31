import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark";
// Only one soundtrack ships now — the other six were removed from the product (and their 14.7MB
// of uncompressed WAV with them). Kept as a union so re-adding a track stays a one-line change.
export type BgmTrackId = "tropical";

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
      bgmTrack: "tropical",
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
