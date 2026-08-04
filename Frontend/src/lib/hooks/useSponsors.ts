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
export interface PromoTournament {
  id: string;
  title: string;
  description: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  sponsor: { id?: string; name: string } | null;
  createdBy: string;
  createdAt: string;
}
export interface PromoOverview {
  totalUsers: number;
  newUsersToday: number;
  activeUsers7d: number;
  sponsorCount: number;
  pendingTournaments: number;
}

// ---- Admin: sponsors ----
export function useSponsors() {
  return useQuery({ queryKey: ["admin-sponsors"], queryFn: () => apiRequest<SponsorRow[]>("/admin/sponsors") });
}
export function useCreateSponsor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => apiRequest<{ id: string; name: string; username: string; password: string }>("/admin/sponsors", { method: "POST", body: { name } }),
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

// ---- Admin: promo tournaments + overview ----
export function usePromoOverview() {
  return useQuery({ queryKey: ["promo-overview"], queryFn: () => apiRequest<PromoOverview>("/admin/promo-tournaments/overview") });
}
export function useAdminPromoTournaments() {
  return useQuery({ queryKey: ["admin-promos"], queryFn: () => apiRequest<PromoTournament[]>("/admin/promo-tournaments") });
}
export function useCreatePromo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { title: string; description?: string; sponsorId?: string }) => apiRequest<PromoTournament>("/admin/promo-tournaments", { method: "POST", body: b }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-promos"] });
      qc.invalidateQueries({ queryKey: ["promo-overview"] });
    },
  });
}
export function useSetPromoStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: "approve" | "reject" }) => apiRequest<PromoTournament>(`/admin/promo-tournaments/${id}/${action}`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-promos"] });
      qc.invalidateQueries({ queryKey: ["promo-overview"] });
    },
  });
}

// ---- Public: approved promo tournaments (guests included) ----
export interface PublicPromo {
  id: string;
  title: string;
  description: string;
  sponsor: { name: string } | null;
}
export function usePublicPromoTournaments() {
  return useQuery({ queryKey: ["public-promos"], queryFn: () => apiRequest<PublicPromo[]>("/promo-tournaments", { auth: false }) });
}
