"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../api-client";
import { apiBaseUrl } from "../runtime-host";
import { useAuthStore } from "../../stores/auth-store";

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
    mobileBackgroundImage?: string;
    overlayOpacity: number;
  };
  logoTile: {
    enabled: boolean;
    logoText: string;
    animationPreset: CampaignAnimation;
    desktopEnabled: boolean;
    mobileEnabled: boolean;
    mediaUrl?: string;
    mediaType?: "image" | "video";
  };
  featurePanel: {
    enabled: boolean;
    headline: string;
    body: string;
  };
  cause?: {
    enabled: boolean;
    label: string;
    title: string;
    message: string;
    beneficiaryName: string;
    targetAmount: number;
    raisedAmount: number;
    currency: "USD" | "USDT" | "EUR" | "GBP";
    showProgress: boolean;
    ctaLabel: string;
    ctaUrl: string;
  };
}

export type CampaignCause = NonNullable<TournamentCampaignManifest["cause"]>;

export function campaignCauseProgress(cause: CampaignCause): number {
  if (!Number.isFinite(cause.targetAmount) || cause.targetAmount <= 0) return 0;
  return Math.min(100, Math.max(0, (cause.raisedAmount / cause.targetAmount) * 100));
}

export type CampaignAssetKind = "LOGO" | "BACKGROUND_DESKTOP" | "BACKGROUND_MOBILE";
export interface CampaignAsset {
  id: string;
  kind: CampaignAssetKind;
  url: string;
  originalName: string;
  mimeType: string;
  mediaType: "image" | "video";
  bytes: number;
  supersedesId: string | null;
  archivedAt: string | null;
  createdAt: string;
}

export function resolveCampaignAssetUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return url.startsWith("/uploads/") ? `${apiBaseUrl()}${url}` : url;
}

export type CampaignVersionStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "PUBLISHED" | "ARCHIVED";
export type CampaignReviewLane = "BRAND" | "SAFETY";
export type CampaignReviewDecision = "COMMENT" | "APPROVED" | "CHANGES_REQUESTED";

export interface CampaignReview {
  id: string;
  reviewerId: string;
  lane: CampaignReviewLane;
  decision: CampaignReviewDecision;
  comment: string;
  createdAt: string;
}

export interface CampaignVersion {
  id: string;
  revision: number;
  status: CampaignVersionStatus;
  manifest: TournamentCampaignManifest;
  createdAt: string;
  publishedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  activateAt: string | null;
  expireAt: string | null;
  reviews: CampaignReview[];
}

export interface AdminCampaignResponse {
  tournament: { id: string; title: string; sponsor: { id: string; name: string } | null };
  campaign: { id: string; isPaused: boolean; isCausePaused: boolean; draft: CampaignVersion | null; published: CampaignVersion | null; versions: CampaignVersion[] } | null;
}

export interface ActiveCampaignResponse {
  campaign: null | {
    tournamentId: string;
    tournamentTitle: string;
    revision: number;
    manifest: TournamentCampaignManifest;
    isCausePaused: boolean;
    activateAt: string | null;
    expireAt: string | null;
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

export function useTournamentCampaignAssets(tournamentId: string) {
  return useQuery({
    queryKey: ["admin", "tournament-campaign", tournamentId, "assets"],
    queryFn: () => apiRequest<{ assets: CampaignAsset[] }>(`/admin/promo-tournaments/${tournamentId}/campaign/assets`),
    enabled: !!tournamentId,
  });
}

export function useUploadTournamentCampaignAsset(tournamentId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ kind, file }: { kind: CampaignAssetKind; file: File }) => {
      const token = useAuthStore.getState().accessToken;
      if (!token) throw new Error("Your admin session has expired. Sign in again before uploading.");
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(`${apiBaseUrl()}/admin/promo-tournaments/${tournamentId}/campaign/assets/${kind}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
        body: form,
      });
      const result = (await response.json().catch(() => ({}))) as { asset?: CampaignAsset; assets?: CampaignAsset[]; message?: string | string[] };
      if (!response.ok || !result.asset) {
        const message = Array.isArray(result.message) ? result.message.join(" ") : result.message;
        throw new Error(message || `Upload failed (${response.status}). Check that the backend is running and try again.`);
      }
      return result as { asset: CampaignAsset; assets: CampaignAsset[] };
    },
    onSuccess: (result) => {
      client.setQueryData(["admin", "tournament-campaign", tournamentId, "assets"], { assets: result.assets });
    },
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
      mutationFn: (schedule: { activateAt?: string | null; expireAt?: string | null } = {}) => apiRequest<AdminCampaignResponse>(`/admin/promo-tournaments/${tournamentId}/campaign/publish`, { method: "POST", body: schedule }),
      onSuccess: refresh,
    }),
    submitReview: useMutation({
      mutationFn: () => apiRequest<AdminCampaignResponse>(`/admin/promo-tournaments/${tournamentId}/campaign/submit-review`, { method: "POST" }),
      onSuccess: refresh,
    }),
    review: useMutation({
      mutationFn: ({ versionId, lane, decision, comment = "" }: { versionId: string; lane: CampaignReviewLane; decision: CampaignReviewDecision; comment?: string }) =>
        apiRequest<AdminCampaignResponse>(`/admin/promo-tournaments/${tournamentId}/campaign/versions/${versionId}/reviews`, { method: "POST", body: { lane, decision, comment } }),
      onSuccess: refresh,
    }),
    rollback: useMutation({
      mutationFn: (versionId: string) => apiRequest<AdminCampaignResponse>(`/admin/promo-tournaments/${tournamentId}/campaign/versions/${versionId}/rollback`, { method: "POST" }),
      onSuccess: refresh,
    }),
    pause: useMutation({
      mutationFn: (paused: boolean) => apiRequest(`/admin/promo-tournaments/${tournamentId}/campaign/${paused ? "pause" : "resume"}`, { method: "POST" }),
      onSuccess: refresh,
    }),
    pauseCause: useMutation({
      mutationFn: (paused: boolean) => apiRequest(`/admin/promo-tournaments/${tournamentId}/campaign/cause/${paused ? "pause" : "resume"}`, { method: "POST" }),
      onSuccess: refresh,
    }),
  };
}

export interface CampaignReportResponse {
  tournament: { id: string; title: string; sponsor: { id: string; name: string } | null };
  campaign: { id: string; isPaused: boolean; isCausePaused: boolean } | null;
  liveRevision: number | null;
  summary: {
    eligibleSessions: number;
    renderedImpressions: number;
    totalViewableSeconds: number;
    averageViewableSeconds: number;
    renderSuccessRate: number;
    causeExpansions: number;
    ctaClicks: number;
    completedLoops: number;
    clickThroughRate: number;
    pacingStatus: "ON_TRACK" | "PAUSED" | "DRAFT";
  };
  placementBreakdown: Array<{
    placement: string;
    impressions: number;
    viewableSeconds: number;
    interactions: number;
    sharePct: number;
  }>;
  deviceBreakdown: Array<{
    device: string;
    impressions: number;
    viewableSeconds: number;
    sharePct: number;
  }>;
  anomalies: Array<{
    type: "HEALTHY" | "WARNING" | "INFO";
    message: string;
  }>;
  proof: {
    campaignTitle: string;
    sponsorName: string;
    disclosureLabel: string;
    publishedAt: string | null;
    activateAt: string | null;
    expireAt: string | null;
    hasCause: boolean;
    beneficiaryName: string | null;
    ctaUrl: string | null;
  };
}

export function useTournamentCampaignReport(tournamentId: string, role: "admin" | "sponsor" = "admin") {
  const path = role === "sponsor"
    ? `/sponsor/tournaments/${tournamentId}/campaign/report`
    : `/admin/promo-tournaments/${tournamentId}/campaign/report`;

  return useQuery({
    queryKey: [role, "tournament-campaign-report", tournamentId],
    queryFn: () => apiRequest<CampaignReportResponse>(path),
    enabled: !!tournamentId,
    refetchInterval: 15_000,
  });
}

export async function downloadCampaignReportCsv(tournamentId: string, role: "admin" | "sponsor" = "admin") {
  const path = role === "sponsor"
    ? `/sponsor/tournaments/${tournamentId}/campaign/report/export`
    : `/admin/promo-tournaments/${tournamentId}/campaign/report/export`;

  const { csv, filename } = await apiRequest<{ csv: string; filename: string }>(path);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename || `campaign-report-${tournamentId}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface CampaignEventItem {
  placement: "logoTile" | "arenaBackground" | "featurePanel" | "causeCard" | "lobbyHero" | "resultSignature";
  eventType: "eligible_load" | "rendered_impression" | "viewable_seconds" | "completed_loop" | "cause_expand" | "cta_click";
  count?: number;
  seconds?: number;
}

export interface CampaignEventBatchInput {
  revision?: number;
  deviceClass?: "desktop" | "tablet" | "mobile";
  events: CampaignEventItem[];
}

export async function sendCampaignEventsBatch(tournamentId: string, batch: CampaignEventBatchInput) {
  try {
    return await apiRequest(`/promo-tournaments/${tournamentId}/campaign/events`, {
      method: "POST",
      body: batch,
      auth: false,
    });
  } catch (err) {
    // Telemetry is best-effort and non-blocking
    console.debug("[CampaignTelemetry] batch send failed:", err);
  }
}
