export const AVATAR_BACKGROUND_IDS = [
  "emerald",
  "golden",
  "cyber",
  "inferno",
  "obsidian",
  "aurora",
  "sunset",
  "ocean",
  "candy",
  "royal",
  "starlight",
  "meadow",
  "frost",
  "lava",
  "rainbow",
  "none",
] as const;

export type AvatarBackgroundId = (typeof AVATAR_BACKGROUND_IDS)[number];

export interface AvatarBackgroundSkin {
  id: AvatarBackgroundId;
  name: string;
  className: string;
  previewClass: string;
  isNew?: boolean;
}

export const AVATAR_BACKGROUNDS: readonly AvatarBackgroundSkin[] = [
  { id: "emerald", name: "Emerald", className: "bg-gradient-to-br from-emerald-300 via-emerald-800 to-slate-950", previewClass: "from-emerald-300 via-emerald-700 to-slate-950" },
  { id: "golden", name: "Golden", className: "bg-gradient-to-br from-yellow-200 via-amber-600 to-amber-950", previewClass: "from-yellow-200 via-amber-500 to-amber-950" },
  { id: "cyber", name: "Cyber", className: "bg-gradient-to-br from-cyan-300 via-blue-700 to-slate-950", previewClass: "from-cyan-300 via-blue-600 to-slate-950" },
  { id: "inferno", name: "Inferno", className: "bg-gradient-to-br from-yellow-300 via-red-600 to-rose-950", previewClass: "from-yellow-300 via-red-600 to-rose-950" },
  { id: "obsidian", name: "Obsidian", className: "bg-gradient-to-br from-slate-400 via-slate-900 to-black", previewClass: "from-slate-400 via-slate-800 to-black" },
  { id: "aurora", name: "Aurora", className: "bg-[conic-gradient(from_210deg_at_50%_35%,#07111f,#22d3ee,#a855f7,#34d399,#07111f)]", previewClass: "from-cyan-300 via-violet-500 to-emerald-400", isNew: true },
  { id: "sunset", name: "Sunset", className: "bg-[radial-gradient(circle_at_50%_20%,#fde68a,#fb7185_45%,#4c1d95)]", previewClass: "from-amber-200 via-rose-400 to-violet-900", isNew: true },
  { id: "ocean", name: "Ocean", className: "bg-[radial-gradient(circle_at_30%_20%,#67e8f9,#0369a1_48%,#082f49)]", previewClass: "from-cyan-200 via-sky-600 to-cyan-950", isNew: true },
  { id: "candy", name: "Candy", className: "bg-[linear-gradient(135deg,#f9a8d4_0%,#c4b5fd_45%,#67e8f9_100%)]", previewClass: "from-pink-300 via-violet-300 to-cyan-300", isNew: true },
  { id: "royal", name: "Royal", className: "bg-[radial-gradient(circle_at_50%_20%,#f0abfc,#7e22ce_42%,#2e1065)]", previewClass: "from-fuchsia-300 via-purple-700 to-violet-950", isNew: true },
  { id: "starlight", name: "Starlight", className: "bg-[radial-gradient(circle_at_25%_20%,#fff_0_1%,transparent_2%),radial-gradient(circle_at_70%_35%,#fff_0_1%,transparent_2%),linear-gradient(145deg,#312e81,#020617)] bg-[length:38px_38px,52px_52px,100%_100%]", previewClass: "from-indigo-400 via-indigo-900 to-slate-950", isNew: true },
  { id: "meadow", name: "Meadow", className: "bg-[radial-gradient(circle_at_50%_10%,#fef08a,#4ade80_42%,#14532d)]", previewClass: "from-yellow-200 via-green-400 to-green-900", isNew: true },
  { id: "frost", name: "Frost", className: "bg-[linear-gradient(145deg,#ecfeff,#7dd3fc_38%,#1e3a8a)]", previewClass: "from-white via-sky-300 to-blue-900", isNew: true },
  { id: "lava", name: "Lava", className: "bg-[radial-gradient(circle_at_50%_25%,#fde047,#f97316_28%,#7f1d1d_58%,#09090b)]", previewClass: "from-yellow-300 via-orange-600 to-zinc-950", isNew: true },
  { id: "rainbow", name: "Rainbow", className: "bg-[conic-gradient(from_180deg,#ef4444,#f59e0b,#22c55e,#06b6d4,#6366f1,#d946ef,#ef4444)]", previewClass: "from-red-400 via-emerald-400 to-violet-500", isNew: true },
  { id: "none", name: "None", className: "bg-transparent", previewClass: "from-slate-700 to-slate-950" },
];

export const AVATAR_FRAME_IDS = [
  "mythic_gold",
  "neon_glacier",
  "inferno",
  "emerald",
  "sunset_gold",
  "ocean_pearl",
  "candy_pop",
  "royal_amethyst",
  "star_chrome",
  "forest_vine",
  "frost_crystal",
  "lava_core",
  "rainbow_arcade",
  "shadow_onyx",
  "none",
] as const;

export type AvatarFrameId = (typeof AVATAR_FRAME_IDS)[number];

export interface AvatarFrameSkin {
  id: AvatarFrameId;
  name: string;
  className: string;
  previewClass: string;
  image?: string;
  isNew?: boolean;
}

export const AVATAR_FRAMES: readonly AvatarFrameSkin[] = [
  {
    id: "mythic_gold",
    name: "Mythic Gold",
    image: "/assets/master/frame_mythic_gold_1024.png",
    className: "border-[6px] border-amber-400 shadow-[inset_0_0_16px_#fef08a,0_0_24px_#f59e0b] ring-2 ring-amber-200/50",
    previewClass: "border-amber-400 shadow-[0_0_15px_#f59e0b] ring-2 ring-amber-300/60",
  },
  {
    id: "neon_glacier",
    name: "Neon Glacier",
    image: "/assets/master/frame_neon_glacier_1024.png",
    className: "border-[6px] border-cyan-300 shadow-[inset_0_0_20px_#22d3ee,0_0_25px_#38bdf8] ring-2 ring-cyan-100/40",
    previewClass: "border-cyan-300 shadow-[0_0_15px_#22d3ee] ring-2 ring-cyan-200/60",
  },
  {
    id: "inferno",
    name: "Infernal Volcano",
    image: "/assets/master/frame_inferno_1024.png",
    className: "border-[6px] border-rose-500 shadow-[inset_0_0_22px_#f43f5e,0_0_28px_#e11d48] ring-2 ring-orange-400/50",
    previewClass: "border-rose-500 shadow-[0_0_15px_#f43f5e] ring-2 ring-orange-500/60",
  },
  {
    id: "emerald",
    name: "Emerald Vine",
    image: "/assets/master/frame_emerald_1024.png",
    className: "border-[6px] border-emerald-400 shadow-[inset_0_0_18px_#34d399,0_0_22px_#10b981] ring-2 ring-lime-300/50",
    previewClass: "border-emerald-400 shadow-[0_0_15px_#34d399] ring-2 ring-lime-400/60",
  },
  {
    id: "sunset_gold",
    name: "Sun Gold",
    className: "border-[6px] border-orange-400 border-double shadow-[inset_0_0_18px_#fed7aa,0_0_22px_#ea580c] ring-2 ring-amber-300/40",
    previewClass: "border-orange-400 border-double shadow-[0_0_14px_#f97316] ring-2 ring-yellow-400/50",
    isNew: true,
  },
  {
    id: "ocean_pearl",
    name: "Ocean Pearl",
    className: "border-[6px] border-cyan-100 shadow-[inset_0_0_16px_#67e8f9,0_0_24px_#06b6d4] ring-2 ring-sky-300/40",
    previewClass: "border-cyan-100 shadow-[0_0_14px_#22d3ee] ring-2 ring-sky-200/60",
    isNew: true,
  },
  {
    id: "candy_pop",
    name: "Candy Pop",
    className: "border-[6px] border-pink-300 shadow-[inset_0_0_18px_#f472b6,0_0_24px_#ec4899] ring-2 ring-purple-300/50",
    previewClass: "border-pink-300 shadow-[0_0_14px_#f9a8d4] ring-2 ring-pink-400/60",
    isNew: true,
  },
  {
    id: "royal_amethyst",
    name: "Royal Amethyst",
    className: "border-[7px] border-violet-400 shadow-[inset_0_0_22px_#c084fc,0_0_30px_#9333ea] ring-2 ring-fuchsia-400/50",
    previewClass: "border-violet-400 shadow-[0_0_16px_#a855f7] ring-2 ring-purple-300/60",
    isNew: true,
  },
  {
    id: "star_chrome",
    name: "Star Chrome",
    className: "border-[6px] border-slate-200 shadow-[inset_0_0_16px_#f1f5f9,0_0_20px_#94a3b8] ring-2 ring-slate-400/50",
    previewClass: "border-white shadow-[0_0_14px_#fff] ring-2 ring-slate-300/60",
    isNew: true,
  },
  {
    id: "forest_vine",
    name: "Ancient Forest",
    className: "border-[7px] border-lime-600 border-double shadow-[inset_0_0_20px_#84cc16,0_0_24px_#4d7c0f] ring-2 ring-emerald-400/50",
    previewClass: "border-lime-500 border-double shadow-[0_0_14px_#84cc16] ring-2 ring-lime-300/50",
    isNew: true,
  },
  {
    id: "frost_crystal",
    name: "Frost Crystal",
    className: "border-[7px] border-sky-200 shadow-[inset_0_0_22px_#bae6fd,0_0_28px_#0284c7] ring-2 ring-cyan-200/60",
    previewClass: "border-sky-200 shadow-[0_0_16px_#7dd3fc] ring-2 ring-sky-300/70",
    isNew: true,
  },
  {
    id: "lava_core",
    name: "Molten Lava Core",
    className: "border-[7px] border-red-600 shadow-[inset_0_0_24px_#facc15,0_0_32px_#b91c1c] ring-2 ring-orange-500/60",
    previewClass: "border-red-500 shadow-[0_0_16px_#f97316] ring-2 ring-yellow-400/70",
    isNew: true,
  },
  {
    id: "rainbow_arcade",
    name: "Rainbow Arcade",
    className: "border-[6px] border-fuchsia-400 shadow-[inset_0_0_20px_#38bdf8,0_0_30px_#e879f9] ring-2 ring-cyan-400/60",
    previewClass: "border-fuchsia-400 shadow-[0_0_16px_#22d3ee] ring-2 ring-pink-400/70",
    isNew: true,
  },
  {
    id: "shadow_onyx",
    name: "Shadow Onyx",
    className: "border-[7px] border-zinc-700 shadow-[inset_0_0_20px_#18181b,0_0_26px_#3f3f46] ring-2 ring-zinc-500/50",
    previewClass: "border-zinc-500 shadow-[0_0_14px_#71717a] ring-2 ring-zinc-400/50",
    isNew: true,
  },
  {
    id: "none",
    name: "None",
    className: "",
    previewClass: "border-slate-700",
  },
];

export function getAvatarBackground(id: AvatarBackgroundId | undefined): AvatarBackgroundSkin {
  return AVATAR_BACKGROUNDS.find((item) => item.id === id) ?? AVATAR_BACKGROUNDS[0]!;
}

export function getAvatarFrame(id: AvatarFrameId | undefined): AvatarFrameSkin {
  return AVATAR_FRAMES.find((item) => item.id === id) ?? AVATAR_FRAMES[0]!;
}
