import type { GameMode, SkillType } from "./hooks/useCountdownLive";

export type GameThemeFamily = "monster" | "desert";
export type BotDifficulty = "easy" | "normal" | "hard";
export type MenuIconId =
  "home" | "cow" | "trophy" | "shop" | "profile" | "history" | "settings" | "sponsor";

export interface AdminSkillConfig {
  id: SkillType;
  name: string;
  shortLabel: string;
  description: string;
  icon: string;
  color: string;
  enabled: boolean;
  order: number;
}

export interface AdminBotConfig {
  id: string;
  name: string;
  title: string;
  avatarVariantId: string;
  difficulty: BotDifficulty;
  enabled: boolean;
  order: number;
}

export interface AdminMenuItemConfig {
  id: string;
  label: string;
  path: string;
  icon: MenuIconId;
  enabled: boolean;
  requiresAuth: boolean;
  order: number;
}

export interface GameConfig {
  branding: {
    gameTitle: string;
    subtitle: string;
    announcement: string;
    logoEmoji: string;
    /** Uploaded/linked brand logo image (JPG/PNG/SVG/…). Shown in place of the "31" when set. */
    logoUrl: string;
    themeFamily: GameThemeFamily;
  };
  arena: {
    name: string;
    backgroundImage: string;
    overlayOpacity: number;
    primaryColor: string;
    secondaryColor: string;
  };
  gameplay: {
    turnSeconds: number;
    defaultBotCount: number;
    botThinkMinMs: number;
    botThinkMaxMs: number;
    allowClassic: boolean;
    allowSkills: boolean;
    defaultMode: GameMode;
    guestPlayEnabled: boolean;
    guestNamePrompt: string;
    maxGuestNameLength: number;
  };
  features: {
    showPing: boolean;
    showBotSelector: boolean;
    showDefeatTester: boolean;
    showSkillDescriptions: boolean;
    enableParticles: boolean;
  };
  skills: AdminSkillConfig[];
  bots: AdminBotConfig[];
  menuItems: AdminMenuItemConfig[];
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  branding: {
    gameTitle: "VERA 31",
    subtitle: "Knockout Arena",
    announcement: "Tactical skills activated!",
    logoEmoji: "",
    logoUrl: "",
    themeFamily: "monster",
  },
  arena: {
    name: "Pasture",
    backgroundImage: "/assets/barnaby/barnaby-field.jpg",
    overlayOpacity: 0.4,
    primaryColor: "#fbbf24",
    secondaryColor: "#34d399",
  },
  gameplay: {
    turnSeconds: 7,
    defaultBotCount: 1,
    botThinkMinMs: 1900,
    botThinkMaxMs: 3400,
    allowClassic: true,
    allowSkills: true,
    defaultMode: "classic",
    guestPlayEnabled: true,
    guestNamePrompt: "Choose Your Name",
    maxGuestNameLength: 20,
  },
  features: {
    showPing: true,
    showBotSelector: true,
    showDefeatTester: false,
    showSkillDescriptions: true,
    enableParticles: true,
  },
  skills: [
    {
      id: "rewind",
      name: "Step Back",
      shortLabel: "-2 STEPS",
      description: "Move the count back by 2.",
      icon: "↩",
      color: "#22d3ee",
      enabled: true,
      order: 0,
    },
    {
      id: "turbo",
      name: "Jump Ahead",
      shortLabel: "+3 LEAP",
      description: "Move the count forward by 3.",
      icon: "⚡",
      color: "#f59e0b",
      enabled: true,
      order: 1,
    },
    {
      id: "shield",
      name: "Safety Shield",
      shortLabel: "IMMUNITY",
      description: "Stay safe for one turn.",
      icon: "🛡",
      color: "#c084fc",
      enabled: true,
      order: 2,
    },
    {
      id: "nudge",
      name: "Skip Turn",
      shortLabel: "SKIP TURN",
      description: "Pass your turn to the next player.",
      icon: "🌙",
      color: "#34d399",
      enabled: true,
      order: 3,
    },
    {
      id: "double",
      name: "Double Trouble",
      shortLabel: "FORCE +2",
      description: "Force the next move to use two cards.",
      icon: "✦",
      color: "#fb7185",
      enabled: false,
      order: 4,
    },
  ],
  bots: [
    {
      id: "daisy",
      name: "Daisy Cow 🌸",
      title: "Modulo Queen",
      avatarVariantId: "daisy_v1_cowboy",
      difficulty: "normal",
      enabled: true,
      order: 0,
    },
    {
      id: "bessie",
      name: "Bessie AI 🐮",
      title: "Pasture Slayer",
      avatarVariantId: "rusty_v1_cowboy_glasses",
      difficulty: "hard",
      enabled: true,
      order: 1,
    },
    {
      id: "barnaby",
      name: "Barnaby Horns 👑",
      title: "Grand Champion",
      avatarVariantId: "moss_v1_cowboy_glasses",
      difficulty: "hard",
      enabled: true,
      order: 2,
    },
    {
      id: "nova",
      name: "Nova Moo ✨",
      title: "Cosmic Counter",
      avatarVariantId: "nova_v1_base",
      difficulty: "easy",
      enabled: true,
      order: 3,
    },
    {
      id: "luna",
      name: "Luna Loop 🌙",
      title: "Night Strategist",
      avatarVariantId: "luna_v1_glasses",
      difficulty: "normal",
      enabled: true,
      order: 4,
    },
  ],
  menuItems: [
    {
      id: "play",
      label: "Play",
      path: "/home",
      icon: "home",
      enabled: true,
      requiresAuth: false,
      order: 0,
    },
    {
      id: "cow",
      label: "My Avatars",
      path: "/avatar",
      icon: "cow",
      // The avatar studio ("My Avatars") is a top-level menu entry (matches the designer's menu).
      enabled: true,
      requiresAuth: true,
      order: 1,
    },
    {
      id: "tournaments",
      label: "Tournaments",
      path: "/events",
      icon: "trophy",
      enabled: true,
      requiresAuth: true,
      order: 2,
    },
    {
      id: "sponsor",
      label: "Sponsor",
      path: "/sponsorship",
      icon: "sponsor",
      enabled: true,
      requiresAuth: false,
      order: 3,
    },
    {
      id: "shop",
      label: "Shop",
      path: "/shop",
      icon: "shop",
      enabled: true,
      requiresAuth: true,
      order: 4,
    },
    {
      id: "history",
      label: "Past Games",
      path: "/history",
      icon: "history",
      enabled: true,
      requiresAuth: true,
      order: 7,
    },
    {
      id: "settings",
      label: "Settings",
      path: "/settings",
      icon: "settings",
      enabled: true,
      requiresAuth: true,
      order: 8,
    },
  ],
};

export function cloneGameConfig(config: GameConfig): GameConfig {
  return structuredClone(config);
}

/** A named, reusable SPONSOR THEME (Game Studio → tournament creation). Overrides a tournament game's
 *  brand (name/logo/tagline) + arena backdrop. */
/** In-arena AD SURFACES for a sponsor theme — which brand placements are on and how they look. */
export type BoardStyle = "felt" | "slate" | "midnight" | "brand";
export type TileStyle = "classic" | "flat" | "outline" | "solid";
export type RosterStyle = "default" | "glass" | "solid" | "brand";

export interface ThemeAds {
  placement: "topLeft" | "topCenter" | "topRight";
  boardWatermark: boolean;
  boardWatermarkOpacity: number;
  boardImage: string; // custom artwork replacing the board felt ("" = brand-tinted default)
  rosterBanner: boolean;
  rosterBannerImage: string; // custom banner art ("" = use the logo / brand name)
  // Look of the board, its number tiles, and the arena list.
  boardStyle: BoardStyle;
  tileStyle: TileStyle;
  rosterStyle: RosterStyle;
  // Extra ad inventory: the two marquee slots the logo/name ISN'T using (centre + opposite side).
  bannerCenterImage: string;
  bannerOppositeImage: string;
}

export const DEFAULT_THEME_ADS: ThemeAds = {
  placement: "topLeft",
  boardWatermark: true,
  boardWatermarkOpacity: 0.14,
  boardImage: "",
  rosterBanner: true,
  rosterBannerImage: "",
  boardStyle: "felt",
  tileStyle: "classic",
  rosterStyle: "default",
  bannerCenterImage: "",
  bannerOppositeImage: "",
};

/** Simple LOBBY-screen customisation (the waiting/countdown page before a match). */
export interface ThemeLobby {
  backgroundImage: string;
  overlayOpacity: number;
  notice: string;      // a short announcement line shown to waiting players
  bannerImage: string; // sponsor ad banner on the lobby
}

export const DEFAULT_THEME_LOBBY: ThemeLobby = {
  backgroundImage: "",
  overlayOpacity: 0.45,
  notice: "",
  bannerImage: "",
};

export interface GameTheme {
  id: string;
  name: string;
  gameTitle: string;
  subtitle: string;
  logoUrl: string;
  backgroundImage: string;
  overlayOpacity: number;
  primaryColor: string;
  secondaryColor: string;
  lobby?: ThemeLobby; // optional: lobby-screen customisation
  ads?: ThemeAds; // optional: themes saved before ad surfaces existed fall back to DEFAULT_THEME_ADS
}
