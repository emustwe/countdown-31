"use client";

import { useEffect } from "react";
import { io } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/auth-store";

import { wsBaseUrl } from "../runtime-host";

/** Subscribes to the server's balance push channel so this tab's wallet display updates
 * immediately when money moves from ANOTHER tab, device, or (in a future milestone) a
 * live jackpot/promo credit — not just after a mutation this tab itself made, which
 * TanStack Query's own invalidate-on-mutation already covers. */
export function useBalanceSocket(): void {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!accessToken) return;

    const socket = io(wsBaseUrl(), { auth: { token: accessToken }, transports: ["websocket"] });
    socket.on("balance", () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken, queryClient]);
}
