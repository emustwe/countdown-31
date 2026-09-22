import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * A "guest" is a visitor who entered a display name from the landing page but hasn't created an
 * account. The name is kept locally so the free game can greet them; it carries no real identity
 * and is cleared once they sign up / log in.
 */
interface GuestState {
  username: string | null;
  /** ISO 3166-1 alpha-2 country the guest picked at the name gate — drives their arena flag. */
  country: string | null;
  setUsername: (username: string) => void;
  setCountry: (country: string) => void;
  clear: () => void;
}

export const useGuestStore = create<GuestState>()(
  persist(
    (set) => ({
      username: null,
      country: null,
      setUsername: (username) => set({ username }),
      setCountry: (country) => set({ country }),
      clear: () => set({ username: null, country: null }),
    }),
    { name: "wm-guest" },
  ),
);
