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
  type AdminBotConfig,
  type AdminMenuItemConfig,
  type AdminSkillConfig,
  type GameConfig,
} from "../../lib/game-config";
import {
  useGameConfig,
  useResetGameConfig,
  useSaveGameConfig,
  useUploadGameBackground,
} from "../../lib/hooks/useGameConfig";
import { AVATAR_VARIANTS } from "../../lib/avatar-catalog";
import { soundManager } from "../../lib/soundManager";

type StudioTab = "overview" | "branding" | "arena" | "gameplay" | "skills" | "bots" | "menu";
type IconType = typeof Sparkles;

const TABS: { id: StudioTab; label: string; hint: string; icon: IconType }[] = [
  { id: "overview", label: "Control room", hint: "Live preview", icon: LayoutDashboard },
  { id: "branding", label: "Brand & copy", hint: "Names and messages", icon: Type },
  { id: "arena", label: "Arena designer", hint: "World and colours", icon: Palette },
  { id: "gameplay", label: "Game setup", hint: "Modes, timing, guests", icon: Gamepad2 },
  { id: "skills", label: "Skill deck", hint: "Drag to reorder", icon: Zap },
  { id: "bots", label: "Bot roster", hint: "Opponents and looks", icon: Bot },
  { id: "menu", label: "Player menu", hint: "Navigation builder", icon: Menu },
];

const ARENA_BACKGROUNDS = [
  { name: "Sunny Pasture", path: "/assets/barnaby/barnaby-field.jpg" },
  { name: "Champion Arena", path: "/assets/barnaby/barnaby-pasture-arena.jpg" },
  { name: "Moonlit Bazaar", path: "/assets/moonlit-bazaar.png" },
  { name: "Monster Carnival", path: "/assets/monster-carnival-home.png" },
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

function Preview({ config }: { config: GameConfig }) {
  const bot = config.bots.find((item) => item.enabled);
  return (
    <div
      className="relative min-h-[420px] overflow-hidden rounded-[2rem] border-2 bg-cover bg-center shadow-[0_25px_70px_rgba(0,0,0,.75)]"
      style={{
        backgroundImage: `linear-gradient(rgba(2,8,5,${config.arena.overlayOpacity}),rgba(2,8,5,.93)),url('${config.arena.backgroundImage}')`,
        borderColor: config.arena.primaryColor,
      }}
    >
      <div className="relative flex min-h-[420px] flex-col p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div
            className="rounded-2xl border-2 bg-black/75 px-5 py-3 text-center shadow-xl"
            style={{ borderColor: config.arena.primaryColor }}
          >
            <h3 className="font-title text-xl font-black tracking-wider text-white">
              {config.branding.logoEmoji} {config.branding.gameTitle}
            </h3>
            <p
              className="text-[10px] font-bold uppercase tracking-[.2em]"
              style={{ color: config.arena.secondaryColor }}
            >
              {config.branding.subtitle}
            </p>
          </div>
          <span className="rounded-full border border-emerald-400/40 bg-black/70 px-3 py-1 text-[10px] font-black text-emerald-300">
            LIVE PREVIEW
          </span>
        </div>
        <div className="mx-auto mt-5 rounded-full border border-amber-400/40 bg-black/70 px-4 py-1 text-[10px] font-bold text-amber-200">
          {config.branding.announcement || "No announcement"}
        </div>
        <div className="my-auto grid grid-cols-[1fr_1.6fr_1fr] items-center gap-3">
          <MiniPlayer emoji="🐮" name="PLAYER" tone="emerald" />
          <div
            className="rounded-3xl border-2 bg-gradient-to-b from-amber-800/80 to-black/90 p-4"
            style={{ borderColor: config.arena.primaryColor }}
          >
            <div className="grid grid-cols-5 gap-2">
              {[29, 30, 31, 1, 2].map((n) => (
                <div
                  key={n}
                  className={`grid h-20 place-items-center rounded-xl border font-title text-xl font-black ${n === 31 ? "border-rose-400 bg-rose-950 text-rose-300" : "border-white/10 bg-black/60 text-white"}`}
                >
                  {n}
                </div>
              ))}
            </div>
          </div>
          <MiniPlayer emoji="🤠" name={bot?.name ?? "NO BOT"} tone="purple" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/75 p-2.5">
          <div className="flex gap-2">
            {config.skills
              .filter((s) => s.enabled)
              .slice(0, 3)
              .map((s) => (
                <span
                  key={s.id}
                  className="rounded-xl border px-2.5 py-1 text-[10px] font-black"
                  style={{ borderColor: s.color, color: s.color }}
                >
                  {s.icon} {s.shortLabel}
                </span>
              ))}
          </div>
          <div className="flex gap-3 text-[10px] font-bold text-slate-300">
            <span>⭐ {config.arena.name}</span>
            <span>◷ {config.gameplay.turnSeconds}s</span>
            <span>{config.gameplay.defaultBotCount} bot(s)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniPlayer({
  emoji,
  name,
  tone,
}: {
  emoji: string;
  name: string;
  tone: "emerald" | "purple";
}) {
  return (
    <div
      className={`rounded-3xl border bg-black/70 p-3 text-center ${tone === "emerald" ? "border-emerald-400/60" : "border-purple-400/60"}`}
    >
      <div className="mx-auto mb-2 grid h-16 w-16 place-items-center rounded-2xl bg-white/5 text-3xl">
        {emoji}
      </div>
      <b className="block truncate font-title text-xs text-white">{name}</b>
    </div>
  );
}

export function AdminGameStudio() {
  const { data: stored } = useGameConfig();
  const save = useSaveGameConfig();
  const reset = useResetGameConfig();
  const uploadBackground = useUploadGameBackground();
  const [draft, setDraft] = useState(() => cloneGameConfig(stored));
  const [tab, setTab] = useState<StudioTab>("overview");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

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
            <Panel title="Brand & copy" copy="Change the words players see everywhere." icon={Type}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Game title">
                  <input
                    className="studio-input"
                    value={draft.branding.gameTitle}
                    onChange={(e) => patch("branding", { gameTitle: e.target.value })}
                  />
                </Field>
                <Field label="Logo emoji">
                  <input
                    className="studio-input"
                    maxLength={8}
                    value={draft.branding.logoEmoji}
                    onChange={(e) => patch("branding", { logoEmoji: e.target.value })}
                  />
                </Field>
                <Field label="Subtitle">
                  <input
                    className="studio-input"
                    value={draft.branding.subtitle}
                    onChange={(e) => patch("branding", { subtitle: e.target.value })}
                  />
                </Field>
                <Field label="Theme family">
                  <select
                    className="studio-input"
                    value={draft.branding.themeFamily}
                    onChange={(e) =>
                      patch("branding", {
                        themeFamily: e.target.value as GameConfig["branding"]["themeFamily"],
                      })
                    }
                  >
                    <option value="monster">Monster Mayhem</option>
                    <option value="desert">Moonlit Bazaar</option>
                  </select>
                </Field>
              </div>
              <Field label="Arena announcement" hint={`${draft.branding.announcement.length}/140`}>
                <textarea
                  className="studio-input min-h-24"
                  maxLength={140}
                  value={draft.branding.announcement}
                  onChange={(e) => patch("branding", { announcement: e.target.value })}
                />
              </Field>
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
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {ARENA_BACKGROUNDS.map((background) => {
                          const active = draft.arena.backgroundImage === background.path;
                          return (
                            <button
                              type="button"
                              key={background.path}
                              onClick={() => patch("arena", { backgroundImage: background.path })}
                              className={`group overflow-hidden rounded-2xl border-2 text-left transition ${active ? "border-amber-300 shadow-[0_0_16px_rgba(251,191,36,.35)]" : "border-white/10 hover:border-amber-400/50"}`}
                            >
                              <span
                                className="block h-20 bg-cover bg-center transition group-hover:scale-105"
                                style={{ backgroundImage: `url('${background.path}')` }}
                              />
                              <span className="block bg-black/80 px-2 py-1.5 text-[10px] font-black text-slate-200">
                                {background.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>

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
          {tab === "gameplay" && <GameplayPanel draft={draft} patch={patch} />}
          {tab === "skills" && (
            <Panel
              title="Skill deck"
              copy="Drag cards to reorder. Disable without deleting."
              icon={Zap}
            >
              <div className="grid gap-3">
                {draft.skills.map((skill, index) => (
                  <SkillEditor
                    key={skill.id}
                    skill={skill}
                    draggable
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      reorder("skills", draft.skills, index);
                    }}
                    onChange={(next) =>
                      setDraft((c) => ({
                        ...c,
                        skills: c.skills.map((s) => (s.id === next.id ? next : s)),
                      }))
                    }
                  />
                ))}
              </div>
            </Panel>
          )}
          {tab === "bots" && (
            <Panel
              title="Bot roster"
              copy="Create opponents, choose their cow, then drag to reorder."
              icon={Bot}
              action={
                <button
                  className="studio-add"
                  disabled={draft.bots.length >= 12}
                  onClick={() => {
                    const id = `bot_${Date.now().toString(36)}`;
                    setDraft((c) => ({
                      ...c,
                      bots: [
                        ...c.bots,
                        {
                          id,
                          name: "New Cow",
                          title: "Rookie Counter",
                          avatarVariantId: "cow_v1_base",
                          difficulty: "normal",
                          enabled: true,
                          order: c.bots.length,
                        },
                      ],
                    }));
                  }}
                >
                  <Plus size={14} /> Add bot
                </button>
              }
            >
              <div className="grid gap-3">
                {draft.bots.map((bot, index) => (
                  <BotEditor
                    key={bot.id}
                    bot={bot}
                    draggable
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      reorder("bots", draft.bots, index);
                    }}
                    onChange={(next) =>
                      setDraft((c) => ({
                        ...c,
                        bots: c.bots.map((b) => (b.id === next.id ? next : b)),
                      }))
                    }
                    onDelete={() =>
                      draft.bots.length > 1 &&
                      setDraft((c) => ({
                        ...c,
                        bots: c.bots
                          .filter((b) => b.id !== bot.id)
                          .map((b, order) => ({ ...b, order })),
                      }))
                    }
                  />
                ))}
              </div>
            </Panel>
          )}
          {tab === "menu" && (
            <Panel
              title="Player menu builder"
              copy="Drag links. Locked links automatically request login."
              icon={Menu}
              action={
                <button
                  className="studio-add"
                  onClick={() => {
                    const id = `link_${Date.now().toString(36)}`;
                    setDraft((c) => ({
                      ...c,
                      menuItems: [
                        ...c.menuItems,
                        {
                          id,
                          label: "New page",
                          path: "/home",
                          icon: "home",
                          enabled: true,
                          requiresAuth: false,
                          order: c.menuItems.length,
                        },
                      ],
                    }));
                  }}
                >
                  <Plus size={14} /> Add link
                </button>
              }
            >
              <div className="grid gap-2">
                {draft.menuItems.map((item, index) => (
                  <MenuEditor
                    key={item.id}
                    item={item}
                    draggable
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      reorder("menuItems", draft.menuItems, index);
                    }}
                    onChange={(next) =>
                      setDraft((c) => ({
                        ...c,
                        menuItems: c.menuItems.map((m) => (m.id === next.id ? next : m)),
                      }))
                    }
                    onDelete={() =>
                      draft.menuItems.length > 1 &&
                      setDraft((c) => ({
                        ...c,
                        menuItems: c.menuItems
                          .filter((m) => m.id !== item.id)
                          .map((m, order) => ({ ...m, order })),
                      }))
                    }
                  />
                ))}
              </div>
            </Panel>
          )}
        </main>
      </div>

      <div className="fixed inset-x-0 bottom-3 z-50 mx-auto flex w-[min(920px,calc(100%-24px))] items-center justify-between gap-3 rounded-2xl border border-amber-300/60 bg-[#07110c]/95 p-3 shadow-2xl backdrop-blur-xl">
        <div>
          <b
            className={`block font-title text-sm ${dirty ? "text-amber-300" : "text-emerald-300"}`}
          >
            {savedFlash
              ? "Published successfully ✓"
              : dirty
                ? "Unpublished changes"
                : "Everything is live"}
          </b>
          <small className="hidden text-[10px] text-slate-500 sm:block">
            New settings apply after publishing.
          </small>
        </div>
        <div className="flex gap-2">
          <button onClick={resetAll} className="studio-secondary">
            <RotateCcw size={14} />
            <span className="hidden sm:inline">Reset</span>
          </button>
          <button
            onClick={() => setDraft(cloneGameConfig(stored))}
            disabled={!dirty}
            className="studio-secondary"
          >
            Undo
          </button>
          <button onClick={publish} disabled={!dirty || save.isPending} className="studio-publish">
            <Save size={15} />
            {save.isPending ? "Publishing…" : "Publish game"}
          </button>
        </div>
      </div>
      {save.isError && (
        <div className="rounded-2xl border border-rose-500 bg-rose-950/70 p-3 text-sm text-rose-200">
          {save.error instanceof Error ? save.error.message : "Could not publish."}
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
