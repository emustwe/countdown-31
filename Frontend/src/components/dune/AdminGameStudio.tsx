"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  ChevronRight,
  Eye,
  Gamepad2,
  GripVertical,
  Image as ImageIcon,
  LayoutDashboard,
  Megaphone,
  Menu,
  Palette,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  Sparkles,
  Trash2,
  Type,
  Upload,
  WandSparkles,
  Zap,
} from "lucide-react";
import {
  cloneGameConfig,
  DEFAULT_GAME_CONFIG,
  type AdminBotConfig,
  type AdminMenuItemConfig,
  type AdminSkillConfig,
  DEFAULT_THEME_ADS,
  type GameConfig,
  type GameTheme,
  type ThemeAds,
} from "../../lib/game-config";
import {
  useGameConfig,
  useResetGameConfig,
  useSaveGameConfig,
  useUploadGameBackground,
  useGameThemes,
  useSaveGameTheme,
  useDeleteGameTheme,
} from "../../lib/hooks/useGameConfig";
import { AVATAR_VARIANTS } from "../../lib/avatar-catalog";
import { MasterAvatar } from "./MasterAvatar";
import { NumberBoard } from "./NumberBoard";
import { ArenaRoster } from "./ArenaRoster";
import { ArenaAdBanners } from "./ArenaAdBanners";
import type { LivePlayer } from "../../lib/hooks/useCountdownLive";
import { soundManager } from "../../lib/soundManager";

type IconType = typeof Sparkles;
type StudioStep = "branding" | "arena" | "ads" | "themes";

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full border transition-all ${checked ? "border-emerald-300 bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,.45)]" : "border-slate-600 bg-slate-800"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`}
      />
    </button>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-end justify-between gap-2 text-xs font-title font-black text-slate-200">
        {label}
        {hint && <small className="font-sans font-medium text-slate-500">{hint}</small>}
      </span>
      {children}
    </label>
  );
}

function SwitchRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-black/45 p-3.5">
      <span>
        <b className="block font-title text-sm text-white">{label}</b>
        <small className="text-[11px] text-slate-400">{hint}</small>
      </span>
      <Toggle checked={value} onChange={onChange} label={label} />
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  copy,
}: {
  icon: IconType;
  title: string;
  copy: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-11 w-11 place-items-center rounded-2xl border border-amber-400/50 bg-amber-400/10 text-amber-300">
        <Icon size={20} />
      </span>
      <span>
        <h2 className="font-title text-xl font-black text-white">{title}</h2>
        <p className="text-xs text-slate-400">{copy}</p>
      </span>
    </div>
  );
}

function Panel({
  title,
  copy,
  icon,
  action,
  children,
}: {
  title: string;
  copy: string;
  icon: IconType;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <SectionTitle icon={icon} title={title} copy={copy} />
        {action}
      </div>
      {children}
    </div>
  );
}

/** A compact labelled option row (used for the board / tile / arena-list style pickers). */
function StylePicker<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-title font-black text-slate-200">{label}</span>
      <div className="grid grid-cols-2 gap-1.5">
        {options.map(([v, text]) => (
          <button
            key={v}
            type="button"
            onClick={() => { soundManager.playClick(); onChange(v); }}
            className={`rounded-lg border py-2 text-[10px] font-black uppercase tracking-wider transition-all ${value === v ? "border-amber-300 bg-amber-400 text-slate-950" : "border-white/10 bg-black/40 text-slate-400 hover:text-white"}`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function moveItem<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item === undefined) return items;
  next.splice(to, 0, item);
  return next;
}

/** Fit a fixed-design-size stage into whatever box the frame provides — the same scale-to-fit idea
 * the real arena uses, so the embedded game components render at their true design size. */
function useFitScale(ref: React.RefObject<HTMLDivElement | null>, w: number, h: number) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => setScale(Math.max(0.2, Math.min(el.clientWidth / w, el.clientHeight / h)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, w, h]);
  return scale;
}

// A frozen mid-game moment for the live preview, rendered by the SAME components the tournament
// uses (NumberBoard + ArenaRoster): gold ribbon to 12, Daisy live-picking 13–14 (cyan), the red 31
// doom cell, and the roster with the turn arrow on Daisy + the cyan YOU row.
const PV_PLAYERS: LivePlayer[] = [
  { id: "you", name: "You", cpu: false, color: "#35D6E8" },
  { id: "daisy", name: "Daisy 🌸", cpu: true, color: "#F5C542" },
  { id: "bessie", name: "Bessie 🐮", cpu: true, color: "#F472B6" },
  { id: "barnaby", name: "Barnaby 👑", cpu: true, color: "#A78BFA" },
  { id: "nova", name: "Nova ✨", cpu: true, color: "#5BE348" },
];
const PV_TAKEN = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, "#F5C542"])) as Record<number, string>;
const PV_STAGE_W = 1010;
const PV_STAGE_H = 440;

/** The pinned LIVE PREVIEW — the players' exact view. Background, darkness and the brand lockup come
 * straight from the draft; the number board and roster are the REAL in-game components on a
 * scale-to-fit stage, so what you see here is what the tournament screen renders. */
function ArenaLivePreview({ config, ads }: { config: GameConfig; ads: ThemeAds }) {
  const holdRef = useRef<HTMLDivElement | null>(null);
  const scale = useFitScale(holdRef, PV_STAGE_W, PV_STAGE_H);
  const primary = config.arena.primaryColor;
  const overlay = config.arena.overlayOpacity;
  const cows = AVATAR_VARIANTS.slice(0, 3);
  // A logo REPLACES the wordmark (either/or), and the tagline only exists in name mode.
  const logoMode = !!config.branding.logoUrl;
  // The brand assets reused as in-arena ad surfaces (board watermark + roster banner).
  const adBrand = {
    logoUrl: config.branding.logoUrl || undefined,
    name: config.branding.gameTitle || undefined,
    color: primary,
    watermark: ads.boardWatermark,
    watermarkOpacity: ads.boardWatermarkOpacity,
    boardImage: ads.boardImage || undefined,
    boardStyle: ads.boardStyle,
    tileStyle: ads.tileStyle,
  };
  // Roster keeps only its panel STYLE (brand tint needs the colour) — no bottom banner any more.
  const adRoster = { color: primary };
  // Marquee placement (left / centre / right) — matches the live arena lockup position.
  const placeCls =
    ads.placement === "topCenter"
      ? "left-1/2 -translate-x-1/2"
      : ads.placement === "topRight"
        ? "right-3"
        : "left-3";

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-2xl border-2 bg-cover bg-center shadow-[0_25px_70px_rgba(0,0,0,.75)]"
      style={{
        borderColor: `${primary}99`,
        backgroundColor: "#08140d",
        backgroundImage: config.arena.backgroundImage ? `url('${config.arena.backgroundImage}')` : undefined,
      }}
    >
      {/* darkness scrim — the same overlay the arena applies */}
      <div className="absolute inset-0" style={{ background: `rgba(2,8,5,${overlay})` }} />

      {/* AD SURFACE 1 — the marquee. EITHER the logo OR the name+tagline, never both (a logo already
          carries the wordmark, so pairing them double-brands the corner). */}
      <div
        className={`absolute top-3 z-20 flex items-center rounded-2xl border-2 px-3.5 py-2 shadow-[0_8px_26px_rgba(0,0,0,.8)] ${placeCls}`}
        style={{ borderColor: primary, background: "linear-gradient(180deg,rgba(14,26,19,.94),rgba(4,9,6,.96))" }}
      >
        {logoMode ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={config.branding.logoUrl} alt="Brand logo" className="shrink-0 object-contain" style={{ maxHeight: 40, maxWidth: 140 }} />
        ) : (
          <span className="flex flex-col leading-none">
            <span className="brand-wordmark" style={{ fontSize: 20, lineHeight: 0.9, color: primary }}>
              {config.branding.gameTitle || "YOUR BRAND"}
            </span>
            {config.branding.subtitle && (
              <span className="brand-tagline" style={{ fontSize: 8, marginTop: 3 }}>{config.branding.subtitle}</span>
            )}
          </span>
        )}
      </div>

      {/* Extra sponsor banners in the top slots the marquee isn't using (centre + opposite side). */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 19, fontSize: 13 }}>
        <ArenaAdBanners ads={ads} />
      </div>

      {/* the arena composition — arc rail · REAL number board · REAL roster, scaled to fit */}
      <div ref={holdRef} className="absolute inset-x-3 bottom-3 top-16">
        <div
          className="absolute left-1/2 top-1/2"
          style={{ width: PV_STAGE_W, height: PV_STAGE_H, transform: `translate(-50%,-50%) scale(${scale})` }}
        >
          {/* roster column is 300px — the REAL in-game ROSTER_W — so names render exactly like the game */}
          <div className="grid h-full grid-cols-[110px_minmax(0,1fr)_300px] items-stretch gap-5">
            {/* arc rail — three cows curving in from the left, the active player enlarged + ringed */}
            <div className="relative">
              {cows.map((c, i) => {
                const P = [
                  { x: 42, y: 52, s: 50 },
                  { x: 10, y: 176, s: 74 },
                  { x: 42, y: 306, s: 50 },
                ][i]!;
                const active = i === 1; // Daisy — matches the roster's current turn
                return (
                  <div
                    key={c.id}
                    className="absolute"
                    style={{
                      left: P.x,
                      top: P.y,
                      width: P.s,
                      height: P.s,
                      borderRadius: 16,
                      boxShadow: active ? `0 0 0 3px ${primary}, 0 0 22px ${primary}88` : "0 4px 14px rgba(0,0,0,.55)",
                    }}
                  >
                    <MasterAvatar
                      config={{ variantId: c.id, backgroundId: (active ? "emerald" : "frost") as never, frameId: (active ? "mythic_gold" : "neon_glacier") as never }}
                      className="h-full w-full"
                    />
                  </div>
                );
              })}
            </div>

            {/* the REAL number board — serpentine track, gold ribbon, cyan live pick, red 31.
                AD SURFACE 2: the sponsor's mark is ghosted onto the felt + the frame takes the brand tint. */}
            <div className="min-w-0">
              <NumberBoard
                total={12}
                taken={PV_TAKEN}
                picks={[]}
                highlight={[13, 14]}
                onSelect={() => {}}
                myTurn={false}
                ticker="Daisy Cow 🌸 is choosing…"
                brand={adBrand}
              />
            </div>

            {/* the REAL arena roster — turn arrow on Daisy, YOU row in cyan.
                AD SURFACE 3: sponsor banner docked at the foot of the arena list. */}
            <ArenaRoster
              players={PV_PLAYERS}
              currentId="daisy"
              myId="you"
              status="playing"
              style={{ width: "100%", height: "100%", pointerEvents: "none" }}
              sponsor={adRoster}
              rosterStyle={ads.rosterStyle}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminGameStudio() {
  const { data: stored } = useGameConfig();
  const save = useSaveGameConfig();
  const reset = useResetGameConfig();
  const uploadBackground = useUploadGameBackground();
  // Same generic asset endpoint, independent mutation state — used for the brand logo image.
  const uploadLogo = useUploadGameBackground();
  // Same generic asset endpoint; independent mutation state per ad surface.
  const uploadBoard = useUploadGameBackground();
  const uploadBanner = useUploadGameBackground();
  const uploadCenterAd = useUploadGameBackground();
  const uploadOppositeAd = useUploadGameBackground();
  const [draft, setDraft] = useState(() => cloneGameConfig(stored));
  // ACCORDION: exactly one of Brand / Arena / Themes is open at a time, so the sidebar shows one
  // short list instead of three stacked walls of controls.
  const [step, setStep] = useState<StudioStep>("branding");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  function goTo(section: StudioStep) {
    setStep(section);
  }

  // BRAND MODE — the arena shows EITHER a logo OR the name+tagline, never both. The renderers derive
  // that from the data (a non-empty logoUrl ⇒ logo-only), so studio/preview/live arena can't drift.
  // The picker needs its own state too, so you can enter logo mode *before* uploading anything;
  // leaving logo mode parks the logo so flipping back doesn't lose the upload.
  const [brandMode, setBrandModeState] = useState<"name" | "logo">(() =>
    stored?.branding.logoUrl ? "logo" : "name",
  );
  const parkedLogo = useRef("");

  // AD SURFACES — saved with the theme (GameTheme.ads) and applied to the live arena.
  const [ads, setAds] = useState<ThemeAds>(DEFAULT_THEME_ADS);
  async function handleAdUpload(
    file: File | undefined,
    key: "boardImage" | "rosterBannerImage" | "bannerCenterImage" | "bannerOppositeImage",
  ) {
    if (!file) return;
    soundManager.playClick();
    const mut =
      key === "boardImage" ? uploadBoard
      : key === "rosterBannerImage" ? uploadBanner
      : key === "bannerCenterImage" ? uploadCenterAd
      : uploadOppositeAd;
    const url = await mut.mutateAsync(file);
    setAds((current) => ({ ...current, [key]: url }));
  }
  function setBrandMode(mode: "name" | "logo") {
    if (mode === brandMode) return;
    if (mode === "name") {
      parkedLogo.current = draft.branding.logoUrl;
      patch("branding", { logoUrl: "" }); // clearing the logo is what makes the name render
    } else if (parkedLogo.current) {
      patch("branding", { logoUrl: parkedLogo.current });
    }
    setBrandModeState(mode);
  }

  // Theme registry — the studio now MANAGES named sponsor themes (brand + backdrop) picked at
  // tournament creation, rather than editing the global config.
  const themesQuery = useGameThemes();
  const themes = themesQuery.data ?? [];
  const saveThemeMut = useSaveGameTheme();
  const deleteThemeMut = useDeleteGameTheme();
  const [themeName, setThemeName] = useState("");
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
  const themeId = useMemo(
    () => editingThemeId ?? themeName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48),
    [editingThemeId, themeName],
  );

  function loadTheme(theme: GameTheme) {
    soundManager.playClick();
    setDraft((current) => ({
      ...current,
      branding: { ...current.branding, gameTitle: theme.gameTitle, subtitle: theme.subtitle, logoUrl: theme.logoUrl },
      arena: {
        ...current.arena,
        backgroundImage: theme.backgroundImage,
        overlayOpacity: theme.overlayOpacity,
        primaryColor: theme.primaryColor,
        secondaryColor: theme.secondaryColor,
      },
    }));
    setThemeName(theme.name);
    setEditingThemeId(theme.id);
    setBrandModeState(theme.logoUrl ? "logo" : "name");
    setAds({ ...DEFAULT_THEME_ADS, ...(theme.ads ?? {}) });
    goTo("branding");
  }
  function newTheme() {
    soundManager.playClick();
    setDraft(cloneGameConfig(DEFAULT_GAME_CONFIG));
    setThemeName("");
    setEditingThemeId(null);
    setBrandModeState(DEFAULT_GAME_CONFIG.branding.logoUrl ? "logo" : "name");
    setAds(DEFAULT_THEME_ADS);
    goTo("branding");
  }
  async function publishTheme() {
    if (!themeName.trim() || !themeId) return;
    soundManager.playConfirm();
    const theme: GameTheme = {
      id: themeId,
      name: themeName.trim().slice(0, 80),
      gameTitle: draft.branding.gameTitle,
      subtitle: draft.branding.subtitle,
      logoUrl: draft.branding.logoUrl,
      backgroundImage: draft.arena.backgroundImage,
      overlayOpacity: draft.arena.overlayOpacity,
      primaryColor: draft.arena.primaryColor,
      secondaryColor: draft.arena.secondaryColor,
      ads,
    };
    await saveThemeMut.mutateAsync(theme);
    setEditingThemeId(theme.id);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2200);
    goTo("themes");
  }

  useEffect(() => setDraft(cloneGameConfig(stored)), [stored]);
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(stored), [draft, stored]);

  function patch<K extends keyof GameConfig>(section: K, values: Partial<GameConfig[K]>) {
    setDraft((current) => ({ ...current, [section]: { ...current[section], ...values } }));
  }
  function reorder<T extends { order: number }>(
    key: "skills" | "bots" | "menuItems",
    items: T[],
    to: number,
  ) {
    if (dragIndex === null || dragIndex === to) return;
    const next = moveItem(items, dragIndex, to).map((item, order) => ({ ...item, order }));
    setDraft((current) => ({ ...current, [key]: next }));
    setDragIndex(to);
  }
  async function publish() {
    soundManager.playConfirm();
    await save.mutateAsync(draft);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2200);
  }
  async function resetAll() {
    if (!window.confirm("Reset every Game Studio setting to the safe defaults?")) return;
    setDraft(cloneGameConfig(await reset.mutateAsync()));
  }
  async function handleBackgroundUpload(file: File | undefined) {
    if (!file) return;
    soundManager.playClick();
    const url = await uploadBackground.mutateAsync(file);
    patch("arena", { backgroundImage: url });
  }
  async function handleLogoUpload(file: File | undefined) {
    if (!file) return;
    soundManager.playClick();
    const url = await uploadLogo.mutateAsync(file);
    patch("branding", { logoUrl: url });
  }

  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* Toolbar — which theme you're editing, unsaved state, name + publish. One clean row. */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-400/40 bg-black/70 px-4 py-3 shadow-xl">
        <span className="flex items-center gap-2.5">
          <span className="h-5 w-5 shrink-0 rounded-md border border-white/25" style={{ background: draft.arena.primaryColor }} />
          <span className="leading-tight">
            <small className="block text-[9px] font-black uppercase tracking-[.22em] text-slate-500">
              {editingThemeId ? "Editing theme" : "New theme"}
            </small>
            <b className="font-title text-base font-black text-white">{themeName.trim() || "Untitled"}</b>
          </span>
        </span>
        <span
          className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-300 transition-opacity ${dirty && !savedFlash ? "opacity-100" : "opacity-0"}`}
          aria-hidden={!dirty}
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300" /> Unsaved
        </span>
        <span className="flex-1" />
        {/* .studio-input is 100%-wide by default — box it so the toolbar stays a single row */}
        <span className="w-48 shrink-0 sm:w-60">
          <input
            className="studio-input h-11 !py-1"
            placeholder="Theme name (e.g. Nike Cup)"
            value={themeName}
            maxLength={80}
            onChange={(e) => setThemeName(e.target.value)}
          />
        </span>
        {editingThemeId && (
          <button onClick={newTheme} className="studio-secondary shrink-0">
            <Plus size={14} />
            <span className="hidden sm:inline">New</span>
          </button>
        )}
        <button
          onClick={publishTheme}
          disabled={!themeName.trim() || saveThemeMut.isPending}
          className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 px-6 font-title text-xs font-black uppercase tracking-wider text-slate-950 shadow-[0_0_18px_rgba(245,158,11,.45)] transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Save size={15} />
          {saveThemeMut.isPending ? "Publishing…" : editingThemeId ? "Update theme" : "Publish theme"}
        </button>
      </div>
      {(savedFlash || saveThemeMut.isError) && (
        <div
          className={`rounded-2xl border p-3 text-sm ${saveThemeMut.isError ? "border-rose-500 bg-rose-950/70 text-rose-200" : "border-emerald-400/50 bg-emerald-950/60 text-emerald-200"}`}
        >
          {saveThemeMut.isError
            ? saveThemeMut.error instanceof Error
              ? saveThemeMut.error.message
              : "Could not publish theme."
            : "Theme saved ✓ — pick it when creating a tournament."}
        </div>
      )}

      {/* Controls on the left, the ALWAYS-VISIBLE live preview pinned on the right. */}
      <div className="grid grid-cols-1 items-start gap-4 xl:h-[calc(100vh-190px)] xl:min-h-[620px] xl:grid-cols-[400px_minmax(0,1fr)]">
        {/* ACCORDION sidebar — three stacked rows; clicking one opens ITS list and closes the others. */}
        <aside className="flex min-h-0 flex-col gap-2.5 xl:h-full xl:overflow-y-auto">
          <AccordionRow
            id="branding"
            icon={Type}
            label="Brand"
            hint="Name, tagline, logo"
            open={step === "branding"}
            onToggle={goTo}
          >
            {/* EITHER a logo OR a name — never both. Picking "Brand name" clears the logo (kept in
                session state so switching back restores it); the tagline only exists in name mode. */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-title font-black text-slate-200">Show in the arena</span>
              <div className="flex rounded-xl border border-white/10 bg-black/50 p-1">
                {(
                  [
                    ["name", "Brand name"],
                    ["logo", "Logo"],
                  ] as const
                ).map(([m, label]) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { soundManager.playClick(); setBrandMode(m); }}
                    className={`flex-1 rounded-lg py-2 text-[11px] font-black uppercase tracking-wider transition-all ${brandMode === m ? "bg-amber-400 text-slate-950" : "text-slate-400 hover:text-white"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <small className="text-[10px] text-slate-500">
                {brandMode === "logo"
                  ? "The logo replaces the wordmark — the name and tagline are not shown."
                  : "The brand name is shown as the wordmark, with an optional tagline underneath."}
              </small>
            </div>

            {brandMode === "name" ? (
              <>
                <Field label="Brand name" hint="Shown as the wordmark">
                  <input
                    className="studio-input"
                    value={draft.branding.gameTitle}
                    onChange={(e) => patch("branding", { gameTitle: e.target.value })}
                  />
                </Field>
                <Field label="Tagline" hint="Name mode only">
                  <input
                    className="studio-input"
                    value={draft.branding.subtitle}
                    onChange={(e) => patch("branding", { subtitle: e.target.value })}
                  />
                </Field>
              </>
            ) : (
              /* Brand LOGO — upload an image (JPG / PNG / SVG / WebP / …) or paste a URL. */
              <div className="flex flex-col gap-2">
                <span className="text-xs font-title font-black text-slate-200">Brand logo</span>
                <div className="grid h-24 place-items-center overflow-hidden rounded-2xl border-2 border-white/10 bg-black/60 p-2">
                  {draft.branding.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={draft.branding.logoUrl} alt="Brand logo" className="max-h-[80px] max-w-full object-contain" />
                  ) : (
                    <span className="px-3 text-center text-[10px] leading-relaxed text-slate-500">
                      Upload a logo — it replaces the brand name in the arena.
                    </span>
                  )}
                </div>
                <label className="studio-secondary flex cursor-pointer items-center justify-center gap-2 border-dashed py-3">
                  <Upload size={16} />
                  <span>{uploadLogo.isPending ? "Uploading logo…" : "Upload logo (JPG, PNG, SVG…)"}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif,image/avif,.svg,.png,.jpg,.jpeg,.webp,.gif,.avif"
                    className="sr-only"
                    disabled={uploadLogo.isPending}
                    onChange={(event) => {
                      void handleLogoUpload(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                </label>
                {uploadLogo.isError && (
                  <p className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
                    {uploadLogo.error.message}
                  </p>
                )}
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-3 text-slate-500" size={16} />
                  <input
                    className="studio-input pl-10"
                    aria-label="Brand logo URL"
                    placeholder="Or paste a logo image URL"
                    value={draft.branding.logoUrl}
                    onChange={(e) => patch("branding", { logoUrl: e.target.value })}
                  />
                </div>
              </div>
            )}
          </AccordionRow>

          <AccordionRow
            id="arena"
            icon={Palette}
            label="Arena"
            hint="Background & colours"
            open={step === "arena"}
            onToggle={goTo}
          >
            <Field label="Arena name">
              <input
                className="studio-input"
                value={draft.arena.name}
                onChange={(e) => patch("arena", { name: e.target.value })}
              />
            </Field>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-title font-black text-slate-200">Background image</span>
              {/* Thumbnail of the current background (upload or URL). */}
              <div
                className="h-24 rounded-2xl border-2 border-white/10 bg-cover bg-center"
                style={{ backgroundImage: draft.arena.backgroundImage ? `url('${draft.arena.backgroundImage}')` : undefined }}
              />
              <label className="studio-secondary flex cursor-pointer items-center justify-center gap-2 border-dashed py-3">
                <Upload size={16} />
                <span>{uploadBackground.isPending ? "Uploading image…" : "Upload your own background"}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  disabled={uploadBackground.isPending}
                  onChange={(event) => {
                    void handleBackgroundUpload(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </label>
              {uploadBackground.isError && (
                <p className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
                  {uploadBackground.error.message}
                </p>
              )}
              <div className="relative">
                <ImageIcon className="absolute left-3 top-3 text-slate-500" size={16} />
                <input
                  className="studio-input pl-10"
                  aria-label="Background image URL"
                  placeholder="Or paste an image URL"
                  value={draft.arena.backgroundImage}
                  onChange={(e) => patch("arena", { backgroundImage: e.target.value })}
                />
              </div>
            </div>

            <Field label="Darkness" hint={`${Math.round(draft.arena.overlayOpacity * 100)}%`}>
              <input
                type="range"
                min="0"
                max="0.9"
                step="0.05"
                value={draft.arena.overlayOpacity}
                onChange={(e) => patch("arena", { overlayOpacity: Number(e.target.value) })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <ColorField
                label="Primary"
                value={draft.arena.primaryColor}
                onChange={(primaryColor) => patch("arena", { primaryColor })}
              />
              <ColorField
                label="Success"
                value={draft.arena.secondaryColor}
                onChange={(secondaryColor) => patch("arena", { secondaryColor })}
              />
            </div>
          </AccordionRow>

          {/* AD SURFACES — real controls. Everything here is saved with the theme and applied to the
              live tournament arena. */}
          <AccordionRow
            id="ads"
            icon={Megaphone}
            label="Ad placements"
            hint="Board, arena list & logo spot"
            open={step === "ads"}
            onToggle={goTo}
          >
            {/* 1 · where the brand marquee sits */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-title font-black text-slate-200">Logo / name placement</span>
              <div className="flex rounded-xl border border-white/10 bg-black/50 p-1">
                {(
                  [
                    ["topLeft", "Left"],
                    ["topCenter", "Centre"],
                    ["topRight", "Right"],
                  ] as const
                ).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => { soundManager.playClick(); setAds({ ...ads, placement: v }); }}
                    className={`flex-1 rounded-lg py-2 text-[11px] font-black uppercase tracking-wider transition-all ${ads.placement === v ? "bg-amber-400 text-slate-950" : "text-slate-400 hover:text-white"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2 · game board */}
            <div className="flex flex-col gap-2.5 rounded-xl border border-white/10 bg-black/40 p-3">
              <b className="font-title text-xs font-black text-amber-300">Game board</b>
              <StylePicker
                label="Board style"
                value={ads.boardStyle}
                options={[["felt","Felt"],["slate","Slate"],["midnight","Midnight"],["brand","Brand"]] as const}
                onChange={(boardStyle) => setAds({ ...ads, boardStyle })}
              />
              <StylePicker
                label="Number style"
                value={ads.tileStyle}
                options={[["classic","Classic"],["flat","Flat"],["outline","Outline"],["solid","Solid"]] as const}
                onChange={(tileStyle) => setAds({ ...ads, tileStyle })}
              />
              <SwitchRow
                label="Brand watermark"
                hint="Mark ghosted on the felt"
                value={ads.boardWatermark}
                onChange={(boardWatermark) => setAds({ ...ads, boardWatermark })}
              />
              {ads.boardWatermark && (
                <Field label="Watermark strength" hint={`${Math.round(ads.boardWatermarkOpacity * 100)}%`}>
                  <input
                    type="range"
                    min="0.04"
                    max="0.6"
                    step="0.02"
                    value={ads.boardWatermarkOpacity}
                    onChange={(e) => setAds({ ...ads, boardWatermarkOpacity: Number(e.target.value) })}
                  />
                </Field>
              )}
              <span className="text-xs font-title font-black text-slate-200">Board artwork (replaces the felt)</span>
              {ads.boardImage && (
                <div className="h-20 rounded-xl border border-white/10 bg-cover bg-center" style={{ backgroundImage: `url('${ads.boardImage}')` }} />
              )}
              <label className="studio-secondary flex cursor-pointer items-center justify-center gap-2 border-dashed py-2.5 text-xs">
                <Upload size={14} />
                <span>{uploadBoard.isPending ? "Uploading…" : "Upload board artwork"}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  disabled={uploadBoard.isPending}
                  onChange={(event) => {
                    void handleAdUpload(event.target.files?.[0], "boardImage");
                    event.target.value = "";
                  }}
                />
              </label>
              {ads.boardImage && (
                <button type="button" onClick={() => setAds({ ...ads, boardImage: "" })} className="studio-secondary justify-center py-1.5 text-[11px]">
                  Remove board artwork
                </button>
              )}
            </div>

            {/* 3 · arena list */}
            <div className="flex flex-col gap-2.5 rounded-xl border border-white/10 bg-black/40 p-3">
              <b className="font-title text-xs font-black text-amber-300">Arena list</b>
              <StylePicker
                label="Panel style"
                value={ads.rosterStyle}
                options={[["default","Default"],["glass","Glass"],["solid","Solid"],["brand","Brand"]] as const}
                onChange={(rosterStyle) => setAds({ ...ads, rosterStyle })}
              />
            </div>

            {/* 4 · extra ad slots — the two marquee positions the logo/name isn't using */}
            <div className="flex flex-col gap-2.5 rounded-xl border border-white/10 bg-black/40 p-3">
              <b className="font-title text-xs font-black text-amber-300">Extra ad banners</b>
              <small className="-mt-1 text-[10px] leading-relaxed text-slate-400">
                The brand sits {ads.placement === "topLeft" ? "left" : ads.placement === "topRight" ? "right" : "centre"} — these fill the
                other top slots.
              </small>

              {ads.placement !== "topCenter" && (
                <>
                  <span className="text-[11px] font-title font-black text-slate-200">Centre banner</span>
                  {ads.bannerCenterImage && (
                    <div className="grid h-14 place-items-center rounded-xl border border-white/10 bg-black/60 p-1.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ads.bannerCenterImage} alt="" className="max-h-full max-w-full object-contain" />
                    </div>
                  )}
                  <label className="studio-secondary flex cursor-pointer items-center justify-center gap-2 border-dashed py-2.5 text-xs">
                    <Upload size={14} />
                    <span>{uploadCenterAd.isPending ? "Uploading…" : "Upload centre banner"}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                      className="sr-only"
                      disabled={uploadCenterAd.isPending}
                      onChange={(event) => {
                        void handleAdUpload(event.target.files?.[0], "bannerCenterImage");
                        event.target.value = "";
                      }}
                    />
                  </label>
                  {ads.bannerCenterImage && (
                    <button type="button" onClick={() => setAds({ ...ads, bannerCenterImage: "" })} className="studio-secondary justify-center py-1.5 text-[11px]">
                      Remove centre banner
                    </button>
                  )}
                </>
              )}

              <span className="mt-1 text-[11px] font-title font-black text-slate-200">
                {ads.placement === "topRight" ? "Left" : "Right"} banner
              </span>
              {ads.bannerOppositeImage && (
                <div className="grid h-14 place-items-center rounded-xl border border-white/10 bg-black/60 p-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ads.bannerOppositeImage} alt="" className="max-h-full max-w-full object-contain" />
                </div>
              )}
              <label className="studio-secondary flex cursor-pointer items-center justify-center gap-2 border-dashed py-2.5 text-xs">
                <Upload size={14} />
                <span>{uploadOppositeAd.isPending ? "Uploading…" : "Upload side banner"}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                  className="sr-only"
                  disabled={uploadOppositeAd.isPending}
                  onChange={(event) => {
                    void handleAdUpload(event.target.files?.[0], "bannerOppositeImage");
                    event.target.value = "";
                  }}
                />
              </label>
              {ads.bannerOppositeImage && (
                <button type="button" onClick={() => setAds({ ...ads, bannerOppositeImage: "" })} className="studio-secondary justify-center py-1.5 text-[11px]">
                  Remove side banner
                </button>
              )}
            </div>

            <p className="rounded-xl border border-amber-400/25 bg-amber-400/5 p-3 text-[10px] leading-relaxed text-amber-200/90">
              Saved with the theme and applied to the live tournament arena — the sponsor doesn&apos;t
              buy a banner, they <b>become the arena</b> for the whole event.
            </p>
          </AccordionRow>

          <AccordionRow
            id="themes"
            icon={WandSparkles}
            label="Themes"
            hint={`${themes.length} saved`}
            open={step === "themes"}
            onToggle={goTo}
          >
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={newTheme} className="studio-secondary flex items-center gap-2 px-4 py-2.5">
                  <Plus size={16} /> New theme
                </button>
                <span className="text-xs text-slate-400">{themes.length} saved</span>
              </div>
              {themes.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-white/15 bg-black/40 p-8 text-center text-sm text-slate-400">
                  No themes yet. Click <b className="text-amber-300">New theme</b>, design the brand + background, then <b className="text-amber-300">Publish theme</b>.
                </div>
              ) : (
                <div className="mt-4 grid gap-3">
                  {themes.map((t) => (
                    <div key={t.id} className="overflow-hidden rounded-2xl border-2 bg-black/50" style={{ borderColor: `${t.primaryColor}55` }}>
                      <div
                        className="flex h-24 items-center gap-2 bg-cover bg-center px-3"
                        style={{ backgroundImage: t.backgroundImage ? `linear-gradient(rgba(0,0,0,${t.overlayOpacity}),rgba(0,0,0,.6)),url('${t.backgroundImage}')` : "linear-gradient(160deg,#12100b,#050907)" }}
                      >
                        {t.logoUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={t.logoUrl} alt="" className="h-9 max-w-[64px] object-contain" />
                        )}
                        <div className="min-w-0">
                          <b className="brand-wordmark block truncate" style={{ fontSize: 18, color: t.primaryColor }}>{t.gameTitle || "YOUR BRAND"}</b>
                          {t.subtitle && <span className="brand-tagline" style={{ fontSize: 8 }}>{t.subtitle}</span>}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 p-2.5">
                        <b className="truncate font-title text-sm text-white">{t.name}</b>
                        <div className="flex shrink-0 gap-1.5">
                          <button type="button" onClick={() => loadTheme(t)} className="studio-secondary px-2.5 py-1 text-[11px]">Edit</button>
                          <button
                            type="button"
                            onClick={() => { if (window.confirm(`Delete theme "${t.name}"?`)) { soundManager.playClose(); void deleteThemeMut.mutateAsync(t.id); } }}
                            className="rounded-lg border border-rose-500/40 bg-rose-950/40 px-2 py-1 text-rose-300 hover:bg-rose-900/50"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </AccordionRow>
        </aside>

        {/* ── the pinned LIVE PREVIEW — FIXED to this panel (no scrollbars): the arena scales itself
             down to fit whatever space is left, so it always sits fully inside the frame. ── */}
        <section className="flex min-h-0 flex-col gap-3 xl:h-full">
          <div className="flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-black/65 px-4 py-2.5 shadow-xl">
            <Eye size={15} className="text-amber-300" />
            <b className="text-[10px] font-black uppercase tracking-[.2em] text-slate-300">What players will see</b>
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live
            </span>
            <span className="ml-auto hidden text-[10px] font-bold text-slate-500 sm:block">Every change updates instantly</span>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-amber-400/30 bg-black/50 p-3 shadow-2xl">
            <ArenaLivePreview config={draft} ads={ads} />
          </div>
        </section>
      </div>

    </div>
  );
}

/** One collapsible sidebar section. Clicking the header opens THIS list and closes the others. */
function AccordionRow({
  id,
  icon: Icon,
  label,
  hint,
  open,
  onToggle,
  children,
}: {
  id: StudioStep;
  icon: IconType;
  label: string;
  hint: string;
  open: boolean;
  onToggle: (id: StudioStep) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border transition-all ${open ? "border-amber-400/50 bg-[#0b140e]" : "border-white/10 bg-black/50"}`}
    >
      <button
        type="button"
        onClick={() => { soundManager.playClick(); onToggle(id); }}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/5"
      >
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-all ${open ? "bg-amber-400 text-slate-950" : "bg-white/5 text-amber-300"}`}
        >
          <Icon size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <b className="block font-title text-sm font-black text-white">{label}</b>
          <small className="block truncate text-[10px] text-slate-500">{hint}</small>
        </span>
        <ChevronRight
          size={16}
          className={`shrink-0 text-slate-500 transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>
      {open && (
        <div className="flex max-h-[58vh] flex-col gap-3.5 overflow-y-auto border-t border-white/10 p-4">{children}</div>
      )}
    </div>
  );
}

function GameplayPanel({
  draft,
  patch,
}: {
  draft: GameConfig;
  patch: <K extends keyof GameConfig>(section: K, values: Partial<GameConfig[K]>) => void;
}) {
  return (
    <Panel
      title="Game setup"
      copy="Safe controls for pacing, modes, guests, and test tools."
      icon={Settings2}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="Turn timer" hint={`${draft.gameplay.turnSeconds} seconds`}>
          <input
            type="range"
            min="3"
            max="30"
            value={draft.gameplay.turnSeconds}
            onChange={(e) => patch("gameplay", { turnSeconds: Number(e.target.value) })}
          />
        </Field>
        <Field label="Default opponents">
          <select
            className="studio-input"
            value={draft.gameplay.defaultBotCount}
            onChange={(e) => patch("gameplay", { defaultBotCount: Number(e.target.value) })}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} bot{n > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Fastest bot" hint={`${draft.gameplay.botThinkMinMs}ms`}>
          <input
            type="range"
            min="250"
            max="10000"
            step="50"
            value={draft.gameplay.botThinkMinMs}
            onChange={(e) =>
              patch("gameplay", {
                botThinkMinMs: Math.min(Number(e.target.value), draft.gameplay.botThinkMaxMs),
              })
            }
          />
        </Field>
        <Field label="Slowest bot" hint={`${draft.gameplay.botThinkMaxMs}ms`}>
          <input
            type="range"
            min="300"
            max="15000"
            step="50"
            value={draft.gameplay.botThinkMaxMs}
            onChange={(e) =>
              patch("gameplay", {
                botThinkMaxMs: Math.max(Number(e.target.value), draft.gameplay.botThinkMinMs),
              })
            }
          />
        </Field>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <SwitchRow
          label="Classic mode"
          hint="Pure counting"
          value={draft.gameplay.allowClassic}
          onChange={(allowClassic) =>
            patch("gameplay", {
              allowClassic,
              defaultMode: draft.gameplay.defaultMode,
            })
          }
        />
        <SwitchRow
          label="Skill mode"
          hint="Tactical loadouts"
          value={draft.gameplay.allowSkills}
          onChange={(allowSkills) =>
            patch("gameplay", {
              allowSkills,
              defaultMode: !allowSkills ? "classic" : draft.gameplay.defaultMode,
            })
          }
        />
        <SwitchRow
          label="Guest play"
          hint="Nickname-only visitors"
          value={draft.gameplay.guestPlayEnabled}
          onChange={(guestPlayEnabled) => patch("gameplay", { guestPlayEnabled })}
        />
        <SwitchRow
          label="Particles"
          hint="Arena atmosphere"
          value={draft.features.enableParticles}
          onChange={(enableParticles) => patch("features", { enableParticles })}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Default mode">
          <select
            className="studio-input"
            value={draft.gameplay.defaultMode}
            onChange={(e) =>
              patch("gameplay", {
                defaultMode: e.target.value as GameConfig["gameplay"]["defaultMode"],
              })
            }
          >
            {draft.gameplay.allowClassic && <option value="classic">Classic mode</option>}
          </select>
        </Field>
        <Field label="Guest name prompt">
          <input
            className="studio-input"
            value={draft.gameplay.guestNamePrompt}
            onChange={(e) => patch("gameplay", { guestNamePrompt: e.target.value })}
          />
        </Field>
      </div>
    </Panel>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-14 rounded-xl border border-slate-700 bg-black p-1"
        />
        <input
          className="studio-input min-w-0 flex-1 font-mono"
          value={value}
          maxLength={7}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </Field>
  );
}

type DragProps = Pick<
  React.HTMLAttributes<HTMLDivElement>,
  "draggable" | "onDragStart" | "onDragOver"
>;

function SkillEditor({
  skill,
  onChange,
  ...drag
}: { skill: AdminSkillConfig; onChange: (v: AdminSkillConfig) => void } & DragProps) {
  return (
    <div
      {...drag}
      className={`grid cursor-grab gap-3 rounded-2xl border p-3 sm:grid-cols-[28px_54px_1fr_54px] sm:items-center ${skill.enabled ? "border-slate-700 bg-black/45" : "border-slate-900 opacity-60"}`}
    >
      <GripVertical size={18} className="text-slate-600" />
      <div
        className="grid h-12 w-12 place-items-center rounded-xl border text-2xl"
        style={{ borderColor: skill.color, color: skill.color }}
      >
        {skill.icon}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          className="studio-input"
          value={skill.name}
          onChange={(e) => onChange({ ...skill, name: e.target.value })}
        />
        <input
          className="studio-input"
          value={skill.shortLabel}
          onChange={(e) => onChange({ ...skill, shortLabel: e.target.value })}
        />
        <input
          className="studio-input sm:col-span-2"
          value={skill.description}
          onChange={(e) => onChange({ ...skill, description: e.target.value })}
        />
        <input
          type="color"
          value={skill.color}
          onChange={(e) => onChange({ ...skill, color: e.target.value })}
        />
      </div>
      <Toggle
        checked={skill.enabled}
        onChange={(enabled) => onChange({ ...skill, enabled })}
        label={`Enable ${skill.name}`}
      />
    </div>
  );
}

function BotEditor({
  bot,
  onChange,
  onDelete,
  ...drag
}: {
  bot: AdminBotConfig;
  onChange: (v: AdminBotConfig) => void;
  onDelete: () => void;
} & DragProps) {
  const avatar = AVATAR_VARIANTS.find((v) => v.id === bot.avatarVariantId) ?? AVATAR_VARIANTS[0]!;
  return (
    <div
      {...drag}
      className={`grid cursor-grab gap-3 rounded-2xl border p-3 lg:grid-cols-[28px_66px_1fr_170px_105px_50px_32px] lg:items-center ${bot.enabled ? "border-slate-700 bg-black/45" : "border-slate-900 opacity-60"}`}
    >
      <GripVertical size={18} className="text-slate-600" />
      <div className="h-16 w-16 overflow-hidden rounded-xl bg-emerald-950">
        <img src={avatar.image} alt="" className="h-full w-full object-contain" />
      </div>
      <div className="grid gap-2">
        <input
          className="studio-input"
          value={bot.name}
          onChange={(e) => onChange({ ...bot, name: e.target.value })}
        />
        <input
          className="studio-input"
          value={bot.title}
          onChange={(e) => onChange({ ...bot, title: e.target.value })}
        />
      </div>
      <select
        className="studio-input"
        value={bot.avatarVariantId}
        onChange={(e) => onChange({ ...bot, avatarVariantId: e.target.value })}
      >
        {AVATAR_VARIANTS.map((v) => (
          <option key={v.id} value={v.id}>
            {v.characterLabel} · {v.shortLabel}
          </option>
        ))}
      </select>
      <select
        className="studio-input"
        value={bot.difficulty}
        onChange={(e) =>
          onChange({ ...bot, difficulty: e.target.value as AdminBotConfig["difficulty"] })
        }
      >
        <option value="easy">Easy</option>
        <option value="normal">Normal</option>
        <option value="hard">Hard</option>
      </select>
      <Toggle
        checked={bot.enabled}
        onChange={(enabled) => onChange({ ...bot, enabled })}
        label={`Enable ${bot.name}`}
      />
      <button
        onClick={onDelete}
        aria-label={`Delete ${bot.name}`}
        className="text-slate-600 hover:text-rose-400"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function MenuEditor({
  item,
  onChange,
  onDelete,
  ...drag
}: {
  item: AdminMenuItemConfig;
  onChange: (v: AdminMenuItemConfig) => void;
  onDelete: () => void;
} & DragProps) {
  return (
    <div
      {...drag}
      className={`grid cursor-grab gap-2 rounded-2xl border p-3 md:grid-cols-[28px_1fr_1fr_130px_80px_50px_32px] md:items-center ${item.enabled ? "border-slate-700 bg-black/45" : "border-slate-900 opacity-60"}`}
    >
      <GripVertical size={18} className="text-slate-600" />
      <input
        className="studio-input"
        value={item.label}
        onChange={(e) => onChange({ ...item, label: e.target.value })}
      />
      <input
        className="studio-input font-mono text-xs"
        value={item.path}
        onChange={(e) => onChange({ ...item, path: e.target.value })}
      />
      <select
        className="studio-input"
        value={item.icon}
        onChange={(e) => onChange({ ...item, icon: e.target.value as AdminMenuItemConfig["icon"] })}
      >
        {[
          "home",
          "cow",
          "trophy",
          "shop",
          "profile",
          "wallet",
          "history",
          "settings",
          "sponsor",
        ].map((icon) => (
          <option key={icon}>{icon}</option>
        ))}
      </select>
      <label className="flex items-center gap-1 text-[10px]">
        <input
          type="checkbox"
          checked={item.requiresAuth}
          onChange={(e) => onChange({ ...item, requiresAuth: e.target.checked })}
        />{" "}
        Login
      </label>
      <Toggle
        checked={item.enabled}
        onChange={(enabled) => onChange({ ...item, enabled })}
        label={`Enable ${item.label}`}
      />
      <button
        onClick={onDelete}
        aria-label={`Delete ${item.label}`}
        className="text-slate-600 hover:text-rose-400"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
