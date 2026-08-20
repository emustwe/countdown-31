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

export const DUMMY_USER: PublicUser = {
  id: "user_sameer_khan",
  email: "sameer@countdown31.com",
  fullName: "Sameer Khan",
  avatarUrl: "/assets/Avatar1",
  role: "PLAYER",
  status: "ACTIVE",
  createdAt: new Date().toISOString(),
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: "dummy_access_token_sameer",
      refreshToken: "dummy_refresh_token_sameer",
      user: DUMMY_USER,
      setSession: (session) =>
        set({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          user: session.user,
        }),
      setTokens: (tokens) => set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }),
      setUser: (user) => set({ user }),
      clear: () => set({ accessToken: "dummy_access_token_sameer", refreshToken: "dummy_refresh_token_sameer", user: DUMMY_USER }),
    }),
    { name: "aurora-ways-auth" },
  ),
);

/** Non-hook accessor for use outside React (the api client's fetch wrapper). */
export function getAuthState() {
  return useAuthStore.getState();
}
