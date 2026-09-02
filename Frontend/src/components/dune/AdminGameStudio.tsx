"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Bot,
  ChevronRight,
  Eye,
  Gamepad2,
  GripVertical,
  Image as ImageIcon,
  LayoutDashboard,
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
  type GameConfig,
  type GameTheme,
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
import { soundManager } from "../../lib/soundManager";

type StudioTab = "overview" | "branding" | "arena" | "themes";
type IconType = typeof Sparkles;

const TABS: { id: StudioTab; label: string; hint: string; icon: IconType }[] = [
  { id: "overview", label: "Preview", hint: "How it looks live", icon: Eye },
  { id: "branding", label: "Brand & logo", hint: "Name, tagline, logo", icon: Type },
  { id: "arena", label: "Background", hint: "Backdrop & colours", icon: Palette },
  { id: "themes", label: "My themes", hint: "Saved sponsor themes", icon: WandSparkles },
];

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

function moveItem<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item === undefined) return items;
  next.splice(to, 0, item);
  return next;
}

/**
 * Control Room live preview — a faithful stylised render of the LIVE tournament arena (the arc-rail
 * board). Every studio change reflects here instantly: the arena BACKGROUND + overlay, the centred
 * BRAND lockup (logo + name + tagline, exactly where "31 THIRTY ONE" sits in the real game), the
 * felt NUMBER BOARD, the player ROSTER, the announcement and the enabled SKILLS.
 */
function Preview({ config }: { config: GameConfig }) {
  // Sample mid-game state just for the still preview (colours = distinct players).
  const CLAIMED: Record<number, string> = { 1: "#ff43c4", 2: "#f472b6", 3: "#21e6d7", 4: "#f4b942", 5: "#a78bfa", 6: "#5be348", 7: "#38bdf8" };
  const MAX_CLAIMED = 7;
  const cows = AVATAR_VARIANTS.slice(0, 4);
  const roster = ["You", ...config.bots.filter((b) => b.enabled).map((b) => b.name)].slice(0, 5);
  const skills = config.skills.filter((s) => s.enabled).sort((a, b) => a.order - b.order).slice(0, 2);
  const primary = config.arena.primaryColor;
  const overlay = config.arena.overlayOpacity;

  return (
    <div
      className="relative overflow-hidden rounded-[2rem] border-2 bg-cover bg-center shadow-[0_25px_70px_rgba(0,0,0,.75)]"
      style={{
        minHeight: 470,
        backgroundImage: `linear-gradient(rgba(2,8,5,${overlay}),rgba(2,8,5,${Math.min(0.9, overlay + 0.18)})),url('${config.arena.backgroundImage}')`,
        borderColor: primary,
      }}
    >
      <span className="absolute right-3 top-3 z-20 rounded-full border border-emerald-400/40 bg-black/70 px-3 py-1 text-[10px] font-black text-emerald-300">
        LIVE PREVIEW
      </span>

      {/* Centred BRAND lockup — the studio's brand name/logo lands exactly where "31 THIRTY ONE" is. */}
      <div className="flex justify-center px-4 pb-1 pt-4">
        <div
          className="relative flex items-center gap-2.5 overflow-hidden rounded-2xl border-2 px-4 py-2 shadow-[0_8px_26px_rgba(0,0,0,.85),0_0_24px_rgba(245,158,11,.4)]"
          style={{ borderColor: primary, background: "linear-gradient(180deg,#78350f,#451a03 55%,#000)" }}
        >
          {config.branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={config.branding.logoUrl}
              alt="Brand logo"
              className="shrink-0 object-contain"
              style={{ maxHeight: 44, maxWidth: 88 }}
            />
          ) : (
            <span
              className="grid shrink-0 place-items-center rounded-xl border-2 border-white font-title font-black leading-none text-amber-950"
              style={{ width: 44, height: 40, fontSize: 26, background: "linear-gradient(180deg,#fcd34d,#f59e0b,#b45309)" }}
            >
              31
            </span>
          )}
          <div className="flex flex-col leading-none">
            <span className="brand-wordmark" style={{ fontSize: 26, lineHeight: 0.9 }}>
              {config.branding.gameTitle || "THIRTY ONE"}
            </span>
            {config.branding.subtitle && (
              <span className="brand-tagline" style={{ fontSize: 9, marginTop: 4 }}>{config.branding.subtitle}</span>
            )}
          </div>
        </div>
      </div>

      {/* Arena row: arc rail (left) · number board + running total (centre) · roster (right). */}
      <div className="mt-1 grid grid-cols-[0.66fr_1.5fr_0.9fr] items-center gap-2 px-4">
        {/* Arc rail — cows curving in from the left, current player larger. */}
        <div className="relative h-[210px]">
          {cows.map((c, i) => {
            const P = [
              { x: 30, y: 6, s: 40, bg: "frost", fr: "neon_glacier" },
              { x: 8, y: 66, s: 62, bg: "emerald", fr: "mythic_gold" },
              { x: 22, y: 138, s: 44, bg: "frost", fr: "neon_glacier" },
              { x: 42, y: 194, s: 34, bg: "frost", fr: "neon_glacier" },
            ][i]!;
            return (
              <div key={c.id} className="absolute" style={{ left: P.x, top: P.y, width: P.s, height: P.s }}>
                <MasterAvatar
                  config={{ variantId: c.id, backgroundId: P.bg as never, frameId: P.fr as never }}
                  className="h-full w-full"
                />
              </div>
            );
          })}
        </div>

        {/* Number board + running total. */}
        <div>
          <div className="mb-1 text-center">
            <div className="text-[9px] font-black uppercase tracking-[.2em] text-slate-400">Running total</div>
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="font-title font-black text-amber-200" style={{ fontSize: 40 }}>7</span>
              <span className="font-title font-black text-slate-500" style={{ fontSize: 19 }}>/ 31</span>
            </div>
          </div>
          <div
            className="rounded-2xl border-2 p-2.5"
            style={{ borderColor: primary, background: "radial-gradient(120% 90% at 50% -10%,rgba(94,231,178,.1),transparent 60%),linear-gradient(160deg,#123a2a,#0a2018 55%,#06140e)", boxShadow: "inset 0 0 32px rgba(0,0,0,.5)" }}
          >
            <div className="grid grid-cols-8 gap-1">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((n) => {
                const col = CLAIMED[n];
                const cl = !!col;
                const latest = n === MAX_CLAIMED;
                const bomb = n === 31;
                return (
                  <span
                    key={n}
                    className="grid place-items-center rounded-md border font-title font-black leading-none"
                    style={{
                      aspectRatio: "1 / 1",
                      fontSize: 12,
                      color: latest ? "#150a06" : cl ? "#fff" : bomb ? "#ff9a8f" : "rgba(233,209,160,.5)",
                      background: latest ? col : cl ? `${col}44` : bomb ? "rgba(120,26,22,.5)" : "linear-gradient(160deg,rgba(10,26,19,.6),rgba(4,12,9,.8))",
                      borderColor: cl ? col! : bomb ? "rgba(242,86,75,.4)" : "rgba(245,209,134,.14)",
                    }}
                  >
                    {n === 31 ? "31" : n}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Roster. */}
        <div className="self-stretch rounded-2xl border-2 p-2" style={{ borderColor: primary, background: "rgba(8,7,5,.72)" }}>
          <div className="mb-1.5 text-[9px] font-black uppercase tracking-wider text-amber-300/80">Arena · {roster.length}</div>
          <div className="flex flex-col gap-1">
            {roster.map((nm, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[10px] font-black"
                style={{ background: i === 0 ? "rgba(245,165,36,.16)" : "rgba(0,0,0,.35)", color: i === 0 ? "#FFE9BE" : "#F6EFE2" }}
              >
                <span
                  className="grid h-4 w-4 shrink-0 place-items-center rounded text-[9px]"
                  style={{ background: i === 0 ? primary : "rgba(8,7,5,.8)", color: i === 0 ? "#1b1206" : "#FFD98A" }}
                >
                  {i + 1}
                </span>
                <span className="truncate">{nm}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Announcement + enabled skills. */}
      <div className="mt-1 flex flex-col items-center gap-1.5 pb-3">
        {config.branding.announcement && (
          <div className="rounded-full border border-amber-400/40 bg-black/70 px-4 py-1 text-[10px] font-bold text-amber-200">
            {config.branding.announcement}
          </div>
        )}
        {skills.length > 0 && (
          <div className="flex gap-2">
            {skills.map((s) => (
              <span key={s.id} className="rounded-lg border px-2.5 py-1 text-[10px] font-black" style={{ borderColor: s.color, color: s.color, background: `${s.color}18` }}>
                {s.icon} {s.shortLabel}
              </span>
            ))}
          </div>
        )}
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
  const [draft, setDraft] = useState(() => cloneGameConfig(stored));
  const [tab, setTab] = useState<StudioTab>("themes");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

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
    setTab("branding");
  }
  function newTheme() {
    soundManager.playClick();
    setDraft(cloneGameConfig(DEFAULT_GAME_CONFIG));
    setThemeName("");
    setEditingThemeId(null);
    setTab("branding");
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
    };
    await saveThemeMut.mutateAsync(theme);
    setEditingThemeId(theme.id);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2200);
    setTab("themes");
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
    <div className="flex flex-col gap-5 pb-24">
      <div className="relative overflow-hidden rounded-3xl border-2 border-amber-400/60 bg-gradient-to-r from-amber-950/90 via-[#102019] to-emerald-950/80 p-5 shadow-2xl sm:p-7">
        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.24em] text-emerald-300">
              <WandSparkles size={14} /> No-code live operations
            </div>
            <h1 className="font-title text-3xl font-black tracking-wide text-white sm:text-5xl">
              GAME STUDIO
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Drag, edit, preview, and publish the player experience without touching code.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              [draft.skills.filter((s) => s.enabled).length, "Live skills"],
              [draft.bots.filter((b) => b.enabled).length, "Active bots"],
              [`${draft.gameplay.turnSeconds}s`, "Turn timer"],
            ].map(([value, label]) => (
              <div
                key={label}
                className="min-w-24 rounded-2xl border border-white/10 bg-black/50 p-3 text-center"
              >
                <b className="block font-title text-xl text-amber-300">{value}</b>
                <small className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  {label}
                </small>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="h-fit rounded-3xl border border-amber-400/35 bg-black/65 p-2.5 shadow-xl xl:sticky xl:top-4">
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  soundManager.playClick();
                  setTab(item.id);
                }}
                className={`mb-1 flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all ${active ? "border-amber-300 bg-amber-400 text-slate-950" : "border-transparent text-slate-300 hover:bg-white/5"}`}
              >
                <span
                  className={`grid h-9 w-9 place-items-center rounded-xl ${active ? "bg-black/15" : "bg-slate-900"}`}
                >
                  <Icon size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block font-title text-sm">{item.label}</b>
                  <small
                    className={`block truncate text-[10px] ${active ? "text-slate-800" : "text-slate-500"}`}
                  >
                    {item.hint}
                  </small>
                </span>
                <ChevronRight size={14} />
              </button>
            );
          })}
        </aside>

        <main className="min-w-0 rounded-3xl border border-amber-400/30 bg-gradient-to-b from-[#142219]/95 to-[#050907]/95 p-4 shadow-2xl sm:p-6">
          {tab === "overview" && (
            <div className="flex flex-col gap-5">
              <SectionTitle
                icon={Eye}
                title="What players will see"
                copy="The preview updates before you publish."
              />
              <Preview config={draft} />
            </div>
          )}
          {tab === "branding" && (
            <Panel title="Brand & copy" copy="Set the sponsor / brand shown across the tournament." icon={Type}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Brand name" hint="Appears where the platform name is">
                  <input
                    className="studio-input"
                    value={draft.branding.gameTitle}
                    onChange={(e) => patch("branding", { gameTitle: e.target.value })}
                  />
                </Field>
                <Field label="Tagline">
                  <input
                    className="studio-input"
                    value={draft.branding.subtitle}
                    onChange={(e) => patch("branding", { subtitle: e.target.value })}
                  />
                </Field>
              </div>

              {/* Brand LOGO — upload an image (JPG / PNG / SVG / WebP / …) or paste a URL. */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-title font-black text-slate-200">Brand logo</span>
                <div className="grid gap-3 md:grid-cols-[128px_minmax(0,1fr)] md:items-start">
                  <div className="grid h-[128px] place-items-center overflow-hidden rounded-2xl border-2 border-white/10 bg-black/60 p-2">
                    {draft.branding.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={draft.branding.logoUrl} alt="Brand logo" className="max-h-[108px] max-w-[108px] object-contain" />
                    ) : (
                      <span className="px-2 text-center text-[10px] leading-relaxed text-slate-500">
                        No logo yet — the &ldquo;31&rdquo; mark is used.
                      </span>
                    )}
                  </div>
                  <div className="grid gap-2">
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
                    {draft.branding.logoUrl && (
                      <button
                        type="button"
                        onClick={() => patch("branding", { logoUrl: "" })}
                        className="studio-secondary justify-center py-2 text-xs"
                      >
                        Remove logo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </Panel>
          )}
          {tab === "arena" && (
            <Panel
              title="Arena designer"
              copy="Swap the world and tune its atmosphere."
              icon={Palette}
            >
              <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
                <div className="grid gap-4">
                  <Field label="Arena name">
                    <input
                      className="studio-input"
                      value={draft.arena.name}
                      onChange={(e) => patch("arena", { name: e.target.value })}
                    />
                  </Field>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-title font-black text-slate-200">
                      Background image
                    </span>
                    <div className="grid gap-3">
                      {/* Preview of the current background (upload or URL). */}
                      <div
                        className="h-24 rounded-2xl border-2 border-white/10 bg-cover bg-center"
                        style={{ backgroundImage: draft.arena.backgroundImage ? `url('${draft.arena.backgroundImage}')` : undefined }}
                      />

                      <label className="studio-secondary flex cursor-pointer items-center justify-center gap-2 border-dashed py-3">
                        <Upload size={16} />
                        <span>
                          {uploadBackground.isPending
                            ? "Uploading image…"
                            : "Upload your own background"}
                        </span>
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
                </div>
                <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/50">
                  <div
                    className="h-56 bg-cover bg-center"
                    style={{
                      backgroundImage: `linear-gradient(rgba(0,0,0,${draft.arena.overlayOpacity}),rgba(0,0,0,.7)),url('${draft.arena.backgroundImage}')`,
                    }}
                  />
                  <div className="p-4">
                    <b className="font-title text-lg">{draft.arena.name}</b>
                    <p className="text-xs text-slate-400">Arena preview</p>
                  </div>
                </div>
              </div>
            </Panel>
          )}
          {tab === "themes" && (
            <Panel title="My themes" copy="Saved sponsor themes — pick any of these when you create a tournament." icon={WandSparkles}>
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
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {themes.map((t) => (
                    <div key={t.id} className="overflow-hidden rounded-2xl border-2 bg-black/50" style={{ borderColor: `${t.primaryColor}55` }}>
                      <div
                        className="flex h-24 items-center gap-2 bg-cover bg-center px-3"
                        style={{ backgroundImage: t.backgroundImage ? `linear-gradient(rgba(0,0,0,${t.overlayOpacity}),rgba(0,0,0,.6)),url('${t.backgroundImage}')` : "linear-gradient(160deg,#12100b,#050907)" }}
                      >
                        {t.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={t.logoUrl} alt="" className="h-9 max-w-[64px] object-contain" />
                        ) : (
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-b from-amber-300 to-amber-700 font-title text-sm font-black text-amber-950">31</span>
                        )}
                        <div className="min-w-0">
                          <b className="brand-wordmark block truncate" style={{ fontSize: 18 }}>{t.gameTitle || "THIRTY ONE"}</b>
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
            </Panel>
          )}
        </main>
      </div>

      <div className="fixed inset-x-0 bottom-3 z-50 mx-auto flex w-[min(920px,calc(100%-24px))] flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300/60 bg-[#07110c]/95 p-3 shadow-2xl backdrop-blur-xl">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <WandSparkles size={18} className="shrink-0 text-amber-300" />
          <div className="min-w-0">
            <input
              className="studio-input h-9 !py-1"
              placeholder="Theme name (e.g. Nike Cup)"
              value={themeName}
              maxLength={80}
              onChange={(e) => setThemeName(e.target.value)}
            />
            <small className="mt-0.5 block text-[10px] text-slate-500">
              {savedFlash
                ? "Theme saved ✓ — pick it when creating a tournament."
                : editingThemeId
                  ? "Editing an existing theme."
                  : "Save this brand + background as a reusable theme."}
            </small>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {editingThemeId && (
            <button onClick={newTheme} className="studio-secondary">
              <Plus size={14} />
              <span className="hidden sm:inline">New</span>
            </button>
          )}
          <button
            onClick={publishTheme}
            disabled={!themeName.trim() || saveThemeMut.isPending}
            className="studio-publish"
          >
            <Save size={15} />
            {saveThemeMut.isPending ? "Publishing…" : editingThemeId ? "Update theme" : "Publish theme"}
          </button>
        </div>
      </div>
      {saveThemeMut.isError && (
        <div className="rounded-2xl border border-rose-500 bg-rose-950/70 p-3 text-sm text-rose-200">
          {saveThemeMut.error instanceof Error ? saveThemeMut.error.message : "Could not publish theme."}
        </div>
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
              defaultMode: !allowClassic ? "skills" : draft.gameplay.defaultMode,
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
            {draft.gameplay.allowSkills && <option value="skills">Skill mode</option>}
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
