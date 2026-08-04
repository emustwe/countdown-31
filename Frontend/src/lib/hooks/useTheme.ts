"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../api-client";

export type ThemeFamily = "desert" | "monster";

/** Platform-wide theme family, set by admins. Public (works on pre-login pages). Polled so a
 * change propagates to everyone without a manual refresh. */
export function usePlatformTheme() {
  return useQuery({
    queryKey: ["platform", "theme"],
    queryFn: () => apiRequest<{ themeFamily: ThemeFamily }>("/game/theme", { auth: false }),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}

export function useSetThemeFamily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (themeFamily: ThemeFamily) =>
      apiRequest<{ themeFamily: ThemeFamily }>("/admin/config/theme", {
        method: "PATCH",
        body: { themeFamily },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "theme"] });
    },
  });
}
