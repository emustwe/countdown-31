import { z } from "zod";

export const LoginDtoSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(1).max(200),
  })
  .strict();

export type LoginDto = z.infer<typeof LoginDtoSchema>;
