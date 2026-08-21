"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../api-client";
import { useAuthStore } from "../../stores/auth-store";
import type { LoginResponse, MeResponse, PublicUser, RegisterResponse } from "../api-types";

export function useProfile() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["me"],
    queryFn: () => apiRequest<MeResponse>("/auth/me"),
    enabled: !!accessToken,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { fullName?: string; avatarUrl?: string | null }) =>
      apiRequest<PublicUser>("/auth/me", { method: "PATCH", body: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; password: string; mfaCode?: string }) =>
      apiRequest<LoginResponse>("/auth/login", { method: "POST", body: input, auth: false }),
    onSuccess: (data) => {
      setSession(data);
      queryClient.invalidateQueries();
    },
  });
}

export function useRegister() {
  const setSession = useAuthStore((s) => s.setSession);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { fullName: string; email: string; password: string }) =>
      apiRequest<RegisterResponse>("/auth/register", { method: "POST", body: input, auth: false }),
    onSuccess: (data) => {
      setSession(data);
      queryClient.invalidateQueries();
    },
  });
}

// Password recovery: request an emailed OTP, then reset with the code + new password.
export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) =>
      apiRequest<{ ok: true; emailSent: boolean; devOtp?: string }>("/auth/forgot-password", { method: "POST", body: { email }, auth: false }),
  });
}
export function useResetPassword() {
  return useMutation({
    mutationFn: (input: { email: string; otp: string; newPassword: string }) =>
      apiRequest<{ ok: true }>("/auth/reset-password", { method: "POST", body: input, auth: false }),
  });
}

// ---- Email verification --------------------------------------------------------------------
export function useResendVerification() {
  return useMutation({
    mutationFn: () => apiRequest<{ ok: true; devOtp?: string }>("/auth/verify-email/resend", { method: "POST" }),
  });
}
export function useVerifyEmail() {
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (otp: string) => apiRequest<{ ok: true }>("/auth/verify-email", { method: "POST", body: { otp } }),
    onSuccess: () => {
      if (user) setUser({ ...user, emailVerified: true });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

// ---- Two-factor (TOTP) ---------------------------------------------------------------------
export function useBeginMfa() {
  return useMutation({
    mutationFn: () => apiRequest<{ secret: string; otpauthUri: string }>("/auth/mfa/begin", { method: "POST" }),
  });
}
export function useConfirmMfa() {
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: (code: string) => apiRequest<{ recoveryCodes: string[] }>("/auth/mfa/confirm", { method: "POST", body: { code } }),
    onSuccess: () => {
      if (user) setUser({ ...user, mfaEnabled: true });
    },
  });
}
export function useDisableMfa() {
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: (code: string) => apiRequest<{ ok: true }>("/auth/mfa/disable", { method: "POST", body: { code } }),
    onSuccess: () => {
      if (user) setUser({ ...user, mfaEnabled: false });
    },
  });
}

export function useLogout() {
  const clear = useAuthStore((s) => s.clear);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      // The refresh cookie is sent automatically; the server revokes it and clears the cookie.
      await apiRequest("/auth/logout", { method: "POST", auth: false }).catch(() => {});
    },
    onSettled: () => {
      clear();
      queryClient.clear();
    },
  });
}

/** Sign out of every device: bumps the server token-version so all outstanding access tokens die. */
export function useLogoutAll() {
  const clear = useAuthStore((s) => s.clear);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await apiRequest("/auth/logout-all", { method: "POST" }).catch(() => {});
    },
    onSettled: () => {
      clear();
      queryClient.clear();
    },
  });
}
