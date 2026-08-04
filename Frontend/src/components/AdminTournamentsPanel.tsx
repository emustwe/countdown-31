"use client";

import { useState } from "react";
import { useAdminModels } from "../lib/hooks/useAdmin";
import {
  useAdminTournaments,
  useCreateTournament,
  useCancelTournament,
  useSettleTournament,
  type TournamentSummary,
} from "../lib/hooks/useTournaments";
import { parseUsdt, formatUsdt } from "../lib/money";
import { coins, coinsToMinor } from "../lib/dune-skins";
import { ApiError } from "../lib/api-client";

const STATE_COLORS: Record<string, string> = {
  RUNNING: "var(--color-win)",
  SCHEDULED: "var(--color-accent-2)",
  ENDED: "var(--color-accent)",
  SETTLED: "var(--color-text-dim)",
  CANCELLED: "var(--color-danger)",
};

export function AdminTournamentsPanel() {
  const { data, isLoading } = useAdminTournaments();
  const tournaments = data?.tournaments ?? [];

  return (
    <div className="space-y-5">
      <CreateForm />

      <div>
        <h3 className="mb-3 font-semibold">All tournaments</h3>
        {isLoading ? (
          <p className="text-sm text-[var(--color-text-dim)]">Loading…</p>
        ) : tournaments.length === 0 ? (
          <p className="text-sm text-[var(--color-text-dim)]">No tournaments yet — create one above.</p>
        ) : (
          <div className="surface overflow-x-auto rounded-2xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-text-dim)] uppercase">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">State</th>
                  <th className="px-4 py-3">Entry</th>
                  <th className="px-4 py-3">Coins</th>
                  <th className="px-4 py-3">Prize pool</th>
                  <th className="px-4 py-3">Players</th>
                  <th className="px-4 py-3">Ends</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tournaments.map((t) => (
                  <Row key={t.id} t={t} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ t }: { t: TournamentSummary }) {
  const cancel = useCancelTournament();
  const settle = useSettleTournament();
  const [msg, setMsg] = useState<string | null>(null);
  const prizePool = t.prizes.reduce((s, p) => s + BigInt(p.amount), 0n);

  async function run(fn: () => Promise<unknown>) {
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg(e instanceof ApiError ? String(e.message) : "Failed");
    }
  }

  const canCancel = t.state === "SCHEDULED" || t.state === "RUNNING";
  const canSettle = t.state === "ENDED";

  return (
    <tr className="border-b border-[var(--color-border)] last:border-0">
      <td className="px-4 py-3 font-medium">{t.name}</td>
      <td className="px-4 py-3">
        <span className="font-semibold" style={{ color: STATE_COLORS[t.state] }}>
          {t.state}
        </span>
      </td>
      <td className="px-4 py-3 tabular-nums">{formatUsdt(t.entryFee)}</td>
      <td className="px-4 py-3 tabular-nums">{coins(t.startingCredits).toLocaleString()} coins</td>
      <td className="px-4 py-3 tabular-nums">{formatUsdt(prizePool.toString())}</td>
      <td className="px-4 py-3 tabular-nums">
        {t.entryCount}
        {t.maxEntries ? `/${t.maxEntries}` : ""}
      </td>
      <td className="px-4 py-3 text-xs text-[var(--color-text-dim)]">
        {new Date(t.endAt).toLocaleString()}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2">
          {canSettle && (
            <button
              onClick={() => run(() => settle.mutateAsync(t.id))}
              disabled={settle.isPending}
              className="rounded-md bg-[var(--color-accent)] px-3 py-1 text-xs font-semibold text-black disabled:opacity-60"
            >
              Settle & pay
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => run(() => cancel.mutateAsync(t.id))}
              disabled={cancel.isPending}
              className="rounded-md border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-danger)] disabled:opacity-60"
            >
              Cancel
            </button>
          )}
          {!canCancel && !canSettle && <span className="text-xs text-[var(--color-text-dim)]">—</span>}
        </div>
        {msg && <p className="mt-1 text-xs text-[var(--color-danger)]">{msg}</p>}
      </td>
    </tr>
  );
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function CreateForm() {
  const { data: models } = useAdminModels();
  const create = useCreateTournament();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [open, setOpen] = useState(false);

  const now = new Date();
  const [form, setForm] = useState({
    name: "",
    description: "",
    modelId: "",
    entryFee: "5000",
    startingCredits: "100000",
    startAt: toLocalInput(new Date(now.getTime() + 5 * 60_000)),
    endAt: toLocalInput(new Date(now.getTime() + 65 * 60_000)),
    maxEntries: "",
    prize1: "100000",
    prize2: "40000",
    prize3: "10000",
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);
    try {
      const prizes = [
        { rank: 1, amount: form.prize1 },
        { rank: 2, amount: form.prize2 },
        { rank: 3, amount: form.prize3 },
      ]
        .filter((p) => p.amount && Number(p.amount) > 0)
        .map((p) => ({ rank: p.rank, amount: parseUsdt(p.amount) }));

      await create.mutateAsync({
        name: form.name,
        description: form.description || undefined,
        modelId: form.modelId || models?.[0]?.id || "",
        entryFee: parseUsdt(form.entryFee || "0"),
        startingCredits: coinsToMinor(form.startingCredits),
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
        maxEntries: form.maxEntries ? Number(form.maxEntries) : undefined,
        prizes,
      });
      setOk(true);
      set("name", "");
    } catch (err) {
      setError(err instanceof ApiError ? String(err.message) : "Failed to create tournament");
    }
  }

  const input =
    "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]";
  const label = "mb-1 block text-xs text-[var(--color-text-dim)]";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-bold text-black transition hover:brightness-110"
      >
        + Create tournament
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="surface rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">New tournament</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-[var(--color-text-dim)]">
          Close
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2">
          <label className={label}>Name</label>
          <input className={input} value={form.name} onChange={(e) => set("name", e.target.value)} required />
        </div>
        <div>
          <label className={label}>Math model</label>
          <select className={input} value={form.modelId} onChange={(e) => set("modelId", e.target.value)}>
            {(models ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-3">
          <label className={label}>Description (optional)</label>
          <input className={input} value={form.description} onChange={(e) => set("description", e.target.value)} />
        </div>
        <div>
          <label className={label}>Entry fee (USDT)</label>
          <input className={input} value={form.entryFee} onChange={(e) => set("entryFee", e.target.value)} />
        </div>
        <div>
          <label className={label}>Starting coins</label>
          <input className={input} value={form.startingCredits} onChange={(e) => set("startingCredits", e.target.value)} />
        </div>
        <div>
          <label className={label}>Max entries (optional)</label>
          <input className={input} type="number" value={form.maxEntries} onChange={(e) => set("maxEntries", e.target.value)} />
        </div>
        <div>
          <label className={label}>Starts at</label>
          <input className={input} type="datetime-local" value={form.startAt} onChange={(e) => set("startAt", e.target.value)} />
        </div>
        <div>
          <label className={label}>Ends at</label>
          <input className={input} type="datetime-local" value={form.endAt} onChange={(e) => set("endAt", e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-2 sm:col-span-3 lg:col-span-1">
          <div>
            <label className={label}>1st (USDT)</label>
            <input className={input} value={form.prize1} onChange={(e) => set("prize1", e.target.value)} />
          </div>
          <div>
            <label className={label}>2nd (USDT)</label>
            <input className={input} value={form.prize2} onChange={(e) => set("prize2", e.target.value)} />
          </div>
          <div>
            <label className={label}>3rd (USDT)</label>
            <input className={input} value={form.prize3} onChange={(e) => set("prize3", e.target.value)} />
          </div>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-[var(--color-danger)]">{error}</p>}
      {ok && <p className="mt-3 text-sm text-[var(--color-win)]">Tournament created ✓</p>}

      <button
        type="submit"
        disabled={create.isPending}
        className="mt-4 rounded-lg bg-[var(--color-accent)] px-5 py-2 text-sm font-semibold text-black disabled:opacity-60"
      >
        {create.isPending ? "Creating…" : "Create tournament"}
      </button>
    </form>
  );
}
