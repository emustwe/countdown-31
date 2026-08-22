import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PublicUser } from "../lib/api-types";

export interface AuthSession {
  accessToken: string;
  user: PublicUser;
}

interface AuthState {
  accessToken: string | null;
  user: PublicUser | null;
  setSession: (session: AuthSession) => void;
  setAccessToken: (accessToken: string) => void;
  setUser: (user: PublicUser) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setSession: (session) =>
        set({
          accessToken: session.accessToken,
          user: session.user,
        }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setUser: (user) => set({ user }),
      clear: () => set({ accessToken: null, user: null }),
    }),
    {
      name: "aurora-ways-auth",
      version: 2,
      migrate: (persisted) => {
        const old = persisted as Partial<AuthState> & { refreshToken?: string | null };
        const wasDummy =
          old.accessToken?.startsWith("dummy_") || old.user?.id === "user_sameer_khan";
        return {
          accessToken: wasDummy ? null : (old.accessToken ?? null),
          user: wasDummy ? null : (old.user ?? null),
        };
      },
      partialize: (state) => ({ accessToken: state.accessToken, user: state.user }),
    },
  ),
);

/** Non-hook accessor for use outside React (the api client's fetch wrapper). */
export function getAuthState() {
  return useAuthStore.getState();
}
