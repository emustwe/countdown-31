import { create } from "zustand";
import { persist } from "zustand/middleware";

// Sponsor sessions are separate from player/admin sessions — a sponsor signs in with the
// admin-issued username/password and gets their own token + dashboard.
export interface SponsorInfo {
  id: string;
  name: string;
  username: string;
}
interface SponsorAuthState {
  token: string | null;
  sponsor: SponsorInfo | null;
  setSession: (token: string, sponsor: SponsorInfo) => void;
  clear: () => void;
}

export const useSponsorAuthStore = create<SponsorAuthState>()(
  persist(
    (set) => ({
      token: null,
      sponsor: null,
      setSession: (token, sponsor) => set({ token, sponsor }),
      clear: () => set({ token: null, sponsor: null }),
    }),
    { name: "wm-sponsor-auth" },
  ),
);
