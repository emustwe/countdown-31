import { z } from "zod";

export const SetThemeDtoSchema = z
  .object({
    themeFamily: z.enum(["desert", "monster"]),
  })
  .strict();

export type SetThemeDto = z.infer<typeof SetThemeDtoSchema>;
