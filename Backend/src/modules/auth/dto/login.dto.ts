import { z } from "zod";

export const LoginDtoSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(1).max(200),
    // Present on the second submit when the account has TOTP enabled (or a recovery code).
    mfaCode: z.string().trim().max(20).optional(),
  })
  .strict();

export type LoginDto = z.infer<typeof LoginDtoSchema>;
