import { z } from "zod";

const otp = z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code");
const mfaToken = z.string().trim().min(6).max(20); // TOTP (6 digits) or a recovery code

export const VerifyEmailDtoSchema = z.object({ otp }).strict();
export type VerifyEmailDto = z.infer<typeof VerifyEmailDtoSchema>;

export const MfaConfirmDtoSchema = z.object({ code: mfaToken }).strict();
export type MfaConfirmDto = z.infer<typeof MfaConfirmDtoSchema>;

export const MfaDisableDtoSchema = z.object({ code: mfaToken }).strict();
export type MfaDisableDto = z.infer<typeof MfaDisableDtoSchema>;
