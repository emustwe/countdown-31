"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../api-client";

export interface SponsorRow {
  id: string;
  name: string;
  username: string;
  password: string; // admin-visible (empty for legacy sponsors created before this was stored)
  status: string;
  tournamentCount: number;
  createdAt: string;
}

export type Visibility = "PUBLIC" | "PRIVATE";
export type PromoStatus = "PENDING" | "APPROVED" | "REJECTED";
// REGULAR = individual knockout. INFLUENCER = the "Group" format (players split into groups/teams).
export type PromoType = "REGULAR" | "INFLUENCER";

// A team/group in a GROUP tournament (or a featured influencer in a REGULAR one). captainCode/
// memberCode are only returned to the admin/sponsor who owns the tournament.
export interface PromoTeam {
  id: string;
  name: string;
  captainName: string;
  color: string;
  memberCount: number;
  captainCode?: string;
  memberCode?: string;
}

export interface PromoTournament {
  id: string;
  title: string;
  description: string;
  visibility: Visibility;
  status: PromoStatus;
  type: PromoType;
  hasInfluencers: boolean; // named influencer-captains featured (both types)
  groupCount: number; // GROUP: number of groups; REGULAR+influencers: number of influencers
  minGroupPlayers: number | null;
  maxGroupPlayers: number | null;
  teams: PromoTeam[];
  startAt: string | null;
  endAt: string | null;
  prizePool: string;
  winnerCount: number;
  minPlayers: number | null;
  maxPlayers: number | null;
  seekingSponsor: boolean;
  sponsor: { id?: string; name: string } | null;
  createdBy: string;
  createdAt: string;
  entryCount: number;
  sponsorCode?: string | null;
  joinCode?: string | null;
  // Admin-chosen GMT calendar date + the GMT "HH:MM" slots players vote among for the start time.
  startDate: string | null;
  timeOptions: string[];
}

// One GMT start-time slot with its running vote tally.
export interface TimeVoteTally {
  slot: string; // "HH:MM" GMT
  votes: number;
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
  type?: PromoType;
  hasInfluencers?: boolean;
  groupCount?: number;
  teams?: { name?: string; captainName?: string }[];
  minGroupPlayers?: number | null;
  maxGroupPlayers?: number | null;
  startDate?: string | null; // GMT calendar date
  timeOptions?: string[]; // GMT "HH:MM" slots to vote on
  startAt?: string | null;
  endAt?: string | null;
  prizePool?: string;
  winnerCount?: number;
  minPlayers?: number | null;
  maxPlayers?: number | null;
  seekingSponsor?: boolean;
  sponsorId?: string | null;
  status?: PromoStatus;
}

export interface Inquiry {
  id: string;
  type: "SPONSORSHIP" | "ENTRY";
  status: "NEW" | "CONTACTED" | "CLOSED";
  name: string | null;
  email: string;
  message: string;
  tournamentRef: string | null;
  createdAt: string;
  tournament: { id: string; title: string } | null;
  sponsor: { id: string; name: string } | null;
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
export interface SponsorDemoSetup {
  sponsor: { id: string; name: string; username: string; password: string };
  tournament: { id: string; title: string };
  revision: number;
}
export function useSetupSponsorDemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest<SponsorDemoSetup>("/admin/promo-tournaments/demo/setup", { method: "POST" }),
    onSuccess: () => {
      invalidatePromos(qc);
      qc.invalidateQueries({ queryKey: ["admin-sponsors"] });
    },
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
  myTimeVote?: string | null; // the slot this user voted for
  timeVotes?: TimeVoteTally[]; // running tally across all voters
}

/** A joined player votes for the tournament's GMT start time; the most-voted slot resolves startAt. */
export function useVoteStartTime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, slot }: { id: string; slot: string }) =>
      apiRequest<{ myTimeVote: string; startAt: string | null; timeVotes: TimeVoteTally[] }>(
        `/promo-tournaments/${id}/vote-time`,
        { method: "POST", body: { slot } },
      ),
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ["promo-detail", v.id] });
    },
  });
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

// ---- Sponsorship opportunities + inquiries --------------------------------------------------
export function useSponsorshipOpportunities() {
  return useQuery({
    queryKey: ["sponsorship-opportunities"],
    queryFn: () => apiRequest<PromoTournament[]>("/sponsorship-opportunities", { auth: false }),
  });
}
export function useCreateInquiry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { type: "SPONSORSHIP" | "ENTRY"; tournamentId?: string | null; tournamentRef?: string; email: string; message?: string; name?: string }) =>
      apiRequest<{ ok: boolean }>("/inquiries", { method: "POST", body: b, auth: false }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-inquiries"] }),
  });
}
export function useAdminInquiries() {
  return useQuery({ queryKey: ["admin-inquiries"], queryFn: () => apiRequest<Inquiry[]>("/admin/inquiries") });
}
export function useSetInquiryStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "NEW" | "CONTACTED" | "CLOSED" }) =>
      apiRequest<Inquiry>(`/admin/inquiries/${id}`, { method: "PATCH", body: { status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-inquiries"] }),
  });
}
// Resolve a specific-tournament sponsorship request: create/assign a sponsor + attach the tournament.
export function useAssignSponsorToInquiry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; name?: string; username?: string; password?: string; sponsorId?: string }) =>
      apiRequest<{ sponsor: { id: string; name: string; username: string } | null; credentials: { username: string; password: string } | null }>(
        `/admin/inquiries/${id}/assign-sponsor`,
        { method: "POST", body },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-inquiries"] });
      qc.invalidateQueries({ queryKey: ["admin-promos"] });
      qc.invalidateQueries({ queryKey: ["admin-sponsors"] });
    },
  });
}

// ---- Shop cosmetics -------------------------------------------------------------------------
export interface CardCosmetics {
  color?: string;
  pattern?: "none" | "stars" | "waves" | "circuit";
  shape?: "rounded" | "sharp" | "pill";
  border?: "none" | "gold" | "neon";
}
export interface BoardCosmetics { skin?: "classic" | "neon" | "sunset" | "carbon" }
// avatar is the rich Avataaars-based config (see components/dune/Avatar). Kept loose here to avoid
// a circular import; the Avatar component owns the exact AvatarConfig shape.
export interface Cosmetics {
  card?: CardCosmetics;
  avatar?: Record<string, string>;
  board?: BoardCosmetics;
  [k: string]: unknown;
}
export function useCosmetics(enabled = true) {
  return useQuery({ queryKey: ["cosmetics"], queryFn: () => apiRequest<Cosmetics>("/me/cosmetics"), enabled });
}
export function useUpdateCosmetics() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Cosmetics>) => apiRequest<Cosmetics>("/me/cosmetics", { method: "PATCH", body: patch }),
    onSuccess: (data) => qc.setQueryData(["cosmetics"], data),
  });
}
