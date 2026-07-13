import { z } from "zod";

export const SetActiveModelDtoSchema = z
  .object({
    modelId: z.string().min(1),
  })
  .strict();

export type SetActiveModelDto = z.infer<typeof SetActiveModelDtoSchema>;
