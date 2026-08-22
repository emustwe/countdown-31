"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../api-client";
import { useAuthStore, DUMMY_USER } from "../../stores/auth-store";
import type { LoginResponse, MeResponse, PublicUser, RegisterResponse } from "../api-types";

export function useProfile() {
  const user = useAuthStore((s) => s.user) ?? DUMMY_USER;
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return await apiRequest<MeResponse>("/auth/me");
      } catch {
        return {
          ...user,
          // MeResponse balance uses integer USDT base units (6 decimals).
          balance: "1250000000",
        };
      }
    },
    initialData: {
      ...user,
      balance: "1250000000",
    },
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
    mutationFn: (input: { email: string; password: string }) =>
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

export function useLogout() {
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const clear = useAuthStore((s) => s.clear);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (refreshToken) {
        try {
          await apiRequest("/auth/logout", {
            method: "POST",
            body: { refreshToken },
            auth: false,
          });
        } catch {
          // ignore offline logout errors
        }
      }
      clear();
    },
    onSuccess: () => {
      clear();
      queryClient.clear();
    },
  });
}
