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
export type PromoType = "REGULAR" | "INFLUENCER";

// A team in an INFLUENCER (team-battle) tournament. captainCode is only present for the
// admin/sponsor who owns the tournament (the invite code the influencer/captain shares).
export interface PromoTeam {
  id: string;
  name: string;
  captainName: string;
  color: string;
  memberCount: number;
  captainCode?: string; // influencer's special entry code (admin/sponsor only)
  memberCode?: string; // code the captain shares with players (admin/sponsor only)
}

// One GMT start-time slot users can vote on, with its running tally.
export interface TimeVoteTally {
  slot: string; // "HH:MM" in GMT
  votes: number;
}

export interface PromoTournament {
  id: string;
  title: string;
  description: string;
  visibility: Visibility;
  type: PromoType;
  status: PromoStatus;
  hasInfluencers: boolean; // whether named influencer-captains are featured (both types)
  groupCount: number; // GROUP: number of teams; REGULAR+influencers: number of influencers
  minGroupPlayers: number | null; // GROUP: players per group
  maxGroupPlayers: number | null;
  startDate: string | null; // admin-chosen GMT calendar date (midnight UTC)
  timeOptions: string[]; // GMT "HH:MM" slots users vote among
  startAt: string | null; // effective resolved start (date + winning time)
  endAt: string | null;
  prizePool: string;
  winnerCount: number;
  minPlayers: number | null;
  maxPlayers: number | null;
  seekingSponsor: boolean;
  sponsor: { id?: string; name: string } | null;
  teams: PromoTeam[];
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
  type?: PromoType;
  startDate?: string | null; // GMT calendar date the admin picks
  timeOptions?: string[]; // GMT "HH:MM" slots users vote among
  teams?: { name?: string; captainName?: string }[]; // one per group/influencer
  hasInfluencers?: boolean; // feature named influencer-captains
  groupCount?: number; // GROUP: number of teams; REGULAR+influencers: number of influencers
  minGroupPlayers?: number | null; // GROUP: players per group
  maxGroupPlayers?: number | null;
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

// ---- Public + user: promo tournaments -------------------------------------------------------
export function usePublicPromoTournaments() {
  return useQuery({ queryKey: ["public-promos"], queryFn: () => apiRequest<PromoTournament[]>("/promo-tournaments", { auth: false }) });
}
export interface PromoDetail extends PromoTournament {
  joined?: boolean;
  myTeamId?: string | null; // which team the signed-in user joined (INFLUENCER)
  myIsCaptain?: boolean; // did the user enter as the captain (influencer)?
  myTimeVote?: string | null; // the signed-in user's chosen GMT start-time slot
  timeVotes?: TimeVoteTally[]; // running tally per slot
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
    // joinCode → PRIVATE tournaments; teamCode → a team code (captain's special code or a player code).
    mutationFn: ({ id, joinCode, teamCode }: { id: string; joinCode?: string; teamCode?: string }) =>
      apiRequest<{ joined: boolean; teamId?: string | null; isCaptain?: boolean }>(`/promo-tournaments/${id}/join`, { method: "POST", body: { joinCode, teamCode } }),
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ["promo-detail", v.id] });
      qc.invalidateQueries({ queryKey: ["my-joined-promos"] });
    },
  });
}
// Vote for a GMT start-time slot; the backend recomputes the tournament's effective startAt
// from the most-voted slot and returns the fresh tally.
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
      qc.invalidateQueries({ queryKey: ["public-promos"] });
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
  owned?: string[]; // shop item keys the player has purchased
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

// ---- Shop (wallet-backed purchases) ---------------------------------------------------------
export interface ShopState {
  price: string; // flat item price in USDT base units (6 dp) — "500000" = 0.5 USDT
  owned: string[]; // item keys the player owns
  balance: string; // wallet balance in USDT base units
}
export function useShop(enabled = true) {
  return useQuery({ queryKey: ["shop"], queryFn: () => apiRequest<ShopState>("/shop"), enabled });
}
export function usePurchaseItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemKey: string) =>
      apiRequest<{ owned: string[]; balance: string; charged: string }>("/shop/purchase", { method: "POST", body: { itemKey } }),
    onSuccess: (data) => {
      qc.setQueryData<ShopState>(["shop"], (prev) => (prev ? { ...prev, owned: data.owned, balance: data.balance } : prev));
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}
