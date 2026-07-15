import { z } from "zod";

export const SYMBOL_IDS = ["H1", "H2", "H3", "L1", "L2", "L3", "L4", "W", "S", "JP"] as const;
export type SymbolId = (typeof SYMBOL_IDS)[number];

export const PAYING_SYMBOL_IDS = ["H1", "H2", "H3", "L1", "L2", "L3", "L4"] as const;
export type PayingSymbolId = (typeof PAYING_SYMBOL_IDS)[number];

const SymbolIdSchema = z.enum(SYMBOL_IDS);
const PayingSymbolIdSchema = z.enum(PAYING_SYMBOL_IDS);

// Pays for match lengths 2,3,4,5 respectively — index 0 = length 2, index 3 = length 5.
const PayRowSchema = z.array(z.number().nonnegative()).length(4);

export const MathModelSchema = z.object({
  id: z.string().min(1),
  version: z.string().min(1),
  displayName: z.string().min(1),
  // >1 is intentional: this engine also powers a points-only tournament mode where a
  // generous, "always feels rewarding" payout curve is the point, not a house edge.
  targetRtp: z.number().min(0).max(5),
  grid: z.object({
    reels: z.literal(5),
    rows: z.literal(5),
  }),
  symbols: z.array(SymbolIdSchema).min(1),
  wild: z.literal("W"),
  scatter: z.literal("S"),
  // Optional: only tournament-tuned models define a jackpot. A dedicated symbol (never a
  // paying "ways" symbol, same category as the scatter) — its count anywhere on the grid
  // decides the tier, independent of reel adjacency.
  jackpot: z
    .object({
      symbol: z.literal("JP"),
      pays: z.object({
        3: z.number().nonnegative(),
        4: z.number().nonnegative(),
        5: z.number().nonnegative(),
      }),
    })
    .optional(),
  reelStrips: z.array(z.array(SymbolIdSchema).min(1)).length(5),
  paytable: z.record(PayingSymbolIdSchema, PayRowSchema),
  scatterPays: z.array(z.number().nonnegative()).length(3),
  freeSpins: z.object({
    award: z.object({
      3: z.number().int().positive(),
      4: z.number().int().positive(),
      5: z.number().int().positive(),
    }),
    startMultiplier: z.number().positive(),
    multiplierStep: z.number().nonnegative(),
    maxMultiplier: z.number().positive(),
    retrigger: z.boolean(),
  }),
  computed: z
    .object({
      theoreticalRtpBase: z.number().optional(),
      empiricalRtpTotal: z.number().optional(),
      hitFrequency: z.number().optional(),
      volatilityIndex: z.number().optional(),
      simSpins: z.number().optional(),
    })
    .optional(),
});

export type MathModel = z.infer<typeof MathModelSchema>;

export function parseMathModel(data: unknown): MathModel {
  return MathModelSchema.parse(data);
}
