import { z } from "zod";
import { PrizeSchema } from "./create-tournament.dto";

const MinorUnits = z.string().regex(/^\d+$/, "must be a non-negative integer amount (minor units)");

/** All fields optional — only editable while a tournament is still SCHEDULED (enforced in
 * the service). Cross-field date ordering is validated there too, since either bound may be
 * absent from the patch. */
export const UpdateTournamentDtoSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(1000).optional(),
    modelId: z.string().min(1).optional(),
    entryFee: MinorUnits.optional(),
    startingCredits: MinorUnits.refine((v) => BigInt(v) > 0n, "startingCredits must be > 0").optional(),
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
    maxEntries: z.number().int().positive().nullable().optional(),
    prizes: z.array(PrizeSchema).optional(),
  })
  .strict();

export type UpdateTournamentDto = z.infer<typeof UpdateTournamentDtoSchema>;
