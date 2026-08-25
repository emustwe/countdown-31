import { z } from "zod";

// Input validation for the sponsors/admin/promo/inquiry/cosmetics write endpoints. Small,
// well-defined payloads use .strict() (reject unknown fields). The large promo/sponsor payloads
// validate types + bound sizes and let Zod strip any unknown keys (prevents mass-assignment without
// 400ing on a harmless extra field).

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Times must be HH:MM (GMT)");
const numeric = z.union([z.number(), z.string().max(20)]);
const nullableNumeric = numeric.nullable();
const looseDate = z.string().max(40).nullable(); // "YYYY-MM-DD" or ISO; parsed server-side

const teamInput = z.object({ name: z.string().max(60).optional(), captainName: z.string().max(80).optional() });

// ---- Promo tournaments ----
const promoFields = {
  title: z.string().max(120).optional(),
  description: z.string().max(1000).optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
  type: z.enum(["REGULAR", "INFLUENCER"]).optional(),
  startAt: looseDate.optional(),
  startDate: looseDate.optional(),
  timeOptions: z.array(hhmm).max(24).optional(),
  teams: z.array(teamInput).max(8).optional(),
  hasInfluencers: z.boolean().optional(),
  groupCount: numeric.optional(),
  minGroupPlayers: nullableNumeric.optional(),
  maxGroupPlayers: nullableNumeric.optional(),
  prizePool: z.string().max(120).optional(),
  winnerCount: numeric.optional(),
  minPlayers: nullableNumeric.optional(),
  maxPlayers: nullableNumeric.optional(),
  seekingSponsor: z.boolean().optional(),
  sponsorId: z.string().max(64).nullable().optional(),
};
export const PromoCreateSchema = z.object({ ...promoFields, title: z.string().min(1).max(120) });
export const PromoUpdateSchema = z.object({ ...promoFields, status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional() });

// ---- Tournament campaign studio ----
const safeAssetUrl = z.string().max(500).refine(
  (value) => value === "" || value.startsWith("/") || /^https:\/\//i.test(value),
  "Use a local asset path or an HTTPS URL",
);
const safeExternalUrl = z.string().max(500).refine(
  (value) => value === "" || /^https:\/\//i.test(value),
  "External links must use HTTPS",
);
const hexColor = z.string().regex(/^#[0-9a-f]{6}$/i, "Use a six-digit hex color");
export const TournamentCampaignManifestSchema = z.object({
  identity: z.object({
    campaignTitle: z.string().min(1).max(80),
    sponsorName: z.string().min(1).max(60),
    disclosureLabel: z.string().min(1).max(40),
    demoDisclaimer: z.string().max(140).optional(),
  }).strict(),
  theme: z.object({
    primaryColor: hexColor,
    secondaryColor: hexColor,
    backgroundImage: safeAssetUrl,
    mobileBackgroundImage: safeAssetUrl.optional(),
    overlayOpacity: z.number().min(0.35).max(0.9),
  }).strict(),
  logoTile: z.object({
    enabled: z.boolean(),
    logoText: z.string().min(1).max(30),
    animationPreset: z.enum(["float", "turntable", "pulse", "static"]),
    desktopEnabled: z.boolean(),
    mobileEnabled: z.boolean(),
    mediaUrl: safeAssetUrl.optional(),
    mediaType: z.enum(["image", "video"]).optional(),
  }).strict(),
  featurePanel: z.object({
    enabled: z.boolean(),
    headline: z.string().min(1).max(80),
    body: z.string().max(180),
  }).strict(),
  cause: z.object({
    enabled: z.boolean(),
    label: z.string().min(1).max(32),
    title: z.string().min(1).max(80),
    message: z.string().max(220),
    beneficiaryName: z.string().min(1).max(100),
    targetAmount: z.number().min(1).max(1_000_000_000),
    raisedAmount: z.number().min(0).max(1_000_000_000),
    currency: z.enum(["USD", "USDT", "EUR", "GBP"]),
    showProgress: z.boolean(),
    ctaLabel: z.string().min(1).max(32),
    ctaUrl: safeExternalUrl,
  }).strict().optional(),
}).strict();
export type TournamentCampaignManifestInput = z.infer<typeof TournamentCampaignManifestSchema>;
export const CampaignReviewSchema = z.object({
  lane: z.enum(["BRAND", "SAFETY"]),
  decision: z.enum(["COMMENT", "APPROVED", "CHANGES_REQUESTED"]),
  comment: z.string().max(1000).default(""),
}).strict();
export const CampaignPublishSchema = z.object({
  activateAt: z.string().datetime().nullable().optional(),
  expireAt: z.string().datetime().nullable().optional(),
}).strict();
export type CampaignReviewInput = z.infer<typeof CampaignReviewSchema>;
export type CampaignPublishInput = z.infer<typeof CampaignPublishSchema>;

// ---- Sponsors ----
export const SponsorCreateSchema = z.object({
  name: z.string().min(1).max(80),
  username: z.string().max(40).optional(),
  password: z.string().max(200).optional(),
});
export const SponsorUpdateSchema = z.object({
  name: z.string().max(80).optional(),
  username: z.string().max(40).optional(),
  password: z.string().max(200).optional(),
  status: z.string().max(20).optional(),
});
export const SponsorLoginSchema = z.object({ username: z.string().max(64), password: z.string().max(200) }).strict();
export const ClaimSchema = z.object({ sponsorCode: z.string().max(64) }).strict();

// ---- Inquiries ----
export const InquiryCreateSchema = z.object({
  type: z.enum(["SPONSORSHIP", "ENTRY"]),
  tournamentId: z.string().max(64).nullable().optional(),
  tournamentRef: z.string().max(120).optional(),
  email: z.string().email().max(200),
  message: z.string().max(2000).optional(),
  name: z.string().max(120).optional(),
});
export const InquiryStatusSchema = z.object({ status: z.enum(["NEW", "CONTACTED", "CLOSED"]) }).strict();
export const AssignSponsorSchema = z.object({
  name: z.string().max(80).optional(),
  username: z.string().max(40).optional(),
  password: z.string().max(200).optional(),
  sponsorId: z.string().max(64).optional(),
});

// ---- Join / vote (user-facing, strict) ----
export const JoinSchema = z.object({ joinCode: z.string().max(64).optional(), teamCode: z.string().max(64).optional() }).strict();
export const VoteTimeSchema = z.object({ slot: hhmm }).strict();

// ---- Cosmetics (strict whitelist — no arbitrary keys persisted) ----
const cosStr = z.string().max(40);
const AvatarSchema = z
  .object({
    top: cosStr, hairColor: cosStr, skin: cosStr, eyes: cosStr, eyebrows: cosStr, mouth: cosStr,
    clothing: cosStr, clothesColor: cosStr, facialHair: cosStr, facialHairColor: cosStr, glasses: cosStr,
    pants: cosStr, shoeStyle: cosStr, shoeColor: cosStr,
  })
  .partial()
  .strict();
const CardSchema = z
  .object({ color: z.string().max(10), pattern: cosStr, shape: cosStr, border: cosStr })
  .partial()
  .strict();
export const CosmeticsSchema = z
  .object({ card: CardSchema.optional(), avatar: AvatarSchema.optional(), board: z.object({ skin: cosStr }).strict().optional() })
  .strict();
