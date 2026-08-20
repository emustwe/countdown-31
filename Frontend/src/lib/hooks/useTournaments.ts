"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../api-client";
import type { FreeSpinRevealResponse, SpinApiResponse } from "../api-types";
import type { BrandKey } from "../brands";

export interface TournamentPrize {
  rank: number;
  amount: string;
}

export interface TournamentSummary {
  id: string;
  name: string;
  description: string | null;
  modelId: string;
  format: "LEADERBOARD" | "BRACKET" | "WEEKLY" | "MONTHLY";
  brand: BrandKey;
  state: "SCHEDULED" | "RUNNING" | "ENDED" | "SETTLED" | "CANCELLED";
  storedState: string;
  entryFee: string;
  startingCredits: string;
  startAt: string;
  endAt: string;
  registrationClosesAt: string;
  maxEntries: number | null;
  capacity: number | null;
  roundsCount: number | null;
  playersPerMatch: number | null;
  matchDurationSec: number;
  entryCount: number;
  prizes: TournamentPrize[];
  createdAt: string;
  settledAt: string | null;
}

// ---- bracket ----

export interface BracketPlayer {
  userId: string;
  displayName: string;
  score: string;
  seat: number;
  advanced: boolean;
  eliminated: boolean;
  isMe: boolean;
}

export interface BracketMatch {
  id: string;
  index: number;
  state: "PENDING" | "RUNNING" | "DONE";
  startAt: string;
  winnerUserId: string | null;
  seatsFilled: number;
  seatsTotal: number;
  players: BracketPlayer[];
}

export interface BracketRound {
  id: string;
  index: number;
  startAt: string;
  endAt: string;
  settledAt: string | null;
  matches: BracketMatch[];
}

export interface BracketResponse {
  tournament: TournamentSummary;
  rounds: BracketRound[];
  myMatchIds: string[];
  myCurrentMatchId: string | null;
}

export interface MatchScoreboardRow {
  rank: number;
  userId: string;
  displayName: string;
  score: string;
  spinsCount: number;
  isMe: boolean;
}

export interface MatchScoreboard {
  matchId: string;
  tournamentId: string;
  brand: BrandKey;
  format: "LEADERBOARD" | "BRACKET" | "WEEKLY" | "MONTHLY";
  state: "PENDING" | "RUNNING" | "DONE";
  startAt: string;
  endsAt: string;
  winnerUserId: string | null;
  players: MatchScoreboardRow[];
}

export function useBracket(id: string | undefined, pollMs = 5000) {
  return useQuery({
    queryKey: ["tournaments", id, "bracket"],
    queryFn: () => apiRequest<BracketResponse>(`/tournaments/${id}/bracket`),
    enabled: !!id,
    refetchInterval: pollMs,
  });
}

export function usePickSlot(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (matchId: string) =>
      apiRequest<{ matchId: string; seat: number; walletBalance: string }>(
        `/tournaments/${id}/matches/${matchId}/pick`,
        { method: "POST" },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournaments", id, "bracket"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}

export function useMatchScoreboard(matchId: string | undefined, pollMs = 3000) {
  return useQuery({
    queryKey: ["match", matchId, "scoreboard"],
    queryFn: () => apiRequest<MatchScoreboard>(`/tournaments/matches/${matchId}/scoreboard`),
    enabled: !!matchId,
    refetchInterval: pollMs,
  });
}

/** Returns a function that warms the React Query cache for a match's scoreboard. Call it as
 * soon as a match becomes enterable so the match page renders from cache instantly on click. */
export function usePrefetchMatch() {
  const queryClient = useQueryClient();
  return useCallback(
    (matchId: string) =>
      queryClient.prefetchQuery({
        queryKey: ["match", matchId, "scoreboard"],
        queryFn: () => apiRequest<MatchScoreboard>(`/tournaments/matches/${matchId}/scoreboard`),
      }),
    [queryClient],
  );
}

export function useMatchSpin(matchId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { totalBet: string; idempotencyKey: string }) =>
      apiRequest<SpinApiResponse>(`/tournaments/matches/${matchId}/spin`, { method: "POST", body: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", matchId, "scoreboard"] });
    },
  });
}

export function useMatchFreeSpin(matchId: string) {
  return useMutation({
    mutationFn: (input: { roundId: string }) =>
      apiRequest<FreeSpinRevealResponse>(`/tournaments/matches/${matchId}/free-spin`, {
        method: "POST",
        body: input,
      }),
  });
}

export function useSettleRound(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roundIndex: number) =>
      apiRequest<{ settled: boolean; roundIndex: number; isFinal: boolean; prizesPaid: number }>(
        `/admin/tournaments/${id}/rounds/${roundIndex}/settle`,
        { method: "POST" },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournaments", id, "bracket"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "tournaments"] });
    },
  });
}

export interface TournamentEntry {
  id: string;
  tournamentId: string;
  userId: string;
  credits: string;
  score: string;
  spinsCount: number;
  rank: number | null;
  prizeAwarded: string;
  currentRound: number;
  eliminated: boolean;
  eliminatedRound: number | null;
  rebuysUsed: number;
  rebuyPending?: boolean;
  joinedAt: string;
}

export interface RebuyRequest {
  id: string;
  userId: string;
  displayName: string;
  round: number;
  amount: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  decidedAt: string | null;
}

export interface LeaderboardRow {
  rank: number;
  userId: string;
  displayName: string;
  score: string;
  spinsCount: number;
}

export interface LeaderboardResponse {
  tournamentId: string;
  state: TournamentSummary["state"];
  leaderboard: LeaderboardRow[];
}

export function useOpenTournaments() {
  return useQuery({
    queryKey: ["tournaments", "open"],
    queryFn: () => apiRequest<{ tournaments: TournamentSummary[] }>("/tournaments"),
    refetchInterval: 15_000,
  });
}

export function useTournament(id: string | undefined) {
  return useQuery({
    queryKey: ["tournaments", id],
    queryFn: () => apiRequest<TournamentSummary>(`/tournaments/${id}`),
    enabled: !!id,
    refetchInterval: 15_000,
  });
}

export interface TournamentHistoryRow {
  tournamentId: string;
  name: string;
  state: string;
  format: "LEADERBOARD" | "BRACKET";
  startingCoins: string;
  endingCoins: string;
  rank: number | null;
  prizeAwarded: string;
  joinedAt: string;
  endAt: string;
}

export function useMyTournamentHistory() {
  return useQuery({
    queryKey: ["tournaments", "mine", "history"],
    queryFn: () => apiRequest<{ history: TournamentHistoryRow[] }>("/tournaments/mine/history"),
  });
}

export function useMyEntry(id: string | undefined) {
  return useQuery({
    queryKey: ["tournaments", id, "me"],
    queryFn: () => apiRequest<TournamentEntry | null>(`/tournaments/${id}/me`),
    enabled: !!id,
  });
}

export function useLeaderboard(id: string | undefined, pollMs = 4000) {
  return useQuery({
    queryKey: ["tournaments", id, "leaderboard"],
    queryFn: () => apiRequest<LeaderboardResponse>(`/tournaments/${id}/leaderboard`),
    enabled: !!id,
    refetchInterval: pollMs,
  });
}

export function useJoinTournament() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ entry: TournamentEntry; walletBalance: string }>(`/tournaments/${id}/join`, {
        method: "POST",
      }),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["tournaments", id, "me"] });
      queryClient.invalidateQueries({ queryKey: ["tournaments", id] });
      queryClient.invalidateQueries({ queryKey: ["tournaments", "open"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}

export function useTournamentSpin(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { totalBet: string; idempotencyKey: string }) =>
      apiRequest<SpinApiResponse>(`/tournaments/${id}/spin`, { method: "POST", body: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournaments", id, "leaderboard"] });
    },
  });
}

export function useTournamentFreeSpin(id: string) {
  return useMutation({
    mutationFn: (input: { roundId: string }) =>
      apiRequest<FreeSpinRevealResponse>(`/tournaments/${id}/free-spin`, {
        method: "POST",
        body: input,
      }),
  });
}

// ---- admin ----

export interface CreateTournamentBody {
  name: string;
  description?: string;
  modelId: string;
  format?: "LEADERBOARD" | "BRACKET" | "WEEKLY" | "MONTHLY";
  brand?: BrandKey;
  entryFee: string;
  startingCredits: string;
  startAt: string;
  endAt: string;
  maxEntries?: number;
  playersPerMatch?: number;
  roundsCount?: number;
  roundStartAts?: string[];
  prizePool?: string;
  prizes: TournamentPrize[];
}

// ---- group tournaments (WEEKLY / MONTHLY): admin grouping ----

export interface GroupingPlayer {
  userId: string;
  displayName: string;
  assigned?: boolean;
}

export interface RoundGrouping {
  roundIndex: number;
  startAt: string;
  settledAt: string | null;
  groupCount: number;
  playersPerGroup: number;
  advancePerGroup: number;
  locked: boolean;
  pool: GroupingPlayer[];
  groups: { matchId: string; index: number; players: GroupingPlayer[] }[];
}

export function useRoundGrouping(id: string | undefined, roundIndex: number, enabled = true) {
  return useQuery({
    queryKey: ["admin", "tournaments", id, "grouping", roundIndex],
    queryFn: () => apiRequest<RoundGrouping>(`/admin/tournaments/${id}/rounds/${roundIndex}/grouping`),
    enabled: !!id && enabled,
    refetchInterval: 6000,
  });
}

export function useAssignGroups(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { roundIndex: number; groups: { matchIndex: number; userIds: string[] }[] }) =>
      apiRequest<{ grouped: boolean; roundIndex: number; assigned: number }>(
        `/admin/tournaments/${id}/rounds/${input.roundIndex}/groups`,
        { method: "POST", body: { groups: input.groups } },
      ),
    onSuccess: (_d, input) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "tournaments", id, "grouping", input.roundIndex] });
      queryClient.invalidateQueries({ queryKey: ["tournaments", id, "bracket"] });
    },
  });
}

/** Register (pay entry) into a WEEKLY/MONTHLY pool — same endpoint as join. */
export function useRegisterTournament() {
  return useJoinTournament();
}

/** Request a re-buy-in after elimination: pays the entry fee now and submits the request
 * for admin approval (no automatic re-entry). Pre-Semi-Final only. */
export function useRebuy(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiRequest<{ requested: boolean; round: number; status: string; walletBalance: string }>(`/tournaments/${id}/rebuy`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournaments", id, "me"] });
      queryClient.invalidateQueries({ queryKey: ["tournaments", id, "bracket"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}

/** Admin: pending + decided re-buy-in requests for a tournament. */
export function useRebuyRequests(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["admin", "tournaments", id, "rebuys"],
    queryFn: () => apiRequest<{ requests: RebuyRequest[] }>(`/admin/tournaments/${id}/rebuys`),
    enabled: !!id && enabled,
    refetchInterval: 8000,
  });
}

/** Admin: approve or reject a re-buy-in request. */
export function useDecideRebuy(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { requestId: string; approve: boolean }) =>
      apiRequest<{ decided: boolean; approved: boolean }>(
        `/admin/tournaments/rebuys/${input.requestId}/${input.approve ? "approve" : "reject"}`,
        { method: "POST" },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "tournaments", id, "rebuys"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "tournaments", id, "grouping"] });
    },
  });
}

/** Admin: set/change a future round's start time (notifies active players). */
export function useRescheduleRound(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { roundIndex: number; startAt: string }) =>
      apiRequest<{ rescheduled: boolean; roundIndex: number; startAt: string; notified: number }>(
        `/admin/tournaments/${id}/rounds/${input.roundIndex}/schedule`,
        { method: "POST", body: { startAt: input.startAt } },
      ),
    onSuccess: (_d, input) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "tournaments", id, "grouping", input.roundIndex] });
      queryClient.invalidateQueries({ queryKey: ["tournaments", id, "bracket"] });
    },
  });
}

export function useAdminTournaments() {
  return useQuery({
    queryKey: ["admin", "tournaments"],
    queryFn: () =>
      apiRequest<{ tournaments: TournamentSummary[]; nextCursor: string | null }>("/admin/tournaments"),
    refetchInterval: 20_000,
  });
}

export function useCreateTournament() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTournamentBody) =>
      apiRequest<TournamentSummary>("/admin/tournaments", { method: "POST", body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["tournaments", "open"] });
    },
  });
}

export function useCancelTournament() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<TournamentSummary>(`/admin/tournaments/${id}/cancel`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["tournaments", "open"] });
    },
  });
}

export function useSettleTournament() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ settled: boolean; entrants: number; prizesPaid: number }>(
        `/admin/tournaments/${id}/settle`,
        { method: "POST" },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "tournaments"] });
    },
  });
}

/** A ticking "current time" that re-renders the caller every `intervalMs` (default 500ms). Use
 * it to drive time-based UI — like whether a match's window is open — so the state flips within
 * a fraction of a second of the real moment, not only when a slow data poll happens to refresh. */
export function useNow(intervalMs = 500): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Live "2h 14m 03s" countdown to an ISO timestamp; ticks every second. */
export function useCountdownTarget(iso: string): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return "—";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}h ${pad(m)}m ${pad(sec)}s` : `${m}m ${pad(sec)}s`;
}
