import { z } from "zod";

export const AnalyticsQueryDtoSchema = z
  .object({
    days: z
      .string()
      .regex(/^\d+$/)
      .transform((val) => Number(val))
      .refine((val) => val > 0 && val <= 365)
      .optional(),
  })
  .strict();

export type AnalyticsQueryDto = z.infer<typeof AnalyticsQueryDtoSchema>;
