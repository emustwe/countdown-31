import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PublicUser } from "../lib/api-types";

// The refresh token is NOT stored in JS anymore — it lives only in an httpOnly cookie the browser
// sends automatically to /auth/*. We keep just the short-lived access token + the user here.
export interface AuthSession {
  accessToken: string;
  user: PublicUser;
}

interface AuthState {
  accessToken: string | null;
  user: PublicUser | null;
  setSession: (session: AuthSession) => void;
  setTokens: (tokens: { accessToken: string }) => void;
  setUser: (user: PublicUser) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setSession: (session) => set({ accessToken: session.accessToken, user: session.user }),
      setTokens: (tokens) => set({ accessToken: tokens.accessToken }),
      setUser: (user) => set({ user }),
      clear: () => set({ accessToken: null, user: null }),
    }),
    {
      name: "aurora-ways-auth",
      // SECURITY (#4): the access token is NEVER written to localStorage — it lives only in memory
      // for the tab's lifetime, so an XSS payload can't lift a bearer token from storage. Only the
      // (non-secret) user profile is persisted for a fast first paint; on reload the token is
      // silently re-minted from the httpOnly refresh cookie (see bootstrapSession / the 401 retry).
      partialize: (state) => ({ user: state.user }),
    },
  ),
);

let bootstrapped = false;
/** On first load, if we have a persisted user but no in-memory access token, mint one from the
 * httpOnly refresh cookie so authed requests and the live socket work immediately. */
export async function bootstrapSession(): Promise<void> {
  if (bootstrapped) return;
  bootstrapped = true;
  const { user, accessToken } = useAuthStore.getState();
  if (!user || accessToken) return;
  const { refreshAccessToken } = await import("../lib/api-client");
  await refreshAccessToken().catch(() => null);
}

/** Non-hook accessor for use outside React (the api client's fetch wrapper). */
export function getAuthState() {
  return useAuthStore.getState();
}
