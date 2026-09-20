"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarClock, CheckCircle2, Crown, Layers, Trophy, Users } from "lucide-react";
import {
  useAdminPromoTournaments,
  useTournamentGroups,
  useAssignGroups,
  type TournamentGroup,
} from "../../../../../lib/hooks/useSponsors";
import { soundManager } from "../../../../../lib/soundManager";

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " GMT";
}

export default function TournamentGroupsPage() {
  const params = useParams();
  const id = String(params.id);
  const { data: promos } = useAdminPromoTournaments();
  const tournament = (promos ?? []).find((t) => t.id === id);
  const { data: groupsData, isLoading } = useTournamentGroups(id);
  const assign = useAssignGroups();
  const [error, setError] = useState("");

  const durationDays = groupsData?.durationDays ?? tournament?.durationDays ?? 0;
  const stageGroups = useMemo(() => (groupsData?.groups ?? []).filter((g) => !g.isFinal), [groupsData]);
  const finalGroup = useMemo(() => (groupsData?.groups ?? []).find((g) => g.isFinal), [groupsData]);
  const schedule = groupsData?.schedule ?? [];
  const assigned = !!groupsData?.groupsAssignedAt;
  const entryClosed = !!groupsData?.entryClosesAt && Date.now() >= new Date(groupsData.entryClosesAt).getTime();
  const stageDays = Math.max(1, durationDays - 1); // group-stage days (final is the last day)

  async function doAssign() {
    setError("");
    soundManager.playClick();
    try {
      await assign.mutateAsync(id);
      soundManager.playVictory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not draw groups");
    }
  }

  return (
    <div className="flex flex-col gap-6 select-none font-sans">
      <div className="flex items-center gap-3">
        <Link href="/admin/tournament" onClick={() => soundManager.playClick()} className="px-3 py-1.5 rounded-xl bg-black/60 border border-slate-700 hover:border-amber-400 text-slate-300 text-xs font-title font-bold flex items-center gap-1.5 cursor-pointer"><ArrowLeft size={14} /> Tournaments</Link>
        <div>
          <div className="flex items-center gap-2 text-[10px] font-title font-black text-amber-400 tracking-widest uppercase"><Layers size={13} /><span>GROUP SCHEDULING</span></div>
          <h1 className="font-title font-black text-xl sm:text-2xl text-white">{tournament?.title ?? "Tournament"}</h1>
        </div>
      </div>

      {/* Status / assign */}
      <div className="rounded-3xl bg-gradient-to-b from-[#18281e]/98 to-[#060c08] border-2 border-amber-400/60 p-5 sm:p-6 shadow-xl flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
          <span className="flex items-center gap-1.5"><Users size={13} className="text-amber-300" /> {tournament?.entryCount ?? 0} entrants</span><span className="text-slate-600">·</span>
          <span>{durationDays}-day event ({stageDays} group day{stageDays > 1 ? "s" : ""} + final)</span><span className="text-slate-600">·</span>
          <span className={entryClosed ? "text-rose-300" : "text-amber-300"}>Entry {entryClosed ? "closed" : "closes"}: {fmtDate(groupsData?.entryClosesAt)}</span><span className="text-slate-600">·</span>
          <span className="flex items-center gap-1.5">Group size: <b className="text-white">{groupsData?.groupSize ?? 31}</b></span>
        </div>

        {!assigned ? (
          <div className="flex flex-col gap-3">
            {!entryClosed && (
              <p className="text-[11px] text-amber-200/90 bg-black/50 p-2.5 rounded-xl border border-amber-500/20">
                Entry hasn&apos;t closed yet. You can still draw the groups now for testing, but normally you&apos;d wait until entry closes (24h before the start) so every entrant is included.
              </p>
            )}
            <p className="text-[11px] text-slate-300/90 bg-black/40 p-2.5 rounded-xl border border-slate-700">
              Drawing groups also <b className="text-white">auto-schedules them evenly across the {stageDays} group day{stageDays > 1 ? "s" : ""}</b> — the final is fixed to day {durationDays || "?"}, where every group winner competes in one game.
            </p>
            <button onClick={doAssign} disabled={assign.isPending} className="self-start px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-title font-black text-sm uppercase tracking-wide shadow hover:brightness-110 cursor-pointer disabled:opacity-40 flex items-center gap-2">
              <Layers size={16} /> {assign.isPending ? "Drawing…" : "Draw & schedule groups"}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-title font-bold text-emerald-300"><CheckCircle2 size={14} /> Groups drawn &amp; auto-scheduled — {stageGroups.length} stage group{stageGroups.length !== 1 ? "s" : ""} spread across {stageDays} day{stageDays !== 1 ? "s" : ""} + a final.</div>
        )}
        {error && <div className="text-xs text-rose-400 font-bold">{error}</div>}
      </div>

      {/* Auto-schedule plan (read-only) */}
      {assigned && schedule.length > 0 && (
        <div className="rounded-3xl bg-gradient-to-b from-[#18281e]/98 to-[#060c08] border-2 border-amber-400/60 p-5 sm:p-6 shadow-xl flex flex-col gap-4">
          <h2 className="font-title font-black text-lg text-white flex items-center gap-2"><CalendarClock size={18} className="text-amber-300" /> Day-by-day schedule</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {schedule.map((d) => (
              <div key={d.day} className={`p-3 rounded-2xl border flex flex-col gap-1 ${d.isFinal ? "border-fuchsia-400/50 bg-fuchsia-500/10" : "border-slate-700 bg-black/50"}`}>
                <span className={`text-[11px] font-title font-black uppercase tracking-wider ${d.isFinal ? "text-fuchsia-200" : "text-amber-300"}`}>{d.isFinal ? "🏆 Final" : `Day ${d.day}`}</span>
                <span className="text-[11px] font-title font-bold text-white">{fmtDate(d.scheduledAt)}</span>
                <span className="text-[11px] text-slate-300">{d.isFinal ? `${d.playerCount.toLocaleString()} finalists` : `${d.groupCount} group${d.groupCount !== 1 ? "s" : ""} · ${d.playerCount.toLocaleString()} cows`}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Group roster (read-only) */}
      {assigned && stageGroups.length > 0 && (
        <div className="rounded-3xl bg-gradient-to-b from-[#18281e]/98 to-[#060c08] border-2 border-amber-400/60 p-5 sm:p-6 shadow-xl flex flex-col gap-4">
          <h2 className="font-title font-black text-lg text-white flex items-center gap-2"><Layers size={18} className="text-indigo-300" /> Groups</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stageGroups.map((g) => (
              <GroupCard key={g.id} g={g} />
            ))}
          </div>
          {finalGroup && (
            <div className="mt-1">
              <GroupCard g={finalGroup} isFinal />
            </div>
          )}
        </div>
      )}

      {isLoading && <div className="text-center text-slate-500 text-xs py-8">Loading groups…</div>}
    </div>
  );
}

function GroupCard({ g, isFinal }: { g: TournamentGroup; isFinal?: boolean }) {
  const statusColor = g.status === "DONE" ? "text-emerald-300" : g.status === "PLAYING" ? "text-amber-300" : "text-slate-400";
  return (
    <div className={`p-4 rounded-2xl bg-black/60 border ${isFinal ? "border-fuchsia-400/40" : "border-slate-800"} flex flex-col gap-2`}>
      <div className="flex items-center justify-between">
        <span className="font-title font-black text-sm text-white flex items-center gap-1.5">
          {isFinal ? <><Crown size={14} className="text-fuchsia-300" /> Final</> : <><Layers size={13} className="text-indigo-300" /> Group {g.index}</>}
        </span>
        <span className={`text-[10px] font-title font-black uppercase ${statusColor}`}>{g.status}</span>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
        <Users size={12} /> {g.members.length} player{g.members.length !== 1 ? "s" : ""}
        {g.day != null && <><span>·</span><span className="text-slate-300">Day {g.day}</span></>}
        {g.scheduledAt && <><span>·</span><span>{fmtDate(g.scheduledAt)}</span></>}
      </div>
      {g.winnerName && (
        <div className="flex items-center gap-1.5 text-[11px] font-title font-bold text-yellow-300"><Trophy size={12} className="fill-yellow-400 text-yellow-400" /> {g.winnerName}</div>
      )}
    </div>
  );
}
