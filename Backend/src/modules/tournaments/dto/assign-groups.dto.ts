import { z } from "zod";

/** Admin distributes eligible players into a round's groups. Each group lists the match's
 * index (0-based) and the userIds placed in it; every player appears in at most one group. */
export const AssignGroupsDtoSchema = z
  .object({
    groups: z
      .array(
        z
          .object({
            matchIndex: z.number().int().min(0),
            userIds: z.array(z.string().uuid()).max(500),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export type AssignGroupsDto = z.infer<typeof AssignGroupsDtoSchema>;
