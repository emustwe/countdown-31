import { z } from "zod";

export const ForgotPasswordDtoSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
  })
  .strict();

export type ForgotPasswordDto = z.infer<typeof ForgotPasswordDtoSchema>;

export const ResetPasswordDtoSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    otp: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
    newPassword: z.string().min(8).max(200),
  })
  .strict();

export type ResetPasswordDto = z.infer<typeof ResetPasswordDtoSchema>;
