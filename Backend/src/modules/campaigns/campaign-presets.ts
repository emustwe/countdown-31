// Tournament Sponsor Campaign Studio — manifest shape, defaults, normalizer, and the 7 seed presets.
//
// The manifest is stored verbatim in TournamentCampaignVersion.manifest (Json). The frontend consumes
// the EXACT `TournamentCampaignManifest` interface below, so keep field names/shape stable.

export type AnimationPreset = "float" | "turntable" | "pulse" | "static";
export type MediaType = "image" | "video";
export type Currency = "USD" | "USDT" | "EUR" | "GBP";

export interface CampaignIdentity {
  campaignTitle: string;
  sponsorName: string;
  disclosureLabel: string;
  demoDisclaimer?: string;
}
export interface CampaignTheme {
  primaryColor: string;
  secondaryColor: string;
  backgroundImage: string;
  mobileBackgroundImage?: string;
  overlayOpacity: number;
}
export interface CampaignLogoTile {
  enabled: boolean;
  logoText: string;
  animationPreset: AnimationPreset;
  desktopEnabled: boolean;
  mobileEnabled: boolean;
  mediaUrl?: string;
  mediaType?: MediaType;
}
export interface CampaignFeaturePanel {
  enabled: boolean;
  headline: string;
  body: string;
}
export interface CampaignCause {
  enabled: boolean;
  label: string;
  title: string;
  message: string;
  beneficiaryName: string;
  targetAmount: number;
  raisedAmount: number;
  currency: Currency;
  showProgress: boolean;
  ctaLabel: string;
  ctaUrl: string;
}
export interface TournamentCampaignManifest {
  identity: CampaignIdentity;
  theme: CampaignTheme;
  logoTile: CampaignLogoTile;
  featurePanel: CampaignFeaturePanel;
  cause?: CampaignCause;
}

const ANIMATION_PRESETS: readonly AnimationPreset[] = ["float", "turntable", "pulse", "static"];
const MEDIA_TYPES: readonly MediaType[] = ["image", "video"];
const CURRENCIES: readonly Currency[] = ["USD", "USDT", "EUR", "GBP"];

// ---- Primitive coercers (partial drafts are untrusted) --------------------------------------------
function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function optStr(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}
function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}
function num(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function clamp01(v: unknown, fallback: number): number {
  return Math.min(1, Math.max(0, num(v, fallback)));
}
function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}
function optOneOf<T extends string>(v: unknown, allowed: readonly T[]): T | undefined {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
}

/** A safe, fully-defaulted empty manifest (used for the initial DRAFT of a new campaign). */
export function defaultManifest(): TournamentCampaignManifest {
  return {
    identity: { campaignTitle: "", sponsorName: "", disclosureLabel: "Presented by", demoDisclaimer: undefined },
    theme: {
      primaryColor: "#8cff65",
      secondaryColor: "#0f172a",
      backgroundImage: "",
      mobileBackgroundImage: undefined,
      overlayOpacity: 0.55,
    },
    logoTile: {
      enabled: true,
      logoText: "",
      animationPreset: "float",
      desktopEnabled: true,
      mobileEnabled: true,
      mediaUrl: undefined,
      mediaType: undefined,
    },
    featurePanel: { enabled: false, headline: "", body: "" },
    cause: {
      enabled: false,
      label: "Supporting",
      title: "",
      message: "",
      beneficiaryName: "",
      targetAmount: 0,
      raisedAmount: 0,
      currency: "USD",
      showProgress: true,
      ctaLabel: "Learn more",
      ctaUrl: "",
    },
  };
}

/**
 * Deep-fill an untrusted (possibly partial) manifest with defaults so drafts are always safe to store
 * and render. Unknown/invalid fields are coerced to their default.
 */
export function normalizeManifest(input: unknown): TournamentCampaignManifest {
  const src = (input && typeof input === "object" ? (input as Record<string, unknown>) : {}) as Record<string, unknown>;
  const d = defaultManifest();

  const identity = (src.identity ?? {}) as Record<string, unknown>;
  const theme = (src.theme ?? {}) as Record<string, unknown>;
  const logoTile = (src.logoTile ?? {}) as Record<string, unknown>;
  const featurePanel = (src.featurePanel ?? {}) as Record<string, unknown>;
  const cause = (src.cause ?? {}) as Record<string, unknown>;
  const dCause = d.cause!;

  return {
    identity: {
      campaignTitle: str(identity.campaignTitle, d.identity.campaignTitle),
      sponsorName: str(identity.sponsorName, d.identity.sponsorName),
      disclosureLabel: str(identity.disclosureLabel, d.identity.disclosureLabel),
      demoDisclaimer: optStr(identity.demoDisclaimer),
    },
    theme: {
      primaryColor: str(theme.primaryColor, d.theme.primaryColor),
      secondaryColor: str(theme.secondaryColor, d.theme.secondaryColor),
      backgroundImage: str(theme.backgroundImage, d.theme.backgroundImage),
      mobileBackgroundImage: optStr(theme.mobileBackgroundImage),
      overlayOpacity: clamp01(theme.overlayOpacity, d.theme.overlayOpacity),
    },
    logoTile: {
      enabled: bool(logoTile.enabled, d.logoTile.enabled),
      logoText: str(logoTile.logoText, d.logoTile.logoText),
      animationPreset: oneOf(logoTile.animationPreset, ANIMATION_PRESETS, d.logoTile.animationPreset),
      desktopEnabled: bool(logoTile.desktopEnabled, d.logoTile.desktopEnabled),
      mobileEnabled: bool(logoTile.mobileEnabled, d.logoTile.mobileEnabled),
      mediaUrl: optStr(logoTile.mediaUrl),
      mediaType: optOneOf(logoTile.mediaType, MEDIA_TYPES),
    },
    featurePanel: {
      enabled: bool(featurePanel.enabled, d.featurePanel.enabled),
      headline: str(featurePanel.headline, d.featurePanel.headline),
      body: str(featurePanel.body, d.featurePanel.body),
    },
    cause: {
      enabled: bool(cause.enabled, dCause.enabled),
      label: str(cause.label, dCause.label),
      title: str(cause.title, dCause.title),
      message: str(cause.message, dCause.message),
      beneficiaryName: str(cause.beneficiaryName, dCause.beneficiaryName),
      targetAmount: Math.max(0, num(cause.targetAmount, dCause.targetAmount)),
      raisedAmount: Math.max(0, num(cause.raisedAmount, dCause.raisedAmount)),
      currency: oneOf(cause.currency, CURRENCIES, dCause.currency),
      showProgress: bool(cause.showProgress, dCause.showProgress),
      ctaLabel: str(cause.ctaLabel, dCause.ctaLabel),
      ctaUrl: str(cause.ctaUrl, dCause.ctaUrl),
    },
  };
}

// ---- Preset seed catalog --------------------------------------------------------------------------
export interface CampaignPresetSeed {
  slug: string;
  name: string;
  category: string;
  badge: string;
  description: string;
  manifest: TournamentCampaignManifest;
}

interface PresetSpec {
  slug: string;
  name: string;
  category: string;
  badge: string;
  description: string;
  campaignTitle: string;
  sponsorName: string;
  disclosureLabel: string;
  logoText: string;
  animationPreset: AnimationPreset;
  primaryColor: string;
  secondaryColor: string;
  backgroundImage: string;
  headline: string;
  body: string;
  cause: {
    label: string;
    title: string;
    message: string;
    beneficiaryName: string;
    targetAmount: number;
    raisedAmount: number;
    currency: Currency;
    ctaLabel: string;
    ctaUrl: string;
  };
}

function buildPreset(spec: PresetSpec): CampaignPresetSeed {
  const manifest = normalizeManifest({
    identity: {
      campaignTitle: spec.campaignTitle,
      sponsorName: spec.sponsorName,
      disclosureLabel: spec.disclosureLabel,
    },
    theme: {
      primaryColor: spec.primaryColor,
      secondaryColor: spec.secondaryColor,
      backgroundImage: spec.backgroundImage,
      overlayOpacity: 0.55,
    },
    logoTile: {
      enabled: true,
      logoText: spec.logoText,
      animationPreset: spec.animationPreset,
      desktopEnabled: true,
      mobileEnabled: true,
    },
    featurePanel: { enabled: true, headline: spec.headline, body: spec.body },
    cause: {
      enabled: true,
      label: spec.cause.label,
      title: spec.cause.title,
      message: spec.cause.message,
      beneficiaryName: spec.cause.beneficiaryName,
      targetAmount: spec.cause.targetAmount,
      raisedAmount: spec.cause.raisedAmount,
      currency: spec.cause.currency,
      showProgress: true,
      ctaLabel: spec.cause.ctaLabel,
      ctaUrl: spec.cause.ctaUrl,
    },
  } satisfies Partial<TournamentCampaignManifest>);
  return {
    slug: spec.slug,
    name: spec.name,
    category: spec.category,
    badge: spec.badge,
    description: spec.description,
    manifest,
  };
}

const PRESET_SPECS: PresetSpec[] = [
  {
    slug: "nike-31",
    name: "Nike 31",
    category: "Sports",
    badge: "Signature",
    description: "Bold volt-green athletic energy for a flagship sports sponsor.",
    campaignTitle: "Nike 31 Championship",
    sponsorName: "Nike",
    disclosureLabel: "Presented by",
    logoText: "NIKE 31",
    animationPreset: "pulse",
    primaryColor: "#ccff00",
    secondaryColor: "#0a0a0a",
    backgroundImage: "/assets/campaigns/nike-arena.jpg",
    headline: "JUST PLAY IT",
    body: "31 rounds. One champion. Bring everything you've got to the arena.",
    cause: {
      label: "Powering",
      title: "Move the Next Generation",
      message: "Every match helps fund grassroots sports programs for young athletes worldwide.",
      beneficiaryName: "Global Youth Athletic Alliance",
      targetAmount: 50000,
      raisedAmount: 18400,
      currency: "USD",
      ctaLabel: "Support youth sport",
      ctaUrl: "https://example.org/youth-athletics",
    },
  },
  {
    slug: "adidas-31",
    name: "Adidas 31",
    category: "Sports",
    badge: "Signature",
    description: "Cool ocean-blue three-stripe styling with a marine cause.",
    campaignTitle: "Adidas 31 Open",
    sponsorName: "Adidas",
    disclosureLabel: "Presented by",
    logoText: "ADIDAS 31",
    animationPreset: "float",
    primaryColor: "#38bdf8",
    secondaryColor: "#0c1a2b",
    backgroundImage: "/assets/campaigns/adidas-arena.jpg",
    headline: "IMPOSSIBLE IS NOTHING",
    body: "Play for the win, play for the water. Three stripes, one blue planet.",
    cause: {
      label: "Protecting",
      title: "Keep the Play Zones Blue",
      message: "A share of every tournament goes to restoring coastal play environments.",
      beneficiaryName: "Ocean Play Preservation Trust",
      targetAmount: 35000,
      raisedAmount: 12750,
      currency: "EUR",
      ctaLabel: "Protect the oceans",
      ctaUrl: "https://example.org/ocean-play",
    },
  },
  {
    slug: "moomorrow-31",
    name: "Moomorrow / Green Meadow",
    category: "Community",
    badge: "Demo",
    description: "The Moomorrow Farms pasture arena with the always-on cow mascot.",
    campaignTitle: "Moomorrow Cup 2026",
    sponsorName: "Moomorrow Farms",
    disclosureLabel: "Presented by",
    logoText: "MOO MORROW",
    animationPreset: "turntable",
    primaryColor: "#8cff65",
    secondaryColor: "#1b3a1b",
    backgroundImage: "/assets/barnaby/barnaby-pasture-arena.jpg",
    headline: "FRESH FROM THE PASTURE",
    body: "Barnaby the cow invites you to the greenest tournament in the meadow.",
    cause: {
      label: "Growing",
      title: "Seed the Green Meadow",
      message: "Proceeds help local farmers keep their pastures thriving for the next generation.",
      beneficiaryName: "Green Meadow Farmers Trust",
      targetAmount: 25000,
      raisedAmount: 9100,
      currency: "USD",
      ctaLabel: "Back the farmers",
      ctaUrl: "https://example.org/green-meadow",
    },
  },
  {
    slug: "cyber-neon-31",
    name: "Cyber Neon 31",
    category: "Tech",
    badge: "Neon",
    description: "High-voltage cyan neon grid for a futuristic tech sponsor.",
    campaignTitle: "Cyber Neon 31",
    sponsorName: "NeonGrid",
    disclosureLabel: "Presented by",
    logoText: "CYBER 31",
    animationPreset: "turntable",
    primaryColor: "#67e8f9",
    secondaryColor: "#0b1120",
    backgroundImage: "/assets/campaigns/cyber-neon-arena.jpg",
    headline: "ENTER THE GRID",
    body: "Jack in and climb the leaderboard through 31 neon-lit rounds.",
    cause: {
      label: "Funding",
      title: "Code the Future",
      message: "Every credit earned helps teach the next generation of developers to code.",
      beneficiaryName: "NextGen Coder",
      targetAmount: 50000,
      raisedAmount: 21600,
      currency: "USDT",
      ctaLabel: "Fund young coders",
      ctaUrl: "https://example.org/nextgen-coder",
    },
  },
  {
    slug: "golden-oasis",
    name: "Golden Oasis Clean Water",
    category: "Charity",
    badge: "Charity",
    description: "Warm golden desert theme raising funds for clean water wells.",
    campaignTitle: "Golden Oasis Cup",
    sponsorName: "Golden Oasis",
    disclosureLabel: "In support of",
    logoText: "GOLDEN OASIS",
    animationPreset: "float",
    primaryColor: "#fbbf24",
    secondaryColor: "#3a2a08",
    backgroundImage: "/assets/campaigns/golden-oasis-arena.jpg",
    headline: "EVERY DROP COUNTS",
    body: "Play beneath the desert sun and help turn sand into springs.",
    cause: {
      label: "Building",
      title: "Wells for Every Village",
      message: "Your play helps drill clean-water wells in communities that need them most.",
      beneficiaryName: "Clean Water Wells",
      targetAmount: 10000,
      raisedAmount: 4300,
      currency: "EUR",
      ctaLabel: "Give clean water",
      ctaUrl: "https://example.org/clean-water-wells",
    },
  },
  {
    slug: "obsidian-wildlife",
    name: "Obsidian Core Wildlife",
    category: "Charity",
    badge: "Wildlife",
    description: "Dark obsidian theme with fiery orange accents for habitat rescue.",
    campaignTitle: "Obsidian Core Wildlife Cup",
    sponsorName: "Obsidian Core",
    disclosureLabel: "In support of",
    logoText: "OBSIDIAN",
    animationPreset: "pulse",
    primaryColor: "#f97316",
    secondaryColor: "#0a0a0a",
    backgroundImage: "/assets/campaigns/obsidian-wildlife-arena.jpg",
    headline: "GUARD THE WILD",
    body: "31 rounds forged in obsidian — every win protects a wild place.",
    cause: {
      label: "Rescuing",
      title: "Save the Last Habitats",
      message: "Proceeds fund the rescue and protection of endangered wildlife habitats.",
      beneficiaryName: "Global Habitat Rescue",
      targetAmount: 100000,
      raisedAmount: 37800,
      currency: "USD",
      ctaLabel: "Protect wildlife",
      ctaUrl: "https://example.org/habitat-rescue",
    },
  },
  {
    slug: "candy-carnival",
    name: "Candy Carnival Children's Smiles",
    category: "Charity",
    badge: "Carnival",
    description: "Playful candy-yellow carnival theme supporting children's smiles.",
    campaignTitle: "Candy Carnival Cup",
    sponsorName: "Candy Carnival",
    disclosureLabel: "In support of",
    logoText: "CANDY CARNIVAL",
    animationPreset: "float",
    primaryColor: "#facc15",
    secondaryColor: "#3b0764",
    backgroundImage: "/assets/campaigns/candy-carnival-arena.jpg",
    headline: "SPIN FOR SMILES",
    body: "Sweeten your day at the carnival and help a child smile again.",
    cause: {
      label: "Helping",
      title: "Bring Back the Smiles",
      message: "Every ticket helps fund pediatric dental and smile-restoration care for kids.",
      beneficiaryName: "Pediatric Smiles",
      targetAmount: 15000,
      raisedAmount: 6250,
      currency: "USD",
      ctaLabel: "Help kids smile",
      ctaUrl: "https://example.org/pediatric-smiles",
    },
  },
];

/** The 7 seed presets, each with a fully-normalized manifest. */
export const CAMPAIGN_PRESETS: CampaignPresetSeed[] = PRESET_SPECS.map(buildPreset);

/** Slug of the Moomorrow demo preset (used by the admin demo-setup endpoint). */
export const MOOMORROW_PRESET_SLUG = "moomorrow-31";

/** The Moomorrow demo manifest — matches the frontend demo exactly. */
export const MOOMORROW_MANIFEST: TournamentCampaignManifest =
  CAMPAIGN_PRESETS.find((p) => p.slug === MOOMORROW_PRESET_SLUG)?.manifest ?? defaultManifest();
