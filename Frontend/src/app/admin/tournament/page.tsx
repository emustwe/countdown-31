"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Layers,
  Lock,
  Megaphone,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Trophy,
  Unlock,
  Users,
  X,
} from "lucide-react";
import {
  useAdminPromoTournaments,
  useCreatePromo,
  useUpdatePromo,
  useDeletePromo,
  useSetPromoStatus,
  useMarkPrizeDelivered,
  useSetupSponsorDemo,
  useSponsors,
  type PromoTournament,
  type PromoType,
  type Visibility,
} from "../../../lib/hooks/useSponsors";
import { useGameThemes } from "../../../lib/hooks/useGameConfig";
import { soundManager } from "../../../lib/soundManager";

const QUICK_SLOTS = ["12:00", "15:00", "18:00", "20:00", "22:00"];
const GROUP_SIZE = 31;

interface FormState {
  title: string;
  description: string;
  visibility: Visibility;
  // Sponsor inclusion (for both PUBLIC and PRIVATE): none = house; include = pick an existing sponsor;
  // find = generate a sponsor code + list on the Sponsorship page so sponsors can contact the admin.
  sponsorMode: "none" | "include" | "find";
  sponsorId: string;
  themeId: string;
  type: PromoType;
  durationDays: string; // GROUP only
  startDate: string;
  timeOptions: string[];
  prizePool: string;
  winnerCount: string;
  minPlayers: string;
  maxPlayers: string;
}

const EMPTY: FormState = {
  title: "",
  description: "",
  visibility: "PUBLIC",
  sponsorMode: "none",
  sponsorId: "",
  themeId: "",
  type: "REGULAR",
  durationDays: "7",
  startDate: "",
  timeOptions: [],
  prizePool: "",
  winnerCount: "1",
  minPlayers: "",
  maxPlayers: "",
};

function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " GMT";
}

const inputCls = "w-full bg-black/80 border-2 border-slate-700 focus:border-amber-400 rounded-xl py-2.5 px-3.5 text-sm text-white outline-none transition-colors";
const labelCls = "text-[11px] font-title font-bold text-slate-300";

export default function TournamentAdminPage() {
  const { data: promos } = useAdminPromoTournaments();
  const { data: sponsors } = useSponsors();
  const { data: themes } = useGameThemes();
  const create = useCreatePromo();
  const update = useUpdatePromo();
  const del = useDeletePromo();
  const markDelivered = useMarkPrizeDelivered();
  const sponsorDemo = useSetupSponsorDemo();
  const setStatus = useSetPromoStatus();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [slotDraft, setSlotDraft] = useState("");

  const isGroup = form.type === "GROUP";

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function setType(next: PromoType) {
    soundManager.playClick();
    setForm((f) => ({ ...f, type: next }));
  }
  function addSlot(value?: string) {
    const v = (value ?? slotDraft).trim();
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(v)) return;
    setForm((f) => (f.timeOptions.includes(v) ? f : { ...f, timeOptions: [...f.timeOptions, v].sort() }));
    setSlotDraft("");
  }
  function removeSlot(s: string) {
    set("timeOptions", form.timeOptions.filter((x) => x !== s));
  }

  function startEdit(t: PromoTournament) {
    soundManager.playClick();
    setEditingId(t.id);
    setForm({
      title: t.title,
      description: t.description,
      visibility: t.visibility,
      sponsorMode: t.sponsor ? "include" : t.seekingSponsor ? "find" : "none",
      sponsorId: t.sponsor?.id ?? "",
      themeId: t.themeId ?? "",
      type: t.type ?? "REGULAR",
      durationDays: t.durationDays != null ? String(t.durationDays) : "7",
      startDate: toDateInput(t.startDate),
      timeOptions: [...(t.timeOptions ?? [])],
      prizePool: t.prizePool,
      winnerCount: String(t.winnerCount),
      minPlayers: t.minPlayers != null ? String(t.minPlayers) : "",
      maxPlayers: t.maxPlayers != null ? String(t.maxPlayers) : "",
    });
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function cancelEdit() {
    soundManager.playClick();
    setEditingId(null);
    setForm(EMPTY);
    setSlotDraft("");
    setError("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    soundManager.playClick();
    setError("");
    if (!form.title.trim()) return;
    if (isGroup && (Number(form.durationDays) || 0) < 2) {
      setError("A group tournament needs at least 2 days (group stage + a final day).");
      return;
    }
    const body = {
      title: form.title.trim(),
      description: form.description.trim(),
      visibility: form.visibility,
      type: form.type,
      durationDays: isGroup ? Number(form.durationDays) || null : null,
      startDate: form.startDate || null,
      timeOptions: form.timeOptions,
      prizePool: form.prizePool.trim(),
      winnerCount: isGroup ? 1 : Number(form.winnerCount) || 1,
      minPlayers: form.minPlayers === "" ? null : Number(form.minPlayers),
      maxPlayers: form.maxPlayers === "" ? null : Number(form.maxPlayers),
      // Include Sponsor → attach the chosen existing sponsor. Find Sponsor → seek one (code generated,
      // listed on the Sponsorship page for sponsors to contact us). Works for PUBLIC and PRIVATE.
      sponsorId: form.sponsorMode === "include" ? form.sponsorId || null : null,
      themeId: form.themeId || null,
      seekingSponsor: form.sponsorMode === "find",
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
  const list = useMemo(() => promos ?? [], [promos]);

  return (
    <div className="flex flex-col gap-6 select-none font-sans">
      {/* Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-[#18281e]/90 via-[#0e1a13]/95 to-[#060c08] border-2 border-amber-400/60 rounded-3xl p-5 sm:p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-title font-black text-amber-400 tracking-widest uppercase"><Trophy size={13} /><span>EVENT OPERATIONS</span></div>
          <h1 className="font-title font-black text-2xl sm:text-3xl text-white tracking-wide mt-0.5">Tournaments Manager</h1>
          <p className="text-xs text-slate-400 mt-1">Create Regular knockouts and multi-day Group tournaments (players auto-split into groups of 31), with players voting the GMT start time.</p>
        </div>
        <span className="px-3.5 py-1.5 rounded-xl bg-black/60 border border-amber-400/40 text-amber-300 font-title font-bold text-xs">{list.length} Total</span>
      </div>

      {/* Create / Edit form */}
      <div className="rounded-3xl bg-gradient-to-b from-[#18281e]/98 via-[#0e1a13]/98 to-[#060c08] border-2 border-amber-400/70 p-6 sm:p-8 shadow-2xl flex flex-col gap-5">
        <div className="flex items-center justify-between pb-3 border-b border-amber-500/30">
          <div>
            <span className="text-[10px] font-title font-bold text-amber-400 uppercase tracking-widest">{editingId ? "MODIFYING TOURNAMENT" : "NEW TOURNAMENT CREATOR"}</span>
            <h2 className="font-title font-black text-xl text-white">{editingId ? "Edit tournament" : `New ${isGroup ? "group" : "regular"} tournament`}</h2>
          </div>
          {editingId && <button onClick={cancelEdit} className="px-3 py-1.5 rounded-xl bg-black/60 border border-slate-700 hover:border-amber-400 text-slate-300 text-xs font-title font-bold flex items-center gap-1.5 cursor-pointer"><X size={14} /> Cancel</button>}
        </div>

        {/* Type tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button type="button" onClick={() => setType("REGULAR")} className={`p-4 rounded-2xl border-2 text-left flex items-start gap-3 transition-all cursor-pointer ${!isGroup ? "border-amber-400 bg-amber-400/10" : "border-slate-700 bg-black/50 hover:border-slate-500"}`}>
            <Trophy size={20} className="text-amber-300 mt-0.5" />
            <span><b className="block font-title font-black text-white text-sm">Regular tournament</b><small className="text-xs text-slate-400">A single knockout — one pool plays down to the last player standing.</small></span>
          </button>
          <button type="button" onClick={() => setType("GROUP")} className={`p-4 rounded-2xl border-2 text-left flex items-start gap-3 transition-all cursor-pointer ${isGroup ? "border-amber-400 bg-amber-400/10" : "border-slate-700 bg-black/50 hover:border-slate-500"}`}>
            <Layers size={20} className="text-amber-300 mt-0.5" />
            <span><b className="block font-title font-black text-white text-sm">Group tournament</b><small className="text-xs text-slate-400">Multi-day: entrants auto-split into groups of 31; each group's winner advances to a final.</small></span>
          </button>
        </div>

        <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <label className="sm:col-span-2 lg:col-span-3 flex flex-col gap-1">
            <span className={labelCls}>Tournament title</span>
            <input required value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Pasture Grand Prix 2026" className={inputCls} />
          </label>
          <label className="sm:col-span-2 lg:col-span-3 flex flex-col gap-1">
            <span className={labelCls}>Description (optional)</span>
            <input value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Short description" className={inputCls} />
          </label>

          {/* Visibility */}
          <div className="flex flex-col gap-1">
            <span className={labelCls}>Visibility</span>
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-black/80 border border-slate-700">
              <button type="button" onClick={() => { soundManager.playClick(); set("visibility", "PUBLIC"); }} className={`py-1.5 rounded-lg font-title font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer ${form.visibility === "PUBLIC" ? "bg-gradient-to-r from-emerald-400 to-green-600 text-slate-950" : "text-slate-400 hover:text-white"}`}><Unlock size={13} /> PUBLIC</button>
              <button type="button" onClick={() => { soundManager.playClick(); set("visibility", "PRIVATE"); }} className={`py-1.5 rounded-lg font-title font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer ${form.visibility === "PRIVATE" ? "bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950" : "text-slate-400 hover:text-white"}`}><Lock size={13} /> PRIVATE</button>
            </div>
          </div>

          {/* Sponsor inclusion — works for BOTH public and private tournaments. */}
          <div className="flex flex-col gap-1">
            <span className={labelCls}>Sponsor</span>
            <select value={form.sponsorMode} onChange={(e) => set("sponsorMode", e.target.value as FormState["sponsorMode"])} className={inputCls}>
              <option value="none">House tournament (no sponsor)</option>
              <option value="include">Include sponsor — pick an existing one</option>
              <option value="find">Find sponsor — generate a code &amp; list it</option>
            </select>
            {form.sponsorMode === "include" && (
              <select value={form.sponsorId} onChange={(e) => set("sponsorId", e.target.value)} className={`${inputCls} mt-1`}>
                <option value="">Select a sponsor…</option>
                {(sponsors ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
            {form.sponsorMode === "find" && (
              <p className="text-[11px] text-amber-300/80 bg-black/50 p-2 rounded-xl border border-amber-500/20 mt-1">
                A sponsor code is generated on save, and the tournament is listed on the Sponsorship page so sponsors can contact you to claim it.
              </p>
            )}
          </div>

          {/* Sponsor THEME — a Game Studio theme applied to THIS tournament's game. */}
          <div className="flex flex-col gap-1">
            <span className={labelCls}>Theme (brand look)</span>
            <select value={form.themeId} onChange={(e) => set("themeId", e.target.value)} className={inputCls}>
              <option value="">Default — 31 Thirty One</option>
              {(themes ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}{t.gameTitle ? ` — ${t.gameTitle}` : ""}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Pick a sponsor theme, or manage them in <b className="text-amber-300">Game Studio → My themes</b>.
            </p>
          </div>

          {/* Group: duration + how the format works */}
          {isGroup && (
            <>
              <label className="flex flex-col gap-1">
                <span className={labelCls}>Duration (days, incl. final)</span>
                <input type="number" min={2} max={60} value={form.durationDays} onChange={(e) => set("durationDays", e.target.value)} placeholder="e.g. 7" className={inputCls} />
              </label>
              <div className="sm:col-span-2 lg:col-span-2 flex items-center">
                <p className="text-[11px] text-amber-200/90 bg-black/50 p-2.5 rounded-xl border border-amber-500/20 leading-relaxed">
                  Entrants are automatically split into <b>groups of {GROUP_SIZE}</b> by join order. <b>Entry closes 24h before the start.</b> After it closes, open the tournament's <b>Groups</b> page to assign each group to a day. Every group eliminates down to <b>one winner</b>, and all winners meet in the <b>final on the last day</b>.
                </p>
              </div>
            </>
          )}

          {/* Start date (GMT) + prize + winners (regular only) */}
          <label className="flex flex-col gap-1"><span className={labelCls}>Start date (GMT)</span><input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} className={inputCls} /></label>
          <label className="flex flex-col gap-1"><span className={labelCls}>Prize pool</span><input value={form.prizePool} onChange={(e) => set("prizePool", e.target.value)} placeholder="e.g. 5,000 USDT" className={inputCls} /></label>
          {!isGroup && <label className="flex flex-col gap-1"><span className={labelCls}>Winners</span><input type="number" min={1} value={form.winnerCount} onChange={(e) => set("winnerCount", e.target.value)} className={inputCls} /></label>}

          {/* Time-vote slots (GMT) */}
          <div className="sm:col-span-2 lg:col-span-3 flex flex-col gap-2">
            <span className={labelCls}>Start-time options (GMT — players vote the time)</span>
            <div className="flex items-center gap-2 flex-wrap">
              <input type="time" value={slotDraft} onChange={(e) => setSlotDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSlot(); } }} className="bg-black/80 border-2 border-slate-700 focus:border-amber-400 rounded-xl py-2 px-3 text-sm text-white outline-none" />
              <button type="button" onClick={() => addSlot()} className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-title font-bold text-xs flex items-center gap-1 cursor-pointer"><Plus size={13} /> Add slot</button>
              {QUICK_SLOTS.map((s) => <button type="button" key={s} onClick={() => addSlot(s)} disabled={form.timeOptions.includes(s)} className="px-2.5 py-1.5 rounded-lg bg-black/60 border border-slate-700 text-slate-300 text-xs font-mono disabled:opacity-30 hover:border-amber-400 cursor-pointer">+{s}</button>)}
            </div>
            <div className="flex flex-wrap gap-2">
              {form.timeOptions.length === 0 && <em className="text-[11px] text-slate-500">No slots yet — add at least one so players can vote a time.</em>}
              {form.timeOptions.map((s) => (
                <span key={s} className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-mono flex items-center gap-1.5"><Clock size={11} /> {s} <button type="button" onClick={() => removeSlot(s)}><X size={11} /></button></span>
              ))}
            </div>
          </div>

          {/* Player range (both types). For GROUP this is the whole field (min ≥ 2). */}
          <label className="flex flex-col gap-1"><span className={labelCls}>Min players</span><input type="number" min={0} value={form.minPlayers} onChange={(e) => set("minPlayers", e.target.value)} placeholder="e.g. 31" className={inputCls} /></label>
          <label className="flex flex-col gap-1"><span className={labelCls}>Max players</span><input type="number" min={0} value={form.maxPlayers} onChange={(e) => set("maxPlayers", e.target.value)} placeholder="e.g. 3131" className={inputCls} /></label>

          {error && <div className="sm:col-span-2 lg:col-span-3 text-xs text-rose-400 font-bold">{error}</div>}

          <div className="sm:col-span-2 lg:col-span-3 pt-2">
            <button type="submit" disabled={busy || !form.title.trim()} className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-title font-black text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.6)] hover:brightness-110 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40">
              {editingId ? <><Pencil size={16} /> SAVE CHANGES</> : <><Plus size={16} /> CREATE {isGroup ? "GROUP" : "REGULAR"} TOURNAMENT</>}
            </button>
          </div>
        </form>
      </div>

      {/* Roster */}
      <div className="rounded-3xl bg-gradient-to-b from-[#18281e]/98 via-[#0e1a13]/98 to-[#060c08] border-2 border-amber-400/70 p-6 sm:p-8 shadow-xl flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-amber-500/30 gap-3 flex-wrap">
          <h2 className="font-title font-black text-xl text-white">All tournaments</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { soundManager.playClick(); sponsorDemo.mutate(); }}
              disabled={sponsorDemo.isPending}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white font-title font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40 shadow"
              title="Build a complete sponsor-branded demo tournament with a published campaign"
            >
              <Sparkles size={13} /> {sponsorDemo.isPending ? "Building…" : "Build sponsor demo"}
            </button>
            <span className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300"><Trophy size={16} /></span>
          </div>
        </div>
        {sponsorDemo.isSuccess && sponsorDemo.data && (
          <div className="rounded-2xl border border-fuchsia-400/40 bg-fuchsia-500/10 p-3 text-xs text-fuchsia-100 flex flex-wrap items-center gap-2">
            <CheckCircle2 size={14} className="text-fuchsia-300" /> Demo ready: <b>{sponsorDemo.data.tournament.title}</b> · sponsor <b>{sponsorDemo.data.sponsor.username}</b> / <code className="font-mono text-fuchsia-200">{sponsorDemo.data.sponsor.password}</code>
            <Link href={`/admin/tournament/${sponsorDemo.data.tournament.id}/campaign`} className="ml-auto px-2.5 py-1 rounded-lg bg-fuchsia-500/30 border border-fuchsia-400/50 font-title font-bold flex items-center gap-1 cursor-pointer"><Megaphone size={12} /> Open studio</Link>
          </div>
        )}
        {list.length === 0 ? (
          <div className="py-12 text-center text-slate-500 font-title font-bold text-xs">No tournaments yet — create your first above.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {list.map((t) => {
              const entryClosed = !!t.entryClosesAt && Date.now() >= new Date(t.entryClosesAt).getTime();
              return (
              <div key={t.id} className="p-4 sm:p-5 rounded-2xl bg-black/60 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-amber-400/50 transition-colors">
                <div className="flex flex-col gap-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-title font-black text-base text-white">{t.title}</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-title font-black uppercase bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center gap-1">{t.type === "GROUP" ? <><Layers size={10} /> Group</> : <><Trophy size={10} /> Regular</>}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-title font-black uppercase flex items-center gap-1 ${t.visibility === "PRIVATE" ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"}`}>{t.visibility === "PRIVATE" ? <Lock size={10} /> : <Unlock size={10} />} {t.visibility}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-title font-black uppercase ${t.status === "APPROVED" ? "bg-emerald-500 text-slate-950" : t.status === "PENDING" ? "bg-amber-500 text-slate-950" : "bg-slate-700 text-white"}`}>{t.status}</span>
                    {t.type === "GROUP" && (t.groups?.length ?? 0) > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-title font-black uppercase bg-indigo-500/20 text-indigo-200 border border-indigo-400/40 flex items-center gap-1"><Layers size={10} /> {t.groups.filter((g) => !g.isFinal).length} groups + final</span>
                    )}
                    {t.finished && !t.prizeDelivered && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-title font-black uppercase bg-fuchsia-500/25 text-fuchsia-200 border border-fuchsia-400/40 flex items-center gap-1 animate-pulse">
                        <Trophy size={10} /> Finished · prize pending
                      </span>
                    )}
                    {t.finished && t.prizeDelivered && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-title font-black uppercase bg-emerald-600/30 text-emerald-200 border border-emerald-400/40 flex items-center gap-1">
                        <CheckCircle2 size={10} /> Prize delivered
                      </span>
                    )}
                  </div>
                  {t.finished && (
                    <div className="flex items-center gap-1.5 text-xs font-title font-bold text-fuchsia-300">
                      <Trophy size={12} className="text-yellow-400 fill-yellow-400" />
                      <span>Champion: {t.winnerName ?? "—"}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 flex-wrap text-xs text-slate-400">
                    <span>{t.sponsor ? `Sponsor: ${t.sponsor.name}` : "House"}</span><span>·</span>
                    <span className="text-emerald-400 font-bold">Prize: {t.prizePool || "—"}</span><span>·</span>
                    {t.type === "GROUP" ? <span>{t.durationDays ?? "?"}-day event</span> : <span>{t.winnerCount} winner(s)</span>}<span>·</span>
                    <span>Start: {fmtDate(t.startAt)}</span>
                    {t.type === "GROUP" && t.entryClosesAt && <><span>·</span><span className={entryClosed ? "text-rose-300" : "text-amber-300"}>Entry {entryClosed ? "closed" : "closes"}: {fmtDate(t.entryClosesAt)}</span></>}
                    {t.timeOptions?.length > 0 && <><span>·</span><span className="text-amber-300">Vote: {t.timeOptions.join(", ")} GMT</span></>}<span>·</span>
                    <span className="text-amber-300">{t.entryCount} joined</span>
                  </div>
                  {t.visibility === "PRIVATE" && (
                    <div className="flex items-center gap-2 mt-1">
                      <button onClick={() => copyCode(t.sponsorCode ?? "", `s-${t.id}`)} className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-amber-400 text-[10px] font-mono text-amber-300 flex items-center gap-1.5 cursor-pointer"><span>Sponsor: {t.sponsorCode}</span>{copied === `s-${t.id}` ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}</button>
                      <button onClick={() => copyCode(t.joinCode ?? "", `j-${t.id}`)} className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-amber-400 text-[10px] font-mono text-cyan-300 flex items-center gap-1.5 cursor-pointer"><span>Join: {t.joinCode}</span>{copied === `j-${t.id}` ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}</button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {t.status === "PENDING" && (
                    <>
                      <button onClick={() => { soundManager.playClick(); setStatus.mutate({ id: t.id, action: "approve" }); }} className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-400 to-green-600 text-slate-950 font-title font-bold text-xs uppercase shadow hover:brightness-110"><CheckCircle2 size={13} /></button>
                      <button onClick={() => { soundManager.playClick(); setStatus.mutate({ id: t.id, action: "reject" }); }} className="px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-300 font-title font-bold text-xs"><X size={13} /></button>
                    </>
                  )}
                  {t.finished && !t.prizeDelivered && (
                    <button onClick={() => { soundManager.playClick(); markDelivered.mutate(t.id); }} disabled={markDelivered.isPending} className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white font-title font-bold text-xs flex items-center gap-1 cursor-pointer disabled:opacity-40 shadow" title="Confirm the prize was paid → removes it from the tournaments screen"><CheckCircle2 size={13} /> Prize delivered</button>
                  )}
                  {t.type === "GROUP" && (
                    <Link href={`/admin/tournament/${t.id}/groups`} onClick={() => soundManager.playClick()} className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-title font-bold text-xs flex items-center gap-1 cursor-pointer shadow" title="Draw & schedule the groups"><Layers size={13} /> Groups</Link>
                  )}
                  <Link href={`/admin/tournament/${t.id}/campaign`} onClick={() => soundManager.playClick()} className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-fuchsia-500/90 to-purple-600/90 text-white font-title font-bold text-xs flex items-center gap-1 cursor-pointer shadow" title="Sponsor Campaign & Cause Studio"><Megaphone size={13} /> Studio</Link>
                  <button onClick={() => startEdit(t)} className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-title font-bold text-xs flex items-center gap-1 cursor-pointer"><Pencil size={13} /> Edit</button>
                  <button onClick={() => { soundManager.playClick(); del.mutate(t.id); }} className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-300 font-title font-bold text-xs flex items-center gap-1 cursor-pointer"><Trash2 size={13} /> Delete</button>
                </div>
              </div>
            );})}
          </div>
        )}
      </div>
    </div>
  );
}
