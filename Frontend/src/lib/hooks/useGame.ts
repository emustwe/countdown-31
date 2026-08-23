"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../api-client";
import type {
  FreeSpinRevealResponse,
  PublicMathModel,
  RoundDetail,
  RoundsPage,
  SpinApiResponse,
} from "../api-types";

export function useGameConfig() {
  return useQuery({
    queryKey: ["game", "config"],
    queryFn: () => apiRequest<PublicMathModel>("/game/config", { auth: false }),
    staleTime: Infinity,
  });
}

export function useSpin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { totalBet: string; idempotencyKey: string }) =>
      apiRequest<SpinApiResponse>("/game/spin", { method: "POST", body: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function usePlayNextFreeSpin() {
  return useMutation({
    mutationFn: (input: { roundId: string }) =>
      apiRequest<FreeSpinRevealResponse>("/game/free-spin", { method: "POST", body: input }),
  });
}

/** Free-play practice spin — real engine, dummy coins, no wallet impact. The caller tracks
 * the dummy balance and passes it; the response echoes the new dummy balance. */
export function usePracticeSpin() {
  return useMutation({
    mutationFn: (input: { totalBet: string; balance: string }) =>
      apiRequest<SpinApiResponse>("/game/practice/spin", { method: "POST", body: input }),
  });
}

export function useRound(roundId: string | undefined) {
  return useQuery({
    queryKey: ["game", "rounds", roundId],
    queryFn: () => apiRequest<RoundDetail>(`/game/rounds/${roundId}`),
    enabled: !!roundId,
  });
}

export function useRoundHistory(cursor?: string, limit = 20) {
  return useQuery({
    queryKey: ["game", "rounds", "list", cursor, limit],
    queryFn: () => apiRequest<RoundsPage>("/game/rounds", { query: { cursor, limit } }),
  });
}
