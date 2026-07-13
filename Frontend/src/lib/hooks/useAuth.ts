"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../api-client";
import { useAuthStore } from "../../stores/auth-store";
import type { LoginResponse, MeResponse, RegisterResponse } from "../api-types";

export function useProfile() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["me"],
    queryFn: () => apiRequest<MeResponse>("/auth/me"),
    enabled: !!accessToken,
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
    mutationFn: (input: { email: string; password: string }) =>
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
        await apiRequest("/auth/logout", { method: "POST", body: { refreshToken }, auth: false });
      }
    },
    onSettled: () => {
      clear();
      queryClient.clear();
    },
  });
}
