import { z } from "zod";

export const RescheduleRoundDtoSchema = z.object({ startAt: z.string().datetime() }).strict();
export type RescheduleRoundDto = z.infer<typeof RescheduleRoundDtoSchema>;
