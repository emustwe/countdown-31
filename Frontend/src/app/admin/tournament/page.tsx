"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Copy,
  Lock,
  Pencil,
  Plus,
  Trash2,
  Trophy,
  Unlock,
  X,
  XCircle,
  Sparkles,
  Calendar,
  DollarSign,
  Users,
  Check,
} from "lucide-react";
import {
  useAdminPromoTournaments,
  useCreatePromo,
  useUpdatePromo,
  useDeletePromo,
  useSetPromoStatus,
  useSponsors,
  type PromoTournament,
  type Visibility,
} from "../../../lib/hooks/useSponsors";
import { soundManager } from "../../../lib/soundManager";

interface FormState {
  title: string;
  description: string;
  visibility: Visibility;
  startAt: string;
  endAt: string;
  prizePool: string;
  winnerCount: string;
  minPlayers: string;
  maxPlayers: string;
  seekingSponsor: boolean;
  sponsorId: string;
}

const EMPTY: FormState = {
  title: "",
  description: "",
  visibility: "PUBLIC",
  startAt: "",
  endAt: "",
  prizePool: "",
  winnerCount: "1",
  minPlayers: "",
  maxPlayers: "",
  seekingSponsor: false,
  sponsorId: "",
};

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export default function TournamentAdminPage() {
  const { data: promos } = useAdminPromoTournaments();
  const { data: sponsors } = useSponsors();
  const create = useCreatePromo();
  const update = useUpdatePromo();
  const del = useDeletePromo();
  const setStatus = useSetPromoStatus();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function startEdit(t: PromoTournament) {
    soundManager.playClick();
    setEditingId(t.id);
    setForm({
      title: t.title,
      description: t.description,
      visibility: t.visibility,
      startAt: toLocalInput(t.startAt),
      endAt: toLocalInput(t.endAt),
      prizePool: t.prizePool,
      winnerCount: String(t.winnerCount),
      minPlayers: t.minPlayers != null ? String(t.minPlayers) : "",
      maxPlayers: t.maxPlayers != null ? String(t.maxPlayers) : "",
      seekingSponsor: t.seekingSponsor,
      sponsorId: t.sponsor?.id ?? "",
    });
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    soundManager.playClick();
    setEditingId(null);
    setForm(EMPTY);
    setError("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    soundManager.playClick();
    setError("");
    if (!form.title.trim()) return;

    const body = {
      title: form.title.trim(),
      description: form.description.trim(),
      visibility: form.visibility,
      startAt: form.startAt || null,
      endAt: form.endAt || null,
      prizePool: form.prizePool.trim(),
      winnerCount: Number(form.winnerCount) || 1,
      minPlayers: form.minPlayers === "" ? null : Number(form.minPlayers),
      maxPlayers: form.maxPlayers === "" ? null : Number(form.maxPlayers),
      seekingSponsor: form.visibility === "PRIVATE" ? form.seekingSponsor : false,
      sponsorId: form.visibility === "PRIVATE" ? null : form.sponsorId || null,
    };

    try {
      if (editingId) await update.mutateAsync({ id: editingId, ...body });
      else await create.mutateAsync(body);
      soundManager.playVictory();
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function copyCode(text: string, label: string) {
    try {
      soundManager.playClick();
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(""), 1500);
    } catch {}
  }

  const busy = create.isPending || update.isPending;

  return (
    <div className="flex flex-col gap-6 select-none font-sans">
      {/* Page Heading Marquee */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-[#18281e]/90 via-[#0e1a13]/95 to-[#060c08] border-2 border-amber-400/60 rounded-3xl p-5 sm:p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-title font-black text-amber-400 tracking-widest uppercase">
            <Trophy size={13} />
            <span>EVENT OPERATIONS</span>
          </div>
          <h1 className="font-title font-black text-2xl sm:text-3xl text-white tracking-wide mt-0.5">
            Tournaments Manager
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Create public & private tournaments, configure prizes, timing, and approval status.
          </p>
        </div>

        <span className="px-3.5 py-1.5 rounded-xl bg-black/60 border border-amber-400/40 text-amber-300 font-title font-bold text-xs">
          {(promos ?? []).length} Total Tournament(s)
        </span>
      </div>

      {/* Create / Edit Form Console */}
      <div className="rounded-3xl bg-gradient-to-b from-[#18281e]/98 via-[#0e1a13]/98 to-[#060c08] border-2 border-amber-400/70 p-6 sm:p-8 shadow-2xl flex flex-col gap-5">
        <div className="flex items-center justify-between pb-3 border-b border-amber-500/30">
          <div>
            <span className="text-[10px] font-title font-bold text-amber-400 uppercase tracking-widest">
              {editingId ? "MODIFYING TOURNAMENT" : "NEW TOURNAMENT CREATOR"}
            </span>
            <h2 className="font-title font-black text-xl text-white">
              {editingId ? "Edit Tournament Details" : "Create New Tournament"}
            </h2>
          </div>
          {editingId && (
            <button
              onClick={cancelEdit}
              className="px-3 py-1.5 rounded-xl bg-black/60 border border-slate-700 hover:border-amber-400 text-slate-300 text-xs font-title font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <X size={14} />
              <span>Cancel Edit</span>
            </button>
          )}
        </div>

        <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <label className="sm:col-span-2 lg:col-span-3 flex flex-col gap-1">
            <span className="text-[11px] font-title font-bold text-slate-300">Tournament Title</span>
            <input
              required
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Pasture Grand Prix 2026"
              className="w-full bg-black/80 border-2 border-slate-700 focus:border-amber-400 rounded-xl py-2.5 px-3.5 text-sm text-white outline-none transition-colors"
            />
          </label>

          <label className="sm:col-span-2 lg:col-span-3 flex flex-col gap-1">
            <span className="text-[11px] font-title font-bold text-slate-300">Description (optional)</span>
            <input
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Rules summary or brand welcome message"
              className="w-full bg-black/80 border-2 border-slate-700 focus:border-amber-400 rounded-xl py-2 px-3.5 text-sm text-white outline-none transition-colors"
            />
          </label>

          {/* Visibility Switcher */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-title font-bold text-slate-300">Visibility & Access</span>
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-black/80 border border-slate-700">
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  set("visibility", "PUBLIC");
                }}
                className={`py-1.5 rounded-lg font-title font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  form.visibility === "PUBLIC"
                    ? "bg-gradient-to-r from-emerald-400 to-green-600 text-slate-950 font-black shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Unlock size={13} />
                <span>PUBLIC</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  set("visibility", "PRIVATE");
                }}
                className={`py-1.5 rounded-lg font-title font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  form.visibility === "PRIVATE"
                    ? "bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-black shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Lock size={13} />
                <span>PRIVATE</span>
              </button>
            </div>
          </div>

          {/* Sponsor Select */}
          {form.visibility === "PUBLIC" ? (
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-title font-bold text-slate-300">Assigned Sponsor (optional)</span>
              <select
                value={form.sponsorId}
                onChange={(e) => set("sponsorId", e.target.value)}
                className="w-full bg-black/80 border-2 border-slate-700 focus:border-amber-400 rounded-xl py-2 px-3 text-xs text-white outline-none"
              >
                <option value="">House Tournament (No Sponsor)</option>
                {(sponsors ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (@{s.username})
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="flex flex-col gap-1 justify-center">
              <span className="text-[11px] font-title font-bold text-slate-400">Sponsor Code</span>
              <p className="text-[11px] text-amber-300/80 bg-black/50 p-2 rounded-xl border border-amber-500/20">
                A unique sponsor code is generated on save for the sponsor to claim.
              </p>
            </div>
          )}

          {/* Prize Pool */}
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-title font-bold text-slate-300">Prize Pool (USDT)</span>
            <input
              value={form.prizePool}
              onChange={(e) => set("prizePool", e.target.value)}
              placeholder="e.g. 5,000 USDT"
              className="w-full bg-black/80 border-2 border-slate-700 focus:border-amber-400 rounded-xl py-2 px-3.5 text-sm text-white outline-none"
            />
          </label>

          {/* Starts At */}
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-title font-bold text-slate-300">Starts At</span>
            <input
              type="datetime-local"
              value={form.startAt}
              onChange={(e) => set("startAt", e.target.value)}
              className="w-full bg-black/80 border-2 border-slate-700 focus:border-amber-400 rounded-xl py-2 px-3 text-xs text-white outline-none"
            />
          </label>

          {/* Ends At */}
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-title font-bold text-slate-300">Ends At (optional)</span>
            <input
              type="datetime-local"
              value={form.endAt}
              onChange={(e) => set("endAt", e.target.value)}
              className="w-full bg-black/80 border-2 border-slate-700 focus:border-amber-400 rounded-xl py-2 px-3 text-xs text-white outline-none"
            />
          </label>

          {/* Winner Count */}
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-title font-bold text-slate-300">Winner Count</span>
            <input
              type="number"
              min={1}
              value={form.winnerCount}
              onChange={(e) => set("winnerCount", e.target.value)}
              className="w-full bg-black/80 border-2 border-slate-700 focus:border-amber-400 rounded-xl py-2 px-3.5 text-sm text-white outline-none"
            />
          </label>

          {/* Min / Max Players */}
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-title font-bold text-slate-300">Min Players</span>
            <input
              type="number"
              min={0}
              value={form.minPlayers}
              onChange={(e) => set("minPlayers", e.target.value)}
              placeholder="e.g. 10"
              className="w-full bg-black/80 border-2 border-slate-700 focus:border-amber-400 rounded-xl py-2 px-3.5 text-sm text-white outline-none"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-title font-bold text-slate-300">Max Players</span>
            <input
              type="number"
              min={0}
              value={form.maxPlayers}
              onChange={(e) => set("maxPlayers", e.target.value)}
              placeholder="e.g. 500"
              className="w-full bg-black/80 border-2 border-slate-700 focus:border-amber-400 rounded-xl py-2 px-3.5 text-sm text-white outline-none"
            />
          </label>

          {/* Error display */}
          {error && <div className="sm:col-span-2 lg:col-span-3 text-xs text-rose-400 font-bold">{error}</div>}

          {/* Actions */}
          <div className="sm:col-span-2 lg:col-span-3 pt-2">
            <button
              type="submit"
              disabled={busy || !form.title.trim()}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-title font-black text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.6)] hover:brightness-110 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {editingId ? (
                <>
                  <Pencil size={16} />
                  <span>SAVE CHANGES</span>
                </>
              ) : (
                <>
                  <Plus size={16} />
                  <span>CREATE TOURNAMENT</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Existing Tournaments Showcase */}
      <div className="rounded-3xl bg-gradient-to-b from-[#18281e]/98 via-[#0e1a13]/98 to-[#060c08] border-2 border-amber-400/70 p-6 sm:p-8 shadow-xl flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-amber-500/30">
          <div>
            <span className="text-[10px] font-title font-bold text-amber-400 uppercase tracking-widest">
              ACTIVE ROSTER
            </span>
            <h2 className="font-title font-black text-xl text-white">
              All Platform Tournaments
            </h2>
          </div>
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300">
            <Trophy size={16} />
          </div>
        </div>

        {(promos ?? []).length === 0 ? (
          <div className="py-12 text-center text-slate-500 font-title font-bold text-xs">
            Zero tournaments configured. Create your first tournament above!
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {(promos ?? []).map((t) => (
              <div
                key={t.id}
                className="p-4 sm:p-5 rounded-2xl bg-black/60 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-amber-400/50 transition-colors"
              >
                <div className="flex flex-col gap-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-title font-black text-base text-white">
                      {t.title}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-title font-black uppercase flex items-center gap-1 ${
                      t.visibility === "PRIVATE" ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    }`}>
                      {t.visibility === "PRIVATE" ? <Lock size={10} /> : <Unlock size={10} />}
                      <span>{t.visibility}</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-title font-black uppercase ${
                      t.status === "APPROVED" ? "bg-emerald-500 text-slate-950" : t.status === "PENDING" ? "bg-amber-500 text-slate-950" : "bg-slate-700 text-white"
                    }`}>
                      {t.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap text-xs text-slate-400">
                    <span>{t.sponsor ? `Sponsor: ${t.sponsor.name}` : "House"}</span>
                    <span>·</span>
                    <span className="text-emerald-400 font-bold">Prize: ${t.prizePool || "0"} USDT</span>
                    <span>·</span>
                    <span>{t.winnerCount} Winner(s)</span>
                    <span>·</span>
                    <span>Starts: {fmtDate(t.startAt)}</span>
                    <span>·</span>
                    <span className="text-amber-300">{t.entryCount} Joined</span>
                  </div>

                  {t.visibility === "PRIVATE" && (
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => copyCode(t.sponsorCode ?? "", `s-${t.id}`)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-amber-400 text-[10px] font-mono text-amber-300 flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Sponsor Code: {t.sponsorCode}</span>
                        {copied === `s-${t.id}` ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      </button>

                      <button
                        onClick={() => copyCode(t.joinCode ?? "", `j-${t.id}`)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-amber-400 text-[10px] font-mono text-cyan-300 flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Join Code: {t.joinCode}</span>
                        {copied === `j-${t.id}` ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {t.status === "PENDING" && (
                    <>
                      <button
                        onClick={() => {
                          soundManager.playClick();
                          setStatus.mutate({ id: t.id, action: "approve" });
                        }}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-400 to-green-600 text-slate-950 font-title font-bold text-xs uppercase shadow hover:brightness-110"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          soundManager.playClick();
                          setStatus.mutate({ id: t.id, action: "reject" });
                        }}
                        className="px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-300 font-title font-bold text-xs"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => startEdit(t)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-title font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Pencil size={13} />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => {
                      soundManager.playClick();
                      del.mutate(t.id);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-300 font-title font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
