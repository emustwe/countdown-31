"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../api-client";
import type { MoneyMovementResult, TransactionPage, WalletSnapshot } from "../api-types";

export function useWallet() {
  return useQuery({
    queryKey: ["wallet"],
    queryFn: () => apiRequest<WalletSnapshot>("/wallet"),
    refetchInterval: 15_000,
  });
}

export function useTransactions(cursor?: string, limit = 20) {
  return useQuery({
    queryKey: ["wallet", "transactions", cursor, limit],
    queryFn: () =>
      apiRequest<TransactionPage>("/wallet/transactions", { query: { cursor, limit } }),
  });
}

function invalidateWallet(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["wallet"] });
  queryClient.invalidateQueries({ queryKey: ["me"] });
}

export function useDeposit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { amount: string; idempotencyKey: string }) =>
      apiRequest<MoneyMovementResult>("/wallet/deposit", { method: "POST", body: input }),
    onSuccess: () => invalidateWallet(queryClient),
  });
}

export function useWithdraw() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { amount: string; destinationAddress: string; idempotencyKey: string }) =>
      apiRequest<MoneyMovementResult>("/wallet/withdraw", { method: "POST", body: input }),
    onSuccess: () => invalidateWallet(queryClient),
  });
}

/** Live deposit: ask the backend to scan the chain for USDT you sent from `fromAddress`
 * to the treasury and credit any uncredited transfers. */
export function useVerifyDeposit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { fromAddress: string }) =>
      apiRequest<{ credited: { amount: string; txSignature: string }[]; balance: string }>(
        "/wallet/deposit/verify",
        { method: "POST", body: input },
      ),
    onSuccess: () => invalidateWallet(queryClient),
  });
}
