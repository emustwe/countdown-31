import { z } from "zod";

export const UpdateProfileDtoSchema = z
  .object({
    fullName: z.string().trim().min(1).max(120).optional(),
    // A data URL (data:image/...;base64,...) for the avatar, or null to clear it. Capped to
    // keep the row small — the client resizes avatars before upload.
    avatarUrl: z
      .string()
      .max(2_000_000)
      .refine((v) => v.startsWith("data:image/"), "avatarUrl must be an image data URL")
      .nullable()
      .optional(),
  })
  .strict();

export type UpdateProfileDto = z.infer<typeof UpdateProfileDtoSchema>;
