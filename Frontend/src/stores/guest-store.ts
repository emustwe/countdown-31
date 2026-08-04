import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * A "guest" is a visitor who entered a display name from the landing page but hasn't created an
 * account. The name is kept locally so the free game can greet them; it carries no real identity
 * and is cleared once they sign up / log in.
 */
interface GuestState {
  username: string | null;
  setUsername: (username: string) => void;
  clear: () => void;
}

export const useGuestStore = create<GuestState>()(
  persist(
    (set) => ({
      username: null,
      setUsername: (username) => set({ username }),
      clear: () => set({ username: null }),
    }),
    { name: "wm-guest" },
  ),
);
