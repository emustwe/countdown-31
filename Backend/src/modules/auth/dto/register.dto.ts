import { z } from "zod";

export const RegisterDtoSchema = z
  .object({
    // Optional at the API layer for backward-compatibility; the signup form requires it.
    fullName: z.string().trim().min(1).max(120).optional(),
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(8).max(200),
  })
  .strict();

export type RegisterDto = z.infer<typeof RegisterDtoSchema>;
