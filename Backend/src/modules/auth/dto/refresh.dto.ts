import { z } from "zod";

export const RefreshDtoSchema = z
  .object({
    refreshToken: z.string().min(1),
  })
  .strict();

export type RefreshDto = z.infer<typeof RefreshDtoSchema>;
