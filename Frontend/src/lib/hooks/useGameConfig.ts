"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../api-client";
import { cloneGameConfig, DEFAULT_GAME_CONFIG, type GameConfig } from "../game-config";
import { apiBaseUrl } from "../runtime-host";
import { useAuthStore } from "../../stores/auth-store";

export function useGameConfig() {
  return useQuery({
    queryKey: ["game", "config"],
    queryFn: () => apiRequest<GameConfig>("/game/config", { auth: false }),
    initialData: cloneGameConfig(DEFAULT_GAME_CONFIG),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useSaveGameConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: GameConfig) =>
      apiRequest<GameConfig>("/admin/config/game", { method: "PATCH", body: config }),
    onSuccess: (config) => {
      queryClient.setQueryData(["game", "config"], config);
      queryClient.setQueryData(["platform", "theme"], {
        themeFamily: config.branding.themeFamily,
      });
    },
  });
}

export function useResetGameConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest<GameConfig>("/admin/config/game/reset", { method: "POST" }),
    onSuccess: (config) => {
      queryClient.setQueryData(["game", "config"], config);
      queryClient.invalidateQueries({ queryKey: ["platform", "theme"] });
    },
  });
}

export function useUploadGameBackground() {
  return useMutation({
    mutationFn: async (file: File) => {
      const token = useAuthStore.getState().accessToken;
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(`${apiBaseUrl()}/admin/config/assets/background`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
        credentials: "include",
      });
      const result = (await response.json()) as { url?: string; message?: string };
      if (!response.ok || !result.url) {
        throw new Error(result.message || "Background upload failed");
      }
      return result.url;
    },
  });
}
