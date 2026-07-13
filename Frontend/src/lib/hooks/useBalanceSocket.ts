"use client";

import { useEffect } from "react";
import { io } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/auth-store";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:4000";

/** Subscribes to the server's balance push channel so this tab's wallet display updates
 * immediately when money moves from ANOTHER tab, device, or (in a future milestone) a
 * live jackpot/promo credit — not just after a mutation this tab itself made, which
 * TanStack Query's own invalidate-on-mutation already covers. */
export function useBalanceSocket(): void {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!accessToken) return;

    const socket = io(WS_URL, { auth: { token: accessToken }, transports: ["websocket"] });
    socket.on("balance", () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken, queryClient]);
}
