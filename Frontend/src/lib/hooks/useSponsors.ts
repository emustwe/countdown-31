"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../api-client";

export interface SponsorRow {
  id: string;
  name: string;
  username: string;
  status: string;
  tournamentCount: number;
  createdAt: string;
}

export type Visibility = "PUBLIC" | "PRIVATE";
export type PromoStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface PromoTournament {
  id: string;
  title: string;
  description: string;
  visibility: Visibility;
  status: PromoStatus;
  startAt: string | null;
  endAt: string | null;
  prizePool: string;
  winnerCount: number;
  sponsor: { id?: string; name: string } | null;
  createdBy: string;
  createdAt: string;
  entryCount: number;
  sponsorCode?: string | null;
  joinCode?: string | null;
}

export interface PromoOverview {
  totalUsers: number;
  newUsersToday: number;
  activeUsers7d: number;
  sponsorCount: number;
  pendingTournaments: number;
  totalTournaments: number;
}

// Shape of the admin/sponsor create+edit form payload.
export interface PromoInput {
  title: string;
  description?: string;
  visibility?: Visibility;
  startAt?: string | null;
  endAt?: string | null;
  prizePool?: string;
  winnerCount?: number;
  sponsorId?: string | null;
  status?: PromoStatus;
}

// ---- Admin: sponsors ------------------------------------------------------------------------
export function useSponsors() {
  return useQuery({ queryKey: ["admin-sponsors"], queryFn: () => apiRequest<SponsorRow[]>("/admin/sponsors") });
}
export function useCreateSponsor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { name: string; username?: string; password?: string }) =>
      apiRequest<{ id: string; name: string; username: string; password: string }>("/admin/sponsors", { method: "POST", body: b }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-sponsors"] }),
  });
}
export function useUpdateSponsor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string; name?: string; username?: string; password?: string; status?: string }) =>
      apiRequest<SponsorRow>(`/admin/sponsors/${id}`, { method: "PATCH", body: patch }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-sponsors"] }),
  });
}
export function useRegenerateSponsor() {
  return useMutation({ mutationFn: (id: string) => apiRequest<{ password: string }>(`/admin/sponsors/${id}/regenerate`, { method: "POST" }) });
}
export function useDeleteSponsor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<void>(`/admin/sponsors/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-sponsors"] }),
  });
}

// ---- Admin: promo tournaments + overview ----------------------------------------------------
export function usePromoOverview() {
  return useQuery({ queryKey: ["promo-overview"], queryFn: () => apiRequest<PromoOverview>("/admin/promo-tournaments/overview") });
}
export function useAdminPromoTournaments() {
  return useQuery({ queryKey: ["admin-promos"], queryFn: () => apiRequest<PromoTournament[]>("/admin/promo-tournaments") });
}
function invalidatePromos(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["admin-promos"] });
  qc.invalidateQueries({ queryKey: ["promo-overview"] });
  qc.invalidateQueries({ queryKey: ["public-promos"] });
}
export function useCreatePromo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: PromoInput) => apiRequest<PromoTournament>("/admin/promo-tournaments", { method: "POST", body: b }),
    onSuccess: () => invalidatePromos(qc),
  });
}
export function useUpdatePromo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string } & Partial<PromoInput>) =>
      apiRequest<PromoTournament>(`/admin/promo-tournaments/${id}`, { method: "PATCH", body: patch }),
    onSuccess: () => invalidatePromos(qc),
  });
}
export function useDeletePromo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<void>(`/admin/promo-tournaments/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidatePromos(qc),
  });
}
export function useSetPromoStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: "approve" | "reject" }) =>
      apiRequest<PromoTournament>(`/admin/promo-tournaments/${id}/${action}`, { method: "POST" }),
    onSuccess: () => invalidatePromos(qc),
  });
}

// ---- Public + user: promo tournaments -------------------------------------------------------
export function usePublicPromoTournaments() {
  return useQuery({ queryKey: ["public-promos"], queryFn: () => apiRequest<PromoTournament[]>("/promo-tournaments", { auth: false }) });
}
export function useRedeemJoinCode() {
  return useMutation({
    mutationFn: (joinCode: string) => apiRequest<PromoTournament>("/promo-tournaments/redeem", { method: "POST", body: { joinCode }, auth: false }),
  });
}
export interface PromoDetail extends PromoTournament {
  joined?: boolean;
}
export function usePromoDetail(id: string, opts: { code?: string; authed: boolean }) {
  return useQuery({
    queryKey: ["promo-detail", id, opts.code ?? "", opts.authed],
    queryFn: () =>
      opts.authed
        ? apiRequest<PromoDetail>(`/promo-tournaments/${id}/me`, { query: opts.code ? { code: opts.code } : undefined })
        : apiRequest<PromoDetail>(`/promo-tournaments/${id}`, { auth: false, query: opts.code ? { code: opts.code } : undefined }),
    enabled: !!id,
    retry: false,
  });
}
export function useJoinPromo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, joinCode }: { id: string; joinCode?: string }) =>
      apiRequest<{ joined: boolean }>(`/promo-tournaments/${id}/join`, { method: "POST", body: { joinCode } }),
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ["promo-detail", v.id] });
      qc.invalidateQueries({ queryKey: ["my-joined-promos"] });
    },
  });
}
export function useMyJoinedPromos(enabled = true) {
  return useQuery({
    queryKey: ["my-joined-promos"],
    queryFn: () => apiRequest<(PromoTournament & { joinedAt: string })[]>("/promo-tournaments/mine/joined"),
    enabled,
  });
}
