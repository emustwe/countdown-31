import { z } from "zod";

/** Money amounts travel as decimal strings of minor units (BigInt can't ride in JSON). */
const MinorUnits = z.string().regex(/^\d+$/, "must be a non-negative integer amount (minor units)");

export const PrizeSchema = z
  .object({
    rank: z.number().int().positive(),
    amount: MinorUnits,
  })
  .strict();

export const CreateTournamentDtoSchema = z
  .object({
    name: z.string().min(1).max(120),
    description: z.string().max(1000).optional(),
    modelId: z.string().min(1),
    format: z.enum(["LEADERBOARD", "BRACKET", "WEEKLY", "MONTHLY"]).default("LEADERBOARD"),
    // Co-branding skin — rules/engine identical, only the look changes. Extensible per partner.
    brand: z.enum(["WM", "VA"]).default("WM"),
    entryFee: MinorUnits.default("0"),
    startingCredits: MinorUnits.refine((v) => BigInt(v) > 0n, "startingCredits must be > 0"),
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    maxEntries: z.number().int().positive().optional(),
    // Bracket-only. Total capacity is derived as playersPerMatch ^ roundsCount so the bracket
    // always fills and reduces cleanly to a single winner (top scorer of each match advances).
    playersPerMatch: z.number().int().min(2).max(16).optional(),
    roundsCount: z.number().int().min(1).max(8).optional(),
    // One admin-scheduled start time per round (round 1 first). Must be strictly increasing.
    // For WEEKLY there are 3 rounds, for MONTHLY 4.
    roundStartAts: z.array(z.string().datetime()).min(1).max(8).optional(),
    // WEEKLY/MONTHLY: the total prize pool (split across the Top 10 by fixed percentages).
    prizePool: MinorUnits.optional(),
    // Automatic gap (seconds) before the next round starts. Default 600 (10 min).
    roundGapSec: z.number().int().min(30).max(86_400).optional(),
    prizes: z.array(PrizeSchema).default([]),
  })
  .strict()
  .refine((d) => new Date(d.endAt) > new Date(d.startAt), {
    message: "endAt must be after startAt",
    path: ["endAt"],
  })
  .superRefine((d, ctx) => {
    if (d.format === "WEEKLY" || d.format === "MONTHLY") {
      const rounds = d.format === "WEEKLY" ? 3 : 4;
      if (!d.roundStartAts || d.roundStartAts.length !== rounds) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${d.format} tournaments need one start time for each of its ${rounds} rounds`, path: ["roundStartAts"] });
      }
      const times = (d.roundStartAts ?? []).map((s) => new Date(s).getTime());
      for (let i = 1; i < times.length; i++) {
        if (times[i]! <= times[i - 1]!) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "roundStartAts must be strictly increasing", path: ["roundStartAts", i] });
          break;
        }
      }
      if (d.prizePool === undefined || BigInt(d.prizePool) <= 0n) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "prizePool is required and must be > 0", path: ["prizePool"] });
      }
      return;
    }
    if (d.format !== "BRACKET") return;
    if (d.playersPerMatch === undefined)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "playersPerMatch is required for bracket tournaments", path: ["playersPerMatch"] });
    if (d.roundsCount === undefined)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "roundsCount is required for bracket tournaments", path: ["roundsCount"] });
    if (!d.roundStartAts) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "roundStartAts is required for bracket tournaments", path: ["roundStartAts"] });
      return;
    }
    if (d.roundsCount !== undefined && d.roundStartAts.length !== d.roundsCount) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "roundStartAts must have one entry per round", path: ["roundStartAts"] });
    }
    const times = d.roundStartAts.map((s) => new Date(s).getTime());
    for (let i = 1; i < times.length; i++) {
      if (times[i]! <= times[i - 1]!) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "roundStartAts must be strictly increasing", path: ["roundStartAts", i] });
        break;
      }
    }
    if (times.length && new Date(d.endAt).getTime() <= times[times.length - 1]!) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "endAt must be after the final round start", path: ["endAt"] });
    }
  });

export type CreateTournamentDto = z.infer<typeof CreateTournamentDtoSchema>;
