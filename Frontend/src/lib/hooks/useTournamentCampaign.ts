"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../api-client";

export type CampaignAnimation = "float" | "turntable" | "pulse" | "static";

export interface TournamentCampaignManifest {
  identity: {
    campaignTitle: string;
    sponsorName: string;
    disclosureLabel: string;
    demoDisclaimer?: string;
  };
  theme: {
    primaryColor: string;
    secondaryColor: string;
    backgroundImage: string;
    overlayOpacity: number;
  };
  logoTile: {
    enabled: boolean;
    logoText: string;
    animationPreset: CampaignAnimation;
    desktopEnabled: boolean;
    mobileEnabled: boolean;
  };
  featurePanel: {
    enabled: boolean;
    headline: string;
    body: string;
  };
}

interface CampaignVersion {
  id: string;
  revision: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  manifest: TournamentCampaignManifest;
  createdAt: string;
  publishedAt: string | null;
}

export interface AdminCampaignResponse {
  tournament: { id: string; title: string; sponsor: { id: string; name: string } | null };
  campaign: { id: string; isPaused: boolean; draft: CampaignVersion | null; published: CampaignVersion | null } | null;
}

export interface ActiveCampaignResponse {
  campaign: null | {
    tournamentId: string;
    tournamentTitle: string;
    revision: number;
    manifest: TournamentCampaignManifest;
  };
}

export function useAdminTournamentCampaign(tournamentId: string) {
  return useQuery({
    queryKey: ["admin", "tournament-campaign", tournamentId],
    queryFn: () => apiRequest<AdminCampaignResponse>(`/admin/promo-tournaments/${tournamentId}/campaign`),
    enabled: !!tournamentId,
  });
}

export function useActiveTournamentCampaign(tournamentId: string | null) {
  return useQuery({
    queryKey: ["tournament-campaign", "active", tournamentId],
    queryFn: () => apiRequest<ActiveCampaignResponse>(`/promo-tournaments/${tournamentId}/campaign/active`, { auth: false }),
    enabled: !!tournamentId,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useCampaignActions(tournamentId: string) {
  const client = useQueryClient();
  const refresh = () => {
    client.invalidateQueries({ queryKey: ["admin", "tournament-campaign", tournamentId] });
    client.invalidateQueries({ queryKey: ["tournament-campaign", "active", tournamentId] });
  };
  return {
    save: useMutation({
      mutationFn: (manifest: TournamentCampaignManifest) =>
        apiRequest<AdminCampaignResponse>(`/admin/promo-tournaments/${tournamentId}/campaign/draft`, { method: "PATCH", body: manifest }),
      onSuccess: refresh,
    }),
    publish: useMutation({
      mutationFn: () => apiRequest<AdminCampaignResponse>(`/admin/promo-tournaments/${tournamentId}/campaign/publish`, { method: "POST" }),
      onSuccess: refresh,
    }),
    pause: useMutation({
      mutationFn: (paused: boolean) => apiRequest(`/admin/promo-tournaments/${tournamentId}/campaign/${paused ? "pause" : "resume"}`, { method: "POST" }),
      onSuccess: refresh,
    }),
  };
}
