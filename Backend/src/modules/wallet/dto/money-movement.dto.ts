import { z } from "zod";

// Amounts are decimal strings of integer minor units (never JS numbers, to avoid float
// precision issues at the API boundary) — parsed to bigint after validation.
const MAX_MOVEMENT_MINOR_UNITS = 100_000_000n; // demo-only sanity cap, $1,000,000.00

export const MoneyMovementDtoSchema = z
  .object({
    amount: z
      .string()
      .regex(/^\d+$/, "amount must be a positive integer string (minor units)")
      .transform((val) => BigInt(val))
      .refine((val) => val > 0n, "amount must be greater than zero")
      .refine((val) => val <= MAX_MOVEMENT_MINOR_UNITS, "amount exceeds the maximum allowed"),
    idempotencyKey: z.string().min(1).max(200),
  })
  .strict();

export type MoneyMovementDto = z.infer<typeof MoneyMovementDtoSchema>;
