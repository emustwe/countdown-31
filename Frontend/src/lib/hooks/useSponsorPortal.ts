"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSponsorAuthStore, type SponsorInfo } from "../../stores/sponsor-auth-store";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function sponsorRequest<T>(path: string, opts: { method?: string; body?: unknown; token?: string | null } = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: opts.method ?? "GET",
    headers: { "content-type": "application/json", ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const msg = await res.json().catch(() => null);
    throw new Error((msg && (msg.message as string)) || "Request failed");
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export interface SponsorTournamentRow {
  id: string;
  title: string;
  description: string;
  visibility: "PUBLIC" | "PRIVATE";
  status: "PENDING" | "APPROVED" | "REJECTED";
  startAt: string | null;
  endAt: string | null;
  prizePool: string;
  winnerCount: number;
  entryCount: number;
  sponsorCode?: string | null;
  joinCode?: string | null;
  createdAt: string;
}

export interface SponsorCreateInput {
  title: string;
  description?: string;
  startAt?: string | null;
  endAt?: string | null;
  prizePool?: string;
  winnerCount?: number;
}

export function useSponsorLogin() {
  const setSession = useSponsorAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (creds: { username: string; password: string }) =>
      sponsorRequest<{ token: string; sponsor: SponsorInfo }>("/sponsor/login", { method: "POST", body: creds }),
    onSuccess: (data) => setSession(data.token, data.sponsor),
  });
}

export function useSponsorTournaments() {
  const token = useSponsorAuthStore((s) => s.token);
  return useQuery({
    queryKey: ["sponsor-tournaments"],
    queryFn: () => sponsorRequest<SponsorTournamentRow[]>("/sponsor/tournaments", { token }),
    enabled: !!token,
  });
}

export function useCreateSponsorTournament() {
  const token = useSponsorAuthStore((s) => s.token);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: SponsorCreateInput) =>
      sponsorRequest<SponsorTournamentRow>("/sponsor/tournaments", { method: "POST", body: b, token }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sponsor-tournaments"] }),
  });
}

// Claim a private tournament using the sponsor code an admin issued.
export function useClaimTournament() {
  const token = useSponsorAuthStore((s) => s.token);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sponsorCode: string) =>
      sponsorRequest<SponsorTournamentRow>("/sponsor/claim", { method: "POST", body: { sponsorCode }, token }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sponsor-tournaments"] }),
  });
}
