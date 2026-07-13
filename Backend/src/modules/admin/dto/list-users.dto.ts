import { z } from "zod";

export const ListUsersDtoSchema = z
  .object({
    search: z.string().min(1).max(200).optional(),
    cursor: z.string().min(1).optional(),
    limit: z
      .string()
      .regex(/^\d+$/)
      .transform((val) => Number(val))
      .refine((val) => val > 0 && val <= 100)
      .optional(),
  })
  .strict();

export type ListUsersDto = z.infer<typeof ListUsersDtoSchema>;
