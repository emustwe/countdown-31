import { z } from "zod";

export const RegisterDtoSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(8).max(200),
  })
  .strict();

export type RegisterDto = z.infer<typeof RegisterDtoSchema>;
