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

function useMoneyMovement(path: "/wallet/deposit" | "/wallet/withdraw") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { amount: string; idempotencyKey: string }) =>
      apiRequest<MoneyMovementResult>(path, { method: "POST", body: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useDeposit() {
  return useMoneyMovement("/wallet/deposit");
}

export function useWithdraw() {
  return useMoneyMovement("/wallet/withdraw");
}
