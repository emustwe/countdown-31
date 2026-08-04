"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Crown, Trophy } from "lucide-react";
import { AdminGuard } from "../../../../components/AdminGuard";
import { AdminNav } from "../../../../components/dune/AdminNav";
import { Pill } from "../../../../components/dune/Shell";
import {
  useTournament,
  useBracket,
  useSettleRound,
  useSettleTournament,
  useLeaderboard,
  useRoundGrouping,
  useAssignGroups,
  useRescheduleRound,
  type BracketRound,
} from "../../../../lib/hooks/useTournaments";
import { coins, usdtLabel, roundName } from "../../../../lib/dune-skins";
import { ApiError } from "../../../../lib/api-client";

/** ISO → value for a <input type="datetime-local"> in the browser's local zone. */
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const FORMAT_LABEL: Record<string, string> = {
  LEADERBOARD: "Leaderboard",
  BRACKET: "Bracket",
  WEEKLY: "Weekly (100 · 3 rounds)",
  MONTHLY: "Monthly (500 · 4 rounds)",
};

export default function AdminTournamentDetailPage() {
  const params = useParams<{ id: string }>();
  return (
    <AdminGuard>
      <div className="admin-shell">
        <AdminNav />
        <Detail id={params.id} />
      </div>
    </AdminGuard>
  );
}

function Detail({ id }: { id: string }) {
  const router = useRouter();
  const { data: t } = useTournament(id);

  const prizePool = t ? usdtLabel(t.prizes.reduce((s, p) => s + BigInt(p.amount), 0n).toString()) : "—";

  return (
    <main className="admin-main">
      <div className="admin-heading">
        <div>
          <button className="game-back" onClick={() => router.push("/admin")} style={{ marginBottom: 10 }}>
            <ArrowLeft size={16} /> <span>All tournaments</span>
          </button>
          <p className="eyebrow">TOURNAMENT CONTROL</p>
          <h1>{t?.name ?? "Tournament"}</h1>
          <p>
            {t ? (
              <>
                {FORMAT_LABEL[t.format] ?? t.format} · <Pill tone={t.state === "RUNNING" ? "live" : "soon"}>{t.state}</Pill> ·
                Prize pool <b style={{ color: "var(--gold)" }}>{prizePool}</b>
              </>
            ) : (
              "Loading…"
            )}
          </p>
        </div>
      </div>

      {t?.format === "WEEKLY" || t?.format === "MONTHLY" ? (
        <GroupAdmin id={id} roundsCount={t.roundsCount ?? 0} />
      ) : t?.format === "BRACKET" ? (
        <BracketAdmin id={id} />
      ) : (
        <LeaderboardAdmin id={id} />
      )}
    </main>
  );
}

/** Admin grouping + settlement for WEEKLY/MONTHLY group tournaments. Per round: auto-distribute
 * or manually place the eligible pool into groups, save, then settle (top-N advance). */
function GroupAdmin({ id, roundsCount }: { id: string; roundsCount: number }) {
  const [round, setRound] = useState(1);
  const { data, isLoading } = useRoundGrouping(id, round);
  const assign = useAssignGroups(id);
  const settle = useSettleRound(id);
  const reschedule = useRescheduleRound(id);
  const [error, setError] = useState<string | null>(null);
  const [newStart, setNewStart] = useState("");
  // Local working assignment (matchIndex -> userIds), seeded from the server per round.
  const [draft, setDraft] = useState<Record<number, string[]>>({});
  const [draftRound, setDraftRound] = useState(0);

  const groups = data?.groups ?? [];
  const pool = data?.pool ?? [];
  const nameById = new Map(pool.map((p) => [p.userId, p.displayName]));
  for (const g of groups) for (const p of g.players) nameById.set(p.userId, p.displayName);

  // Seed the working draft from the server whenever we (re)load a round.
  useEffect(() => {
    if (data && draftRound !== round) {
      setDraft(Object.fromEntries(data.groups.map((g) => [g.index, g.players.map((p) => p.userId)])));
      setDraftRound(round);
    }
  }, [data, round, draftRound]);

  const current: Record<number, string[]> =
    draftRound === round ? draft : Object.fromEntries(groups.map((g) => [g.index, g.players.map((p) => p.userId)]));
  const assignedSet = new Set(Object.values(current).flat());
  const unassigned = pool.filter((p) => !assignedSet.has(p.userId));

  function setCurrent(next: Record<number, string[]>) {
    setDraftRound(round);
    setDraft(next);
  }
  function autoDistribute() {
    const ids = pool.map((p) => p.userId);
    // Sequential fill in entry order: fill group 1 to capacity, then group 2, and so on.
    const per = data?.playersPerGroup ?? Math.max(1, Math.ceil(ids.length / Math.max(1, groups.length)));
    const next: Record<number, string[]> = {};
    for (const g of groups) next[g.index] = [];
    ids.forEach((uid, i) => next[groups[Math.min(Math.floor(i / per), groups.length - 1)]!.index]!.push(uid));
    setCurrent(next);
  }
  function clearAll() {
    setCurrent(Object.fromEntries(groups.map((g) => [g.index, []])));
  }
  function assignToGroup(uid: string, gi: number) {
    // A group holds at most playersPerGroup. If it's already full, tell the admin instead of
    // silently overfilling — they can move a player out first, then place this one.
    const cap = data?.playersPerGroup ?? Infinity;
    const alreadyInTarget = (current[gi] ?? []).includes(uid);
    if (!alreadyInTarget && (current[gi]?.length ?? 0) >= cap) {
      setError(`Group ${gi + 1} is full (max ${cap} players). Remove a player from it first, then add.`);
      return;
    }
    setError(null);
    const next: Record<number, string[]> = {};
    for (const g of groups) next[g.index] = (current[g.index] ?? []).filter((x) => x !== uid);
    next[gi] = [...(next[gi] ?? []), uid];
    setCurrent(next);
  }
  function removeFromGroups(uid: string) {
    const next: Record<number, string[]> = {};
    for (const g of groups) next[g.index] = (current[g.index] ?? []).filter((x) => x !== uid);
    setCurrent(next);
  }

  async function save() {
    setError(null);
    try {
      await assign.mutateAsync({
        roundIndex: round,
        groups: groups.map((g) => ({ matchIndex: g.index, userIds: current[g.index] ?? [] })),
      });
    } catch (e) {
      setError(e instanceof ApiError ? String(e.message) : "Could not save groups");
    }
  }
  function doSettle() {
    setError(null);
    settle.mutate(round, { onError: (e) => setError(e instanceof ApiError ? String(e.message) : "Could not settle round") });
  }
  function doReschedule() {
    if (!data) return;
    setError(null);
    const local = newStart || isoToLocalInput(data.startAt);
    reschedule.mutate(
      { roundIndex: round, startAt: new Date(local).toISOString() },
      { onError: (e) => setError(e instanceof ApiError ? String(e.message) : "Could not reschedule") },
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {Array.from({ length: roundsCount }).map((_, i) => (
          <button
            key={i}
            className={round === i + 1 ? "primary" : "secondary"}
            style={{ padding: "6px 14px", fontSize: 12 }}
            onClick={() => {
              setRound(i + 1);
              setNewStart("");
            }}
          >
            {roundName(i + 1, roundsCount)}
          </button>
        ))}
      </div>

      <div className="admin-card glass wide" style={{ padding: "12px 16px", borderColor: "var(--cyan)", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 18 }}>⚙️</span>
        <span style={{ fontSize: 13 }}>
          <b style={{ color: "var(--cyan)" }}>Runs automatically.</b> The engine starts each round, settles it at the 5-minute mark,
          advances to the next round after the gap, and processes re-buy-ins — no admin action needed. The controls below are an
          emergency override only.
        </span>
      </div>

      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
      {isLoading || !data ? (
        <div className="admin-card glass wide" style={{ padding: 24 }}>Loading round…</div>
      ) : (
        <>
          <div className="admin-card glass wide" style={{ padding: 18 }}>
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  {roundName(round, roundsCount).toUpperCase()}
                  {data.settledAt ? " · SETTLED" : data.locked ? " · LIVE (locked)" : " · GROUPING OPEN"}
                </p>
                <h2>
                  {data.groupCount} groups × {data.playersPerGroup} · top {data.advancePerGroup} advance
                </h2>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {!data.locked && !data.settledAt && (
                  <>
                    <button className="secondary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={autoDistribute}>
                      Auto-distribute
                    </button>
                    <button className="secondary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={clearAll}>
                      Clear
                    </button>
                    <button className="primary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={save} disabled={assign.isPending}>
                      {assign.isPending ? "Saving…" : "Save groups"}
                    </button>
                  </>
                )}
                <button className="primary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={doSettle} disabled={settle.isPending || !!data.settledAt}>
                  {data.settledAt ? "Settled" : round === roundsCount ? "Settle & Pay" : "Settle round"}
                </button>
              </div>
            </div>

            {/* Reschedule this round's start (notifies active players) */}
            {!data.settledAt && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>Start time:</span>
                <input
                  type="datetime-local"
                  value={newStart || isoToLocalInput(data.startAt)}
                  onChange={(e) => setNewStart(e.target.value)}
                  className="admin-input"
                  style={{ width: 230 }}
                />
                <button className="secondary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={doReschedule} disabled={reschedule.isPending}>
                  {reschedule.isPending ? "Saving…" : "Reschedule & notify"}
                </button>
              </div>
            )}

            {/* Eligible pool */}
            <p className="eyebrow" style={{ marginTop: 14 }}>ELIGIBLE POOL · {unassigned.length} UNASSIGNED / {pool.length} TOTAL</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {unassigned.length === 0 && <span className="muted" style={{ fontSize: 12 }}>Everyone eligible is placed in a group.</span>}
              {unassigned.map((p) => (
                <span key={p.userId} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 8px", borderRadius: 10, background: "rgba(255,255,255,0.05)", fontSize: 12 }}>
                  {p.displayName}
                  {!data.locked && !data.settledAt && (
                    <select
                      value=""
                      onChange={(e) => e.target.value && assignToGroup(p.userId, Number(e.target.value))}
                      style={{ background: "transparent", color: "var(--gold2)", border: "none", cursor: "pointer" }}
                    >
                      <option value="">＋group</option>
                      {groups.map((g) => (
                        <option key={g.index} value={g.index} style={{ color: "#000" }}>
                          {g.index + 1}
                        </option>
                      ))}
                    </select>
                  )}
                </span>
              ))}
            </div>
          </div>

          {/* Groups */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
            {groups.map((g) => {
              const members = current[g.index] ?? [];
              const full = members.length >= (data.playersPerGroup ?? Infinity);
              return (
                <div key={g.matchId} className="admin-card glass" style={{ padding: 14, border: full ? "1px solid var(--gold)" : undefined }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12, color: "var(--muted)" }}>
                    <b style={{ color: "var(--text)" }}>Group {g.index + 1}</b>
                    <span style={{ color: full ? "var(--gold)" : "var(--muted)", fontWeight: full ? 700 : 400 }}>
                      {members.length}/{data.playersPerGroup}{full ? " · FULL" : ""}
                    </span>
                  </div>
                  {members.length === 0 && <span className="muted" style={{ fontSize: 12 }}>Empty</span>}
                  {members.map((uid) => (
                    <div key={uid} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 6px", fontSize: 13 }}>
                      <span>{nameById.get(uid) ?? "Player"}</span>
                      {!data.locked && !data.settledAt && (
                        <button className="link-btn danger" style={{ fontSize: 14 }} onClick={() => removeFromGroups(uid)}>
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function BracketAdmin({ id }: { id: string }) {
  const { data, isLoading } = useBracket(id);
  const settleRound = useSettleRound(id);
  const [error, setError] = useState<string | null>(null);

  if (isLoading || !data) return <div className="admin-card glass wide" style={{ padding: 24 }}>Loading bracket…</div>;

  const { rounds } = data;

  function canSettle(round: BracketRound): boolean {
    if (round.settledAt) return false;
    if (Date.now() < new Date(round.startAt).getTime()) return false;
    const prev = rounds.find((r) => r.index === round.index - 1);
    if (prev && !prev.settledAt) return false;
    // Need at least one seated player in the round to decide winners.
    return round.matches.some((m) => m.players.length > 0);
  }

  function doSettle(index: number) {
    setError(null);
    settleRound.mutate(index, {
      onError: (e) => setError(e instanceof ApiError ? String(e.message) : "Could not settle round"),
    });
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
      {rounds.map((r) => (
        <div className="admin-card glass wide" key={r.id} style={{ padding: 20 }}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">{r.index === rounds.length ? "FINAL ROUND" : `ROUND ${r.index}`}</p>
              <h2>
                {new Date(r.startAt).toLocaleString()}
                {r.settledAt && <span style={{ color: "var(--green)", fontSize: 13, marginLeft: 10 }}>· Settled</span>}
              </h2>
            </div>
            <button
              className="primary"
              disabled={!canSettle(r) || settleRound.isPending}
              onClick={() => doSettle(r.index)}
              style={{ padding: "6px 14px", fontSize: 12 }}
            >
              {r.settledAt ? "Settled" : r.index === rounds.length ? "Settle & Pay" : "Settle & Advance"}
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14, marginTop: 14 }}>
            {r.matches.map((m) => (
              <div key={m.id} className="glass" style={{ padding: 14, borderRadius: 12, border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
                  <b style={{ color: "var(--text)" }}>Match {m.index + 1}</b>
                  <span>{m.state} · {m.seatsFilled}/{m.seatsTotal}</span>
                </div>
                {m.players.length === 0 && <div className="muted" style={{ fontSize: 12 }}>No players yet</div>}
                {m.players.map((p) => (
                  <div
                    key={p.userId}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "4px 6px",
                      borderRadius: 8,
                      background: p.advanced ? "rgba(244,185,66,0.12)" : "transparent",
                      color: p.eliminated ? "var(--muted)" : "var(--text)",
                      fontSize: 13,
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 5, textDecoration: p.eliminated ? "line-through" : "none" }}>
                      {p.advanced && <Crown size={12} color="var(--gold)" />}
                      {p.displayName}
                    </span>
                    <b style={{ fontVariantNumeric: "tabular-nums" }}>{coins(p.score).toLocaleString()}</b>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function LeaderboardAdmin({ id }: { id: string }) {
  const { data: t } = useTournament(id);
  const { data: lb } = useLeaderboard(id, 2500);
  const settle = useSettleTournament();
  const rows = lb?.leaderboard ?? [];
  const canSettle = t?.state === "ENDED";

  return (
    <div className="admin-card glass wide" style={{ padding: 20 }}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">LIVE LEADERBOARD · {rows.length} {rows.length === 1 ? "PLAYER" : "PLAYERS"}</p>
          <h2>Standings</h2>
        </div>
        <button
          className="primary"
          disabled={!canSettle || settle.isPending}
          onClick={() => settle.mutate(id)}
          style={{ padding: "6px 14px", fontSize: 12 }}
        >
          {t?.state === "SETTLED" ? "Settled" : "Settle & Pay"}
        </button>
      </div>
      <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
        {rows.length === 0 && <p className="muted">No scores yet.</p>}
        {rows.map((r) => (
          <div key={r.userId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,0.04)" }}>
            <b style={{ width: 34 }}>#{r.rank}</b>
            <span className="avatar small">{r.displayName.slice(0, 2).toUpperCase()}</span>
            <span style={{ flex: 1 }}>{r.displayName}</span>
            {r.rank === 1 && <Trophy size={14} color="var(--gold)" />}
            <b style={{ fontVariantNumeric: "tabular-nums" }}>{coins(r.score).toLocaleString()}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
