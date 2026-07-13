"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../api-client";
import type {
  AdminMathModel,
  AdminTransactionsPage,
  AdminUser,
  AdminUsersPage,
  Analytics,
  AuditLogPage,
} from "../api-types";

export function useAdminUsers(search?: string, cursor?: string) {
  return useQuery({
    queryKey: ["admin", "users", search, cursor],
    queryFn: () => apiRequest<AdminUsersPage>("/admin/users", { query: { search, cursor } }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      ...body
    }: {
      userId: string;
      status?: "ACTIVE" | "BANNED";
      balanceAdjustment?: { amount: string; reason: string };
    }) => apiRequest<AdminUser>(`/admin/users/${userId}`, { method: "PATCH", body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useAdminModels() {
  return useQuery({
    queryKey: ["admin", "models"],
    queryFn: () => apiRequest<AdminMathModel[]>("/admin/models"),
  });
}

export function useSetActiveModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (modelId: string) =>
      apiRequest<{ activeModelId: string }>("/admin/config/active-model", {
        method: "PATCH",
        body: { modelId },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "models"] }),
  });
}

export function useAdminTransactions(filters: { userId?: string; type?: string; cursor?: string }) {
  return useQuery({
    queryKey: ["admin", "transactions", filters],
    queryFn: () => apiRequest<AdminTransactionsPage>("/admin/transactions", { query: filters }),
  });
}

export function useAnalytics(days: number) {
  return useQuery({
    queryKey: ["admin", "analytics", days],
    queryFn: () => apiRequest<Analytics>("/admin/analytics", { query: { days } }),
  });
}

export function useAuditLog(cursor?: string) {
  return useQuery({
    queryKey: ["admin", "audit-log", cursor],
    queryFn: () => apiRequest<AuditLogPage>("/admin/audit-log", { query: { cursor } }),
  });
}
