"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSettingsStore } from "../stores/settings-store";
import { usePlatformTheme } from "../lib/hooks/useTheme";

/** Applies the per-viewer light/dark choice (data-theme) and the admin-set platform theme
 * family (data-theme-family). The family is cached in localStorage so the pre-paint script
 * can set it with no flash; here we reconcile it with the authoritative server value. */
function ThemeApplier() {
  const theme = useSettingsStore((s) => s.theme);
  const { data } = usePlatformTheme();
  const family = data?.themeFamily;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!family) return;
    document.documentElement.dataset.themeFamily = family;
    try {
      localStorage.setItem("dd-theme-family", family);
    } catch {
      // ignore storage failures
    }
  }, [family]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 5_000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeApplier />
      {children}
    </QueryClientProvider>
  );
}
