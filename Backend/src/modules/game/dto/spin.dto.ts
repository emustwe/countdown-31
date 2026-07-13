import { z } from "zod";

export const SpinDtoSchema = z
  .object({
    totalBet: z
      .string()
      .regex(/^\d+$/, "totalBet must be a positive integer string (minor units)")
      .transform((val) => BigInt(val))
      .refine((val) => val > 0n, "totalBet must be greater than zero"),
    idempotencyKey: z.string().min(1).max(200),
  })
  .strict();

export type SpinDto = z.infer<typeof SpinDtoSchema>;
