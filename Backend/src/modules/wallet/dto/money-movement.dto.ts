import { z } from "zod";
import { SOLANA_ADDRESS_RE } from "../../../common/crypto/solana-address";

// Amounts are decimal strings of integer USDT base units (6 dp; 1_000_000 = 1 USDT), never
// JS numbers, to avoid float precision issues at the API boundary — parsed to bigint after
// validation.
const MAX_MOVEMENT_BASE_UNITS = 1_000_000_000_000n; // demo-only sanity cap, 1,000,000 USDT

const amountField = z
  .string()
  .regex(/^\d+$/, "amount must be a positive integer string (USDT base units)")
  .transform((val) => BigInt(val))
  .refine((val) => val > 0n, "amount must be greater than zero")
  .refine((val) => val <= MAX_MOVEMENT_BASE_UNITS, "amount exceeds the maximum allowed");

// Deposit: player sends USDT to the platform address; we just need the amount.
export const MoneyMovementDtoSchema = z
  .object({
    amount: amountField,
    idempotencyKey: z.string().min(1).max(200),
  })
  .strict();

export type MoneyMovementDto = z.infer<typeof MoneyMovementDtoSchema>;

// Withdrawal: player also supplies the external Solana address to send USDT to.
export const WithdrawDtoSchema = z
  .object({
    amount: amountField,
    destinationAddress: z.string().regex(SOLANA_ADDRESS_RE, "Enter a valid Solana (USDT) address"),
    destinationType: z.enum(["SOLANA"]).default("SOLANA"),
    idempotencyKey: z.string().min(1).max(200),
    // Step-up re-authentication: current password (required) + MFA code (if the account has 2FA).
    password: z.string().min(1).max(200),
    mfaCode: z.string().trim().max(20).optional(),
  })
  .strict();

export type WithdrawDto = z.infer<typeof WithdrawDtoSchema>;

// Live deposit verification: the address the player sent USDT FROM (their own wallet).
export const VerifyDepositDtoSchema = z
  .object({
    fromAddress: z.string().regex(SOLANA_ADDRESS_RE, "Enter a valid Solana address"),
  })
  .strict();

export type VerifyDepositDto = z.infer<typeof VerifyDepositDtoSchema>;
