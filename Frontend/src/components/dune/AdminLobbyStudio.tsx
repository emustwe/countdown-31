"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Image as ImageIcon, LayoutTemplate, Megaphone, Save, Upload, WandSparkles } from "lucide-react";
import { DEFAULT_THEME_LOBBY, type GameTheme, type ThemeLobby } from "../../lib/game-config";
import { useGameThemes, useSaveGameTheme, useUploadGameBackground } from "../../lib/hooks/useGameConfig";
import { TournamentLobby } from "./TournamentLobby";
import { soundManager } from "../../lib/soundManager";

/** Sample lobby state for the preview — a tournament starting in ~6 minutes. */
const PV_SCHEDULE = [
  { day: 1, scheduledAt: new Date(Date.now() + 6 * 60_000).toISOString(), isFinal: false, groupCount: 17, playerCount: 527 },
  { day: 2, scheduledAt: new Date(Date.now() + 864e5).toISOString(), isFinal: false, groupCount: 17, playerCount: 527 },
  { day: 3, scheduledAt: new Date(Date.now() + 2 * 864e5).toISOString(), isFinal: true, groupCount: 1, playerCount: 34 },
];

/**
 * LOBBY STUDIO — simple customisation for the tournament lobby (waiting) screen: backdrop, darkness,
 * a notice line and a sponsor ad banner. Settings are saved onto the selected sponsor THEME
 * (`GameTheme.lobby`), so the lobby and the arena share one theme per tournament.
 */
export function AdminLobbyStudio() {
  const themesQuery = useGameThemes();
  const themes = useMemo(() => themesQuery.data ?? [], [themesQuery.data]);
  const saveTheme = useSaveGameTheme();
  const uploadBg = useUploadGameBackground();
  const uploadAd = useUploadGameBackground();

  const [themeId, setThemeId] = useState<string>("");
  const [lobby, setLobby] = useState<ThemeLobby>(DEFAULT_THEME_LOBBY);
  const [savedFlash, setSavedFlash] = useState(false);

  const selected: GameTheme | null = themes.find((t) => t.id === themeId) ?? null;

  // Select the first theme once they load, and mirror its lobby settings into the editor.
  useEffect(() => {
    if (!themeId && themes.length) setThemeId(themes[0]!.id);
  }, [themes, themeId]);
  useEffect(() => {
    if (selected) setLobby({ ...DEFAULT_THEME_LOBBY, ...(selected.lobby ?? {}) });
  }, [selected]);

  const dirty = useMemo(
    () => (selected ? JSON.stringify({ ...DEFAULT_THEME_LOBBY, ...(selected.lobby ?? {}) }) !== JSON.stringify(lobby) : false),
    [selected, lobby],
  );

  async function handleUpload(file: File | undefined, key: "backgroundImage" | "bannerImage") {
    if (!file) return;
    soundManager.playClick();
    const url = await (key === "backgroundImage" ? uploadBg : uploadAd).mutateAsync(file);
    setLobby((current) => ({ ...current, [key]: url }));
  }

  async function save() {
    if (!selected) return;
    soundManager.playConfirm();
    await saveTheme.mutateAsync({ ...selected, lobby });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2200);
  }

  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* Toolbar — which theme's lobby you're editing + save */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-400/40 bg-black/70 px-4 py-3 shadow-xl">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-400/15 text-amber-300">
          <LayoutTemplate size={18} />
        </span>
        <span className="leading-tight">
          <small className="block text-[9px] font-black uppercase tracking-[.22em] text-slate-500">Admin console</small>
          <b className="font-title text-base font-black text-white">Lobby Studio</b>
        </span>
        <span
          className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-300 transition-opacity ${dirty && !savedFlash ? "opacity-100" : "opacity-0"}`}
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300" /> Unsaved
        </span>
        <span className="flex-1" />
        <span className="w-52 shrink-0">
          <select className="studio-input h-11 !py-1" value={themeId} onChange={(e) => setThemeId(e.target.value)} aria-label="Theme">
            {themes.length === 0 && <option value="">No themes yet</option>}
            {themes.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </span>
        <button
          onClick={save}
          disabled={!selected || saveTheme.isPending}
          className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 px-6 font-title text-xs font-black uppercase tracking-wider text-slate-950 shadow-[0_0_18px_rgba(245,158,11,.45)] transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Save size={15} />
          {saveTheme.isPending ? "Saving…" : "Save lobby"}
        </button>
      </div>

      {(savedFlash || saveTheme.isError) && (
        <div className={`rounded-2xl border p-3 text-sm ${saveTheme.isError ? "border-rose-500 bg-rose-950/70 text-rose-200" : "border-emerald-400/50 bg-emerald-950/60 text-emerald-200"}`}>
          {saveTheme.isError
            ? saveTheme.error instanceof Error ? saveTheme.error.message : "Could not save."
            : "Lobby saved ✓ — it applies to every tournament using this theme."}
        </div>
      )}

      {themes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-black/40 p-10 text-center text-sm text-slate-400">
          No sponsor themes yet. Create one in <b className="text-amber-300">Game Studio</b> first — the lobby is customised per theme.
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 xl:h-[calc(100vh-190px)] xl:min-h-[620px] xl:grid-cols-[400px_minmax(0,1fr)]">
          {/* ── controls ── */}
          <aside className="flex min-h-0 flex-col gap-2.5 xl:h-full xl:overflow-y-auto">
            <div className="flex flex-col gap-3.5 rounded-2xl border border-amber-400/40 bg-[#0b140e] p-4">
              <b className="flex items-center gap-2 font-title text-sm font-black text-white">
                <ImageIcon size={15} className="text-amber-300" /> Backdrop
              </b>
              <div
                className="h-24 rounded-xl border border-white/10 bg-cover bg-center"
                style={{ backgroundImage: `url('${lobby.backgroundImage || selected?.backgroundImage || "/assets/barnaby/barnaby-field.jpg"}')` }}
              />
              <label className="studio-secondary flex cursor-pointer items-center justify-center gap-2 border-dashed py-2.5 text-xs">
                <Upload size={14} />
                <span>{uploadBg.isPending ? "Uploading…" : "Upload lobby background"}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  disabled={uploadBg.isPending}
                  onChange={(e) => { void handleUpload(e.target.files?.[0], "backgroundImage"); e.target.value = ""; }}
                />
              </label>
              {lobby.backgroundImage && (
                <button type="button" onClick={() => setLobby({ ...lobby, backgroundImage: "" })} className="studio-secondary justify-center py-1.5 text-[11px]">
                  Use the theme&apos;s arena backdrop
                </button>
              )}
              <label className="flex flex-col gap-1.5">
                <span className="flex items-end justify-between text-xs font-title font-black text-slate-200">
                  Darkness <small className="font-sans font-medium text-slate-500">{Math.round(lobby.overlayOpacity * 100)}%</small>
                </span>
                <input
                  type="range"
                  min="0"
                  max="0.9"
                  step="0.05"
                  value={lobby.overlayOpacity}
                  onChange={(e) => setLobby({ ...lobby, overlayOpacity: Number(e.target.value) })}
                />
              </label>
            </div>

            <div className="flex flex-col gap-3.5 rounded-2xl border border-white/10 bg-[#0b140e] p-4">
              <b className="flex items-center gap-2 font-title text-sm font-black text-white">
                <Megaphone size={15} className="text-amber-300" /> Notice &amp; advertisement
              </b>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-title font-black text-slate-200">Notice line</span>
                <input
                  className="studio-input"
                  maxLength={160}
                  placeholder="e.g. Doors open 18:00 GMT — good luck!"
                  value={lobby.notice}
                  onChange={(e) => setLobby({ ...lobby, notice: e.target.value })}
                />
              </label>
              <span className="text-xs font-title font-black text-slate-200">Sponsor banner</span>
              {lobby.bannerImage && (
                <div className="grid h-16 place-items-center rounded-xl border border-white/10 bg-black/60 p-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={lobby.bannerImage} alt="" className="max-h-full max-w-full object-contain" />
                </div>
              )}
              <label className="studio-secondary flex cursor-pointer items-center justify-center gap-2 border-dashed py-2.5 text-xs">
                <Upload size={14} />
                <span>{uploadAd.isPending ? "Uploading…" : "Upload banner"}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                  className="sr-only"
                  disabled={uploadAd.isPending}
                  onChange={(e) => { void handleUpload(e.target.files?.[0], "bannerImage"); e.target.value = ""; }}
                />
              </label>
              {lobby.bannerImage && (
                <button type="button" onClick={() => setLobby({ ...lobby, bannerImage: "" })} className="studio-secondary justify-center py-1.5 text-[11px]">
                  Remove banner
                </button>
              )}
              <p className="rounded-xl border border-amber-400/25 bg-amber-400/5 p-3 text-[10px] leading-relaxed text-amber-200/90">
                The lobby is where players wait before a match — a captive audience with nothing else on
                screen. The banner scales to fit phone and desktop automatically.
              </p>
            </div>
          </aside>

          {/* ── live preview: the REAL lobby component ── */}
          <section className="flex min-h-0 flex-col gap-3 xl:h-full">
            <div className="flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-black/65 px-4 py-2.5 shadow-xl">
              <WandSparkles size={15} className="text-amber-300" />
              <b className="text-[10px] font-black uppercase tracking-[.2em] text-slate-300">Lobby preview</b>
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live
              </span>
              <span className="ml-auto hidden text-[10px] font-bold text-slate-500 sm:block">The real lobby screen</span>
            </div>
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-amber-400/30 bg-black/50 shadow-2xl">
              <TournamentLobby
                embedded
                title={selected?.gameTitle || selected?.name || "Tournament"}
                isPrivate={false}
                isGroup
                group={{ index: 1, day: 1, scheduledAt: PV_SCHEDULE[0]!.scheduledAt, isFinal: false }}
                winnerCount={1}
                entryCount={527}
                enterMs={Date.now() + 6 * 60_000}
                now={Date.now()}
                schedule={PV_SCHEDULE}
                myDay={1}
                accent={selected?.primaryColor || "#fbbf24"}
                backgroundImage={selected?.backgroundImage || null}
                lobby={lobby}
                onBack={() => {}}
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
