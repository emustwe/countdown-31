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
    retry: false,
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

export function useLogout() {
  const clear = useAuthStore((s) => s.clear);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      try {
        await apiRequest("/auth/logout", { method: "POST", auth: false });
      } catch {
        // The local session must still be cleared when the API is temporarily unavailable.
      }
      clear();
    },
    onSuccess: () => {
      clear();
      queryClient.clear();
    },
  });
}
