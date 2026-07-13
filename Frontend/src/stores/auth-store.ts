import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PublicUser } from "../lib/api-types";

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: PublicUser | null;
  setSession: (session: AuthSession) => void;
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
  setUser: (user: PublicUser) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setSession: (session) =>
        set({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          user: session.user,
        }),
      setTokens: (tokens) => set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }),
      setUser: (user) => set({ user }),
      clear: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: "aurora-ways-auth" },
  ),
);

/** Non-hook accessor for use outside React (the api client's fetch wrapper). */
export function getAuthState() {
  return useAuthStore.getState();
}
