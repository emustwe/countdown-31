"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Crown,
  Lock,
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
  useSponsors,
  type PromoTournament,
  type PromoType,
  type Visibility,
} from "../../../lib/hooks/useSponsors";
import { soundManager } from "../../../lib/soundManager";

const TEAM_COLORS = ["#5aa8ff", "#ff6b7f", "#5be348", "#f4b942", "#b48cff", "#38e0d0"];
const MAX_GROUPS = TEAM_COLORS.length;
const QUICK_SLOTS = ["12:00", "15:00", "18:00", "20:00", "22:00"];

interface TeamForm {
  name: string;
  captainName: string;
}
interface FormState {
  title: string;
  description: string;
  visibility: Visibility;
  sponsorId: string;
  type: PromoType;
  hasInfluencers: boolean;
  groupCount: number;
  teams: TeamForm[];
  minGroupPlayers: string;
  maxGroupPlayers: string;
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
  sponsorId: "",
  type: "REGULAR",
  hasInfluencers: false,
  groupCount: 2,
  teams: [
    { name: "", captainName: "" },
    { name: "", captainName: "" },
  ],
  minGroupPlayers: "",
  maxGroupPlayers: "",
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
function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " GMT";
}
function resizeTeams(teams: TeamForm[], n: number): TeamForm[] {
  const out = teams.slice(0, n);
  while (out.length < n) out.push({ name: "", captainName: "" });
  return out;
}

const inputCls = "w-full bg-black/80 border-2 border-slate-700 focus:border-amber-400 rounded-xl py-2.5 px-3.5 text-sm text-white outline-none transition-colors";
const labelCls = "text-[11px] font-title font-bold text-slate-300";

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
  const [slotDraft, setSlotDraft] = useState("");
  const [createdCodes, setCreatedCodes] = useState<{ title: string; hasInfluencers: boolean; teams: { name: string; captainName: string; captainCode: string; memberCode: string }[] } | null>(null);

  const isGroup = form.type === "INFLUENCER";
  const showCaptains = form.hasInfluencers; // captain/influencer name fields + captain codes
  const wantsTeams = isGroup || form.hasInfluencers;

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function setTeam(i: number, patch: Partial<TeamForm>) {
    setForm((f) => ({ ...f, teams: f.teams.map((t, idx) => (idx === i ? { ...t, ...patch } : t)) }));
  }
  function setType(next: PromoType) {
    soundManager.playClick();
    setForm((f) => ({ ...f, type: next }));
  }
  function setGroupCount(n: number) {
    const minTeams = form.type === "INFLUENCER" ? 2 : 1;
    const clamped = Math.max(minTeams, Math.min(MAX_GROUPS, n));
    setForm((f) => ({ ...f, groupCount: clamped, teams: resizeTeams(f.teams, clamped) }));
  }
  function setHasInfluencers(v: boolean) {
    soundManager.playClick();
    setForm((f) => (v && f.type === "REGULAR" ? { ...f, hasInfluencers: true, groupCount: 1, teams: resizeTeams(f.teams, 1) } : { ...f, hasInfluencers: v }));
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
    const gc = Math.max(1, Math.min(MAX_GROUPS, t.groupCount || 2));
    setForm({
      title: t.title,
      description: t.description,
      visibility: t.visibility,
      sponsorId: t.sponsor?.id ?? "",
      type: t.type ?? "REGULAR",
      hasInfluencers: !!t.hasInfluencers,
      groupCount: gc,
      teams: resizeTeams((t.teams ?? []).map((tm) => ({ name: tm.name, captainName: tm.captainName })), gc),
      minGroupPlayers: t.minGroupPlayers != null ? String(t.minGroupPlayers) : "",
      maxGroupPlayers: t.maxGroupPlayers != null ? String(t.maxGroupPlayers) : "",
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
    if (showCaptains && form.teams.some((t) => !t.captainName.trim())) {
      setError("Every influencer needs a name.");
      return;
    }
    if (isGroup && form.teams.some((t) => !t.name.trim())) {
      setError("Every group needs a name.");
      return;
    }
    const body = {
      title: form.title.trim(),
      description: form.description.trim(),
      visibility: form.visibility,
      type: form.type,
      hasInfluencers: form.hasInfluencers,
      startDate: form.startDate || null,
      timeOptions: form.timeOptions,
      prizePool: form.prizePool.trim(),
      winnerCount: isGroup ? 1 : Number(form.winnerCount) || 1,
      minPlayers: form.minPlayers === "" ? null : Number(form.minPlayers),
      maxPlayers: form.maxPlayers === "" ? null : Number(form.maxPlayers),
      sponsorId: form.visibility === "PRIVATE" ? null : form.sponsorId || null,
      seekingSponsor: false,
      ...(wantsTeams
        ? {
            groupCount: form.groupCount,
            teams: form.teams.map((t) => ({ name: t.name.trim(), captainName: t.captainName.trim() })),
            ...(isGroup
              ? {
                  minGroupPlayers: form.minGroupPlayers === "" ? null : Number(form.minGroupPlayers),
                  maxGroupPlayers: form.maxGroupPlayers === "" ? null : Number(form.maxGroupPlayers),
                }
              : {}),
          }
        : {}),
    };
    try {
      if (editingId) await update.mutateAsync({ id: editingId, ...body });
      else {
        const createdTitle = form.title.trim();
        const created = await create.mutateAsync(body);
        if (wantsTeams && created.teams?.length) {
          setCreatedCodes({
            title: createdTitle,
            hasInfluencers: form.hasInfluencers,
            teams: created.teams.map((t) => ({ name: t.name, captainName: t.captainName, captainCode: t.captainCode ?? "", memberCode: t.memberCode ?? "" })),
          });
        }
      }
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
          <p className="text-xs text-slate-400 mt-1">Create Regular knockouts and Group (team) tournaments, with players voting the GMT start time.</p>
        </div>
        <span className="px-3.5 py-1.5 rounded-xl bg-black/60 border border-amber-400/40 text-amber-300 font-title font-bold text-xs">{list.length} Total</span>
      </div>

      {/* Post-create code reveal */}
      {createdCodes && (
        <div className="rounded-3xl bg-gradient-to-b from-[#18281e]/98 to-[#060c08] border-2 border-amber-400/70 p-5 sm:p-6 shadow-xl flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-title font-black text-lg text-amber-300">{createdCodes.hasInfluencers ? "Invite codes" : "Group codes"} — {createdCodes.title}</h2>
            <button onClick={() => setCreatedCodes(null)} className="px-3 py-1.5 rounded-xl bg-black/60 border border-slate-700 hover:border-amber-400 text-slate-300 text-xs font-title font-bold flex items-center gap-1.5 cursor-pointer"><X size={14} /> Done</button>
          </div>
          <p className="text-xs text-slate-400">{createdCodes.hasInfluencers ? "Give each influencer their code (special card); they share the player code with followers." : "Share each group's player code with the players who should join it."}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {createdCodes.teams.map((t, i) => (
              <div key={i} className="p-3 rounded-2xl bg-black/60 border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: TEAM_COLORS[i % TEAM_COLORS.length] }} /><b className="text-sm text-white">{t.name}</b>{createdCodes.hasInfluencers && t.captainName && <span className="text-xs text-slate-400">· {t.captainName}</span>}</div>
                {createdCodes.hasInfluencers && (
                  <button onClick={() => copyCode(t.captainCode, `cc-${i}`)} className="text-left px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-amber-400 text-[11px] font-mono text-amber-300 flex items-center gap-1.5 cursor-pointer"><Crown size={11} /> Influencer: {t.captainCode} {copied === `cc-${i}` ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}</button>
                )}
                <button onClick={() => copyCode(t.memberCode, `mc-${i}`)} className="text-left px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-amber-400 text-[11px] font-mono text-cyan-300 flex items-center gap-1.5 cursor-pointer"><Users size={11} /> Player: {t.memberCode} {copied === `mc-${i}` ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}</button>
              </div>
            ))}
          </div>
        </div>
      )}

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
            <span><b className="block font-title font-black text-white text-sm">Regular tournament</b><small className="text-xs text-slate-400">A standard knockout — last player standing wins.</small></span>
          </button>
          <button type="button" onClick={() => setType("INFLUENCER")} className={`p-4 rounded-2xl border-2 text-left flex items-start gap-3 transition-all cursor-pointer ${isGroup ? "border-amber-400 bg-amber-400/10" : "border-slate-700 bg-black/50 hover:border-slate-500"}`}>
            <Users size={20} className="text-amber-300 mt-0.5" />
            <span><b className="block font-title font-black text-white text-sm">Group tournament</b><small className="text-xs text-slate-400">Players split into groups; last one standing wins for their group.</small></span>
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

          {/* Influencers toggle (both types) */}
          <div className="flex flex-col gap-1">
            <span className={labelCls}>Influencers</span>
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-black/80 border border-slate-700">
              <button type="button" onClick={() => setHasInfluencers(true)} className={`py-1.5 rounded-lg font-title font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer ${form.hasInfluencers ? "bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950" : "text-slate-400 hover:text-white"}`}><Crown size={13} /> Included</button>
              <button type="button" onClick={() => setHasInfluencers(false)} className={`py-1.5 rounded-lg font-title font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer ${!form.hasInfluencers ? "bg-gradient-to-r from-slate-500 to-slate-700 text-white" : "text-slate-400 hover:text-white"}`}><X size={13} /> Not included</button>
            </div>
          </div>

          {/* Sponsor (public only) */}
          {form.visibility === "PUBLIC" ? (
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Sponsor (optional)</span>
              <select value={form.sponsorId} onChange={(e) => set("sponsorId", e.target.value)} className={inputCls}>
                <option value="">House tournament</option>
                {(sponsors ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
          ) : (
            <div className="flex flex-col gap-1 justify-center"><span className={labelCls}>Sponsor</span><p className="text-[11px] text-amber-300/80 bg-black/50 p-2 rounded-xl border border-amber-500/20">A sponsor + join code are generated on save.</p></div>
          )}

          {/* Group: number of groups + per-group sizes */}
          {isGroup && (
            <>
              <label className="flex flex-col gap-1">
                <span className={labelCls}>Number of groups</span>
                <select value={form.groupCount} onChange={(e) => setGroupCount(Number(e.target.value))} className={inputCls}>
                  {Array.from({ length: MAX_GROUPS - 1 }, (_, i) => i + 2).map((n) => <option key={n} value={n}>{n} groups</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1"><span className={labelCls}>Min players / group</span><input type="number" min={0} value={form.minGroupPlayers} onChange={(e) => set("minGroupPlayers", e.target.value)} placeholder="e.g. 5" className={inputCls} /></label>
              <label className="flex flex-col gap-1"><span className={labelCls}>Max players / group</span><input type="number" min={0} value={form.maxGroupPlayers} onChange={(e) => set("maxGroupPlayers", e.target.value)} placeholder="e.g. 20" className={inputCls} /></label>
            </>
          )}

          {/* Regular + influencers: number of influencers */}
          {!isGroup && form.hasInfluencers && (
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Number of influencers</span>
              <select value={form.groupCount} onChange={(e) => setGroupCount(Number(e.target.value))} className={inputCls}>
                {Array.from({ length: MAX_GROUPS }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n} influencer{n > 1 ? "s" : ""}</option>)}
              </select>
            </label>
          )}

          {/* Team / influencer name inputs */}
          {wantsTeams && (
            <div className="sm:col-span-2 lg:col-span-3 flex flex-col gap-2">
              <span className={labelCls}>{isGroup ? (showCaptains ? "Groups & influencer-captains" : "Group names") : "Featured influencers"}</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {form.teams.map((tm, i) => (
                  <div key={i} className="p-3 rounded-2xl bg-black/60 border border-slate-800 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: TEAM_COLORS[i % TEAM_COLORS.length] }} />
                    {isGroup && <input value={tm.name} onChange={(e) => setTeam(i, { name: e.target.value })} placeholder={`Group ${i + 1} name`} className="flex-1 bg-transparent border-b border-slate-700 focus:border-amber-400 text-sm text-white outline-none py-1" />}
                    {showCaptains && <input value={tm.captainName} onChange={(e) => setTeam(i, { captainName: e.target.value })} placeholder={isGroup ? "Captain" : `Influencer ${i + 1}`} className="flex-1 bg-transparent border-b border-slate-700 focus:border-amber-400 text-sm text-white outline-none py-1" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Start date (GMT) + prize */}
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

          {/* Regular: player range */}
          {!isGroup && (
            <>
              <label className="flex flex-col gap-1"><span className={labelCls}>Min players</span><input type="number" min={0} value={form.minPlayers} onChange={(e) => set("minPlayers", e.target.value)} placeholder="e.g. 10" className={inputCls} /></label>
              <label className="flex flex-col gap-1"><span className={labelCls}>Max players</span><input type="number" min={0} value={form.maxPlayers} onChange={(e) => set("maxPlayers", e.target.value)} placeholder="e.g. 500" className={inputCls} /></label>
            </>
          )}

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
        <div className="flex items-center justify-between pb-3 border-b border-amber-500/30">
          <h2 className="font-title font-black text-xl text-white">All tournaments</h2>
          <span className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300"><Trophy size={16} /></span>
        </div>
        {list.length === 0 ? (
          <div className="py-12 text-center text-slate-500 font-title font-bold text-xs">No tournaments yet — create your first above.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {list.map((t) => (
              <div key={t.id} className="p-4 sm:p-5 rounded-2xl bg-black/60 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-amber-400/50 transition-colors">
                <div className="flex flex-col gap-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-title font-black text-base text-white">{t.title}</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-title font-black uppercase bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center gap-1">{t.type === "INFLUENCER" ? <><Users size={10} /> Group</> : <><Trophy size={10} /> Regular</>}</span>
                    {t.hasInfluencers && <span className="px-2 py-0.5 rounded-full text-[9px] font-title font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1"><Crown size={10} /> Influencers</span>}
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-title font-black uppercase flex items-center gap-1 ${t.visibility === "PRIVATE" ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"}`}>{t.visibility === "PRIVATE" ? <Lock size={10} /> : <Unlock size={10} />} {t.visibility}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-title font-black uppercase ${t.status === "APPROVED" ? "bg-emerald-500 text-slate-950" : t.status === "PENDING" ? "bg-amber-500 text-slate-950" : "bg-slate-700 text-white"}`}>{t.status}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap text-xs text-slate-400">
                    <span>{t.sponsor ? `Sponsor: ${t.sponsor.name}` : "House"}</span><span>·</span>
                    <span className="text-emerald-400 font-bold">Prize: {t.prizePool || "—"}</span><span>·</span>
                    {t.type === "INFLUENCER" ? <span>{t.groupCount} groups</span> : <span>{t.winnerCount} winner(s)</span>}<span>·</span>
                    <span>Start: {fmtDate(t.startAt)}</span>
                    {t.timeOptions?.length > 0 && <><span>·</span><span className="text-amber-300">Vote: {t.timeOptions.join(", ")} GMT</span></>}<span>·</span>
                    <span className="text-amber-300">{t.entryCount} joined</span>
                  </div>
                  {(t.teams?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {t.teams.map((tm) => (
                        <span key={tm.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[10px]">
                          <span className="w-2 h-2 rounded-full" style={{ background: tm.color }} /><span className="text-slate-300">{tm.name} ({tm.memberCount})</span>
                          {t.hasInfluencers && <button onClick={() => copyCode(tm.captainCode ?? "", `cc-${tm.id}`)} className="font-mono text-amber-300 flex items-center gap-1 cursor-pointer"><Crown size={10} /> {tm.captainCode} {copied === `cc-${tm.id}` ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}</button>}
                          <button onClick={() => copyCode(tm.memberCode ?? "", `mc-${tm.id}`)} className="font-mono text-cyan-300 flex items-center gap-1 cursor-pointer"><Users size={10} /> {tm.memberCode} {copied === `mc-${tm.id}` ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}</button>
                        </span>
                      ))}
                    </div>
                  )}
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
                  <Link href={`/admin/tournament/${t.id}/campaign`} className="px-3 py-1.5 rounded-xl bg-lime-400/20 border border-lime-300/60 hover:bg-lime-400/30 text-lime-300 font-title font-bold text-xs flex items-center gap-1 cursor-pointer"><Sparkles size={13} /> Sponsor Studio</Link>
                  <button onClick={() => startEdit(t)} className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-title font-bold text-xs flex items-center gap-1 cursor-pointer"><Pencil size={13} /> Edit</button>
                  <button onClick={() => { soundManager.playClick(); del.mutate(t.id); }} className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-300 font-title font-bold text-xs flex items-center gap-1 cursor-pointer"><Trash2 size={13} /> Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
