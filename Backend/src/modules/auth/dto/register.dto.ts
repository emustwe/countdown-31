import { z } from "zod";

export const RegisterDtoSchema = z
  .object({
    // Optional at the API layer for backward-compatibility; the signup form requires it.
    fullName: z.string().trim().min(1).max(120).optional(),
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(10).max(200),
    // ISO 3166-1 alpha-2, upper-cased. Optional so older clients keep working; the signup form
    // requires it. Only the shape is validated here — the client picks from a fixed list.
    country: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, "Country must be a 2-letter ISO code")
      .optional(),
  })
  .strict();

export type RegisterDto = z.infer<typeof RegisterDtoSchema>;
