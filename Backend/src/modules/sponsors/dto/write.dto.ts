import { z } from "zod";

// Input validation for the sponsors/admin/promo/inquiry/cosmetics write endpoints. Small,
// well-defined payloads use .strict() (reject unknown fields). The large promo/sponsor payloads
// validate types + bound sizes and let Zod strip any unknown keys (prevents mass-assignment without
// 400ing on a harmless extra field).

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Times must be HH:MM (GMT)");
const numeric = z.union([z.number(), z.string().max(20)]);
const nullableNumeric = numeric.nullable();
const looseDate = z.string().max(40).nullable(); // "YYYY-MM-DD" or ISO; parsed server-side

// ---- Promo tournaments ----
const promoFields = {
  title: z.string().max(120).optional(),
  description: z.string().max(1000).optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
  // REGULAR = single knockout. GROUP = multi-day 31-per-group format.
  type: z.enum(["REGULAR", "GROUP"]).optional(),
  // GROUP only: total days incl. the final day (must be >= 2 for a separate final).
  durationDays: nullableNumeric.optional(),
  startAt: looseDate.optional(),
  startDate: looseDate.optional(),
  timeOptions: z.array(hhmm).max(24).optional(),
  prizePool: z.string().max(120).optional(),
  winnerCount: numeric.optional(),
  minPlayers: nullableNumeric.optional(),
  maxPlayers: nullableNumeric.optional(),
  seekingSponsor: z.boolean().optional(),
  sponsorId: z.string().max(64).nullable().optional(),
  // Selected Game Studio sponsor theme (applied to this tournament's game). Null clears it.
  themeId: z.string().max(64).nullable().optional(),
};
export const PromoCreateSchema = z.object({ ...promoFields, title: z.string().min(1).max(120) });
export const PromoUpdateSchema = z.object({ ...promoFields, status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional() });

// Manual per-day group scheduling: admin assigns each stage group a day (1..durationDays-1).
export const ScheduleSchema = z
  .object({
    schedule: z
      .array(z.object({ groupId: z.string().max(64), day: z.number().int().min(1).max(366) }))
      .max(5000),
  })
  .strict();

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
export const JoinSchema = z
  .object({
    joinCode: z.string().max(64).optional(),
    // Locked skill loadout chosen at join time (0–2 of the tactical skills).
    skills: z.array(z.enum(["rewind", "turbo", "shield", "nudge", "double"])).max(2).optional(),
  })
  .strict();
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
