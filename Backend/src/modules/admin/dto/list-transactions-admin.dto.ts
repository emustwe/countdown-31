import { z } from "zod";

export const ListTransactionsAdminDtoSchema = z
  .object({
    cursor: z.string().min(1).optional(),
    limit: z
      .string()
      .regex(/^\d+$/)
      .transform((val) => Number(val))
      .refine((val) => val > 0 && val <= 100)
      .optional(),
    userId: z.string().uuid().optional(),
    type: z.enum(["DEPOSIT", "WITHDRAWAL", "BET_STAKE", "BET_WIN", "ADJUSTMENT"]).optional(),
  })
  .strict();

export type ListTransactionsAdminDto = z.infer<typeof ListTransactionsAdminDtoSchema>;
