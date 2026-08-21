import { z } from "zod";

export const PaginationDtoSchema = z
  .object({
    cursor: z.string().min(1).optional(),
    limit: z
      .string()
      .regex(/^\d+$/)
      .transform((val) => Number(val))
      .refine((val) => val > 0 && val <= 100)
      .optional(),
  })
  .strict();

export type PaginationDto = z.infer<typeof PaginationDtoSchema>;
