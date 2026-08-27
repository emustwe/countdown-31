import { z } from "zod";

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex colour");
const shortText = z.string().trim().min(1).max(80);
const assetPath = z.string().trim().min(1).max(500);

export const SkillIdSchema = z.enum(["rewind", "turbo", "shield", "nudge", "double"]);

export const GameConfigSchema = z
  .object({
    branding: z
      .object({
        gameTitle: shortText,
        subtitle: z.string().trim().max(100),
        announcement: z.string().trim().max(140),
        logoEmoji: z.string().trim().min(1).max(8),
        themeFamily: z.enum(["monster", "desert"]),
      })
      .strict(),
    arena: z
      .object({
        name: shortText,
        backgroundImage: assetPath,
        overlayOpacity: z.number().min(0).max(0.9),
        primaryColor: hexColor,
        secondaryColor: hexColor,
      })
      .strict(),
    gameplay: z
      .object({
        turnSeconds: z.number().int().min(3).max(30),
        defaultBotCount: z.number().int().min(1).max(5),
        botThinkMinMs: z.number().int().min(250).max(10_000),
        botThinkMaxMs: z.number().int().min(300).max(15_000),
        allowClassic: z.boolean(),
        allowSkills: z.boolean(),
        defaultMode: z.enum(["classic", "skills"]),
        guestPlayEnabled: z.boolean(),
        guestNamePrompt: z.string().trim().min(1).max(100),
        maxGuestNameLength: z.number().int().min(3).max(24),
      })
      .strict()
      .refine((value) => value.botThinkMaxMs >= value.botThinkMinMs, {
        message: "Maximum bot thinking time must be at least the minimum",
        path: ["botThinkMaxMs"],
      })
      .refine((value) => value.allowClassic || value.allowSkills, {
        message: "At least one game mode must remain enabled",
        path: ["allowClassic"],
      })
      .refine(
        (value) =>
          (value.defaultMode === "classic" && value.allowClassic) ||
          (value.defaultMode === "skills" && value.allowSkills),
        { message: "The default mode must be enabled", path: ["defaultMode"] },
      ),
    features: z
      .object({
        showPing: z.boolean(),
        showBotSelector: z.boolean(),
        showDefeatTester: z.boolean(),
        showSkillDescriptions: z.boolean(),
        enableParticles: z.boolean(),
      })
      .strict(),
    skills: z
      .array(
        z
          .object({
            id: SkillIdSchema,
            name: shortText,
            shortLabel: z.string().trim().min(1).max(30),
            description: z.string().trim().max(180),
            icon: z.string().trim().min(1).max(8),
            color: hexColor,
            enabled: z.boolean(),
            order: z.number().int().min(0).max(50),
          })
          .strict(),
      )
      .min(2)
      .max(5)
      .refine((items) => new Set(items.map((item) => item.id)).size === items.length, {
        message: "Skill IDs must be unique",
      })
      .refine((items) => items.filter((item) => item.enabled).length >= 2, {
        message: "At least two skills must remain enabled",
      }),
    bots: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-z0-9_-]{2,40}$/),
            name: shortText,
            title: z.string().trim().max(80),
            avatarVariantId: z.string().trim().min(1).max(80),
            difficulty: z.enum(["easy", "normal", "hard"]),
            enabled: z.boolean(),
            order: z.number().int().min(0).max(50),
          })
          .strict(),
      )
      .min(1)
      .max(12)
      .refine((items) => new Set(items.map((item) => item.id)).size === items.length, {
        message: "Bot IDs must be unique",
      })
      .refine((items) => items.some((item) => item.enabled), {
        message: "At least one bot must remain enabled",
      }),
    menuItems: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-z0-9_-]{2,40}$/),
            label: shortText,
            path: z.string().regex(/^\/[a-zA-Z0-9/_-]*$/),
            icon: z.enum([
              "home",
              "cow",
              "trophy",
              "shop",
              "profile",
              "wallet",
              "history",
              "settings",
              "sponsor",
            ]),
            enabled: z.boolean(),
            requiresAuth: z.boolean(),
            order: z.number().int().min(0).max(50),
          })
          .strict(),
      )
      .min(1)
      .max(16)
      .refine((items) => new Set(items.map((item) => item.id)).size === items.length, {
        message: "Menu item IDs must be unique",
      }),
  })
  .strict();

export type GameConfig = z.infer<typeof GameConfigSchema>;

export const DEFAULT_GAME_CONFIG: GameConfig = {
  branding: {
    gameTitle: "COUNT DOWN",
    subtitle: "Live Battle Arena",
    announcement: "Tactical skills activated!",
    logoEmoji: "🐮",
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
    botThinkMinMs: 900,
    botThinkMaxMs: 2300,
    allowClassic: true,
    allowSkills: true,
    defaultMode: "skills",
    guestPlayEnabled: true,
    guestNamePrompt: "Choose Your Name",
    maxGuestNameLength: 20,
  },
  features: {
    showPing: true,
    showBotSelector: true,
    showDefeatTester: true,
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
      id: "profile",
      label: "My Profile",
      path: "/profile",
      icon: "profile",
      enabled: true,
      requiresAuth: true,
      order: 5,
    },
    {
      id: "wallet",
      label: "Wallet",
      path: "/wallet",
      icon: "wallet",
      enabled: true,
      requiresAuth: true,
      order: 6,
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
