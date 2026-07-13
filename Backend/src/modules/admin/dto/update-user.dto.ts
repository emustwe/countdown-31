import { z } from "zod";

export const UpdateUserDtoSchema = z
  .object({
    status: z.enum(["ACTIVE", "BANNED"]).optional(),
    balanceAdjustment: z
      .object({
        // Signed — a negative adjustment claws back demo credits (e.g. correcting an
        // exploit or granting-then-reverting a promo).
        amount: z.string().regex(/^-?\d+$/, "amount must be a signed integer string (minor units)"),
        reason: z.string().min(3).max(500),
      })
      .refine((val) => BigInt(val.amount) !== 0n, "amount must not be zero")
      .optional(),
  })
  .strict()
  .refine((val) => val.status !== undefined || val.balanceAdjustment !== undefined, {
    message: "Provide at least one of status or balanceAdjustment",
  });

export type UpdateUserDto = z.infer<typeof UpdateUserDtoSchema>;
