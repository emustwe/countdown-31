import { ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import * as argon2 from "argon2";
import { PrismaService } from "../prisma/prisma.service";
import { decryptSecret } from "../crypto/secret-box";
import { verifyTotp } from "../crypto/totp";

/**
 * Cross-cutting account security checks used by more than one module (auth + wallet), extracted here
 * so neither module has to depend on the other (which would be a circular import). Holds the second-
 * factor check, the money-action email gate, and step-up re-authentication.
 */
@Injectable()
export class AccountSecurityService {
  constructor(private readonly prisma: PrismaService) {}

  /** Verify a second factor: a live TOTP code, or a one-time recovery code (which is then burned). */
  async checkSecondFactor(
    user: { id: string; mfaSecret: string | null; mfaRecoveryCodes: unknown },
    code: string | undefined,
  ): Promise<boolean> {
    const clean = (code || "").trim();
    if (!clean || !user.mfaSecret) return false;
    const secret = decryptSecret(user.mfaSecret);
    if (secret && verifyTotp(secret, clean)) return true;
    const codes = Array.isArray(user.mfaRecoveryCodes) ? (user.mfaRecoveryCodes as string[]) : [];
    for (let i = 0; i < codes.length; i++) {
      const hash = codes[i];
      if (hash && (await argon2.verify(hash, clean).catch(() => false))) {
        const remaining = codes.filter((_, idx) => idx !== i);
        await this.prisma.user.update({ where: { id: user.id }, data: { mfaRecoveryCodes: remaining } });
        return true;
      }
    }
    return false;
  }

  /** Money-moving flows require a confirmed email. */
  async assertEmailVerified(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { emailVerifiedAt: true } });
    if (!user?.emailVerifiedAt) {
      throw new ForbiddenException("Verify your email address before moving funds");
    }
  }

  /** Step-up: re-check the caller's password (+ MFA code if enrolled). Throws on failure. */
  async assertReauthenticated(userId: string, password: string, mfaCode?: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException("User not found");
    const ok = await argon2.verify(user.passwordHash, password || "").catch(() => false);
    if (!ok) throw new UnauthorizedException("Password is incorrect");
    if (user.mfaEnabled && !(await this.checkSecondFactor(user, mfaCode))) {
      throw new UnauthorizedException(mfaCode ? "Invalid authentication code" : "MFA_REQUIRED");
    }
  }
}
