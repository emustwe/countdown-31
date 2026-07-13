import { z } from "zod";

export const FreeSpinDtoSchema = z
  .object({
    roundId: z.string().uuid(),
  })
  .strict();

export type FreeSpinDto = z.infer<typeof FreeSpinDtoSchema>;
