import { z } from "zod";

// Free-play practice spin: the client tracks a dummy coin balance and sends it so the
// response can echo the new dummy balance. No real money is involved.
export const PracticeSpinDtoSchema = z
  .object({
    totalBet: z
      .string()
      .regex(/^\d+$/, "totalBet must be a positive integer string")
      .transform((val) => BigInt(val))
      .refine((val) => val > 0n, "totalBet must be greater than zero"),
    balance: z
      .string()
      .regex(/^\d+$/, "balance must be a non-negative integer string")
      .transform((val) => BigInt(val)),
  })
  .strict();

export type PracticeSpinDto = z.infer<typeof PracticeSpinDtoSchema>;
