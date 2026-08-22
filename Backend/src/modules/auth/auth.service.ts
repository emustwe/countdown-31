import { randomUUID, createHash, randomInt } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { PrismaService } from "../../common/prisma/prisma.service";
import { WalletService } from "../wallet/wallet.service";
import { MailService } from "../../common/mail/mail.service";
import { AuditService } from "../../common/audit/audit.service";
import { AuthThrottleService } from "../../common/auth-throttle/auth-throttle.service";
import { passwordPolicyError, isBreachedPassword } from "../../common/crypto/password-policy";
import { encryptSecret, decryptSecret } from "../../common/crypto/secret-box";
import { generateTotpSecret, verifyTotp, totpAuthUri } from "../../common/crypto/totp";
import { normalizeAvatarUrl } from "../../common/crypto/safe-url";
import { AccountSecurityService } from "../../common/account-security/account-security.service";
import type { RegisterDto } from "./dto/register.dto";
import type { LoginDto } from "./dto/login.dto";
import type { AccessTokenPayload, RefreshTokenPayload, TokenPair } from "./token.types";

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const OTP_TTL_MS = 10 * 60 * 1000; // reset code valid for 10 minutes
const EMAIL_OTP_TTL_MS = 15 * 60 * 1000; // email-verification code valid for 15 minutes
const OTP_MAX_ATTEMPTS = 5; // wrong-code attempts before the code is burned
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // at most one code per account per minute

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Cryptographically-random 6-digit numeric OTP (no modulo bias). */
function sixDigitOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** Enforce the password policy (offline rules + optional online breach check). */
async function assertPasswordStrong(password: string): Promise<void> {
  const err = passwordPolicyError(password);
  if (err) throw new BadRequestException(err);
  if (await isBreachedPassword(password)) {
    throw new BadRequestException("This password has appeared in a known data breach — choose a different one");
  }
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly wallet: WalletService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
    private readonly throttle: AuthThrottleService,
    private readonly accountSecurity: AccountSecurityService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: PublicUser } & TokenPair> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException("An account with this email already exists");
    }
    await assertPasswordStrong(dto.password);

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email, fullName: dto.fullName, passwordHash },
      });
      await this.wallet.createWalletForNewUser(tx, created.id);
      return created;
    });

    // Kick off email verification. Login still works, but money-moving actions are gated until the
    // address is confirmed (see assertEmailVerified). Best-effort — never blocks sign-up.
    await this.issueEmailVerification(user.id, user.email).catch(() => undefined);

    const tokens = await this.issueTokenPair(user.id, user.role, user.tokenVersion);
    return { user: toPublicUser(user), ...tokens };
  }

  async login(dto: LoginDto): Promise<{ user: PublicUser } & TokenPair> {
    const key = dto.email.trim().toLowerCase();
    // Per-account backoff (DB-backed, global) on top of the IP rate limit: after too many failures
    // the account is briefly locked, which blunts credential-stuffing even from rotating IPs.
    await this.throttle.assertNotLocked("user", key);

    const user = await this.prisma.user.findUnique({ where: { email: key } });
    // System accounts (treasury) hold balances but are never real logins — treat like "no user"
    // (same generic error, so their existence isn't confirmable).
    if (!user || user.isSystem) {
      await this.throttle.recordFailure("user", key);
      this.audit.record("LOGIN_FAILURE", { actor: key, detail: { reason: "no_user" } });
      throw new UnauthorizedException("Invalid email or password");
    }
    if (user.status === "BANNED") {
      this.audit.record("LOGIN_BLOCKED_BANNED", { actor: user.id });
      throw new ForbiddenException("This account has been banned");
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      await this.throttle.recordFailure("user", key);
      this.audit.record("LOGIN_FAILURE", { actor: user.id, detail: { reason: "bad_password" } });
      throw new UnauthorizedException("Invalid email or password");
    }

    // Second factor, if enrolled: require a valid TOTP (or one-time recovery code) before issuing
    // tokens. A missing code returns a specific 401 the client uses to prompt for it.
    if (user.mfaEnabled) {
      const ok = await this.checkSecondFactor(user, dto.mfaCode);
      if (!ok) {
        await this.throttle.recordFailure("user", key);
        this.audit.record("LOGIN_MFA_FAILURE", { actor: user.id });
        throw new UnauthorizedException(dto.mfaCode ? "Invalid authentication code" : "MFA_REQUIRED");
      }
    }

    await this.throttle.recordSuccess("user", key);
    this.audit.record("LOGIN_SUCCESS", { actor: user.id });
    this.mail.sendSecurityNotice(user.email, "New sign-in", `A new sign-in to your account was detected at ${new Date().toISOString()}. If this wasn't you, reset your password immediately.`);
    const tokens = await this.issueTokenPair(user.id, user.role, user.tokenVersion);
    return { user: toPublicUser(user), ...tokens };
  }

  /** Verify a login second factor: a live TOTP code, or a one-time recovery code (which is burned). */
  private checkSecondFactor(user: { id: string; mfaSecret: string | null; mfaRecoveryCodes: unknown }, code: string | undefined): Promise<boolean> {
    return this.accountSecurity.checkSecondFactor(user, code);
  }

  async refresh(rawRefreshToken: string): Promise<TokenPair> {
    const payload = await this.verifyRefreshJwt(rawRefreshToken);

    const stored = await this.prisma.refreshToken.findUnique({ where: { id: payload.jti } });

    if (!stored || stored.tokenHash !== hashToken(rawRefreshToken)) {
      // No matching record for a token whose signature we trust — either the DB was reset
      // or something is wrong. Treat conservatively as a potential reuse/attack.
      await this.revokeAllForUser(payload.sub);
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (stored.revokedAt) {
      // This exact token was already rotated out once before. Someone is replaying an old
      // token — revoke the entire family so the legitimate holder is forced to log in again.
      await this.revokeAllForUser(payload.sub);
      throw new UnauthorizedException("Refresh token reuse detected — session revoked");
    }

    if (stored.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException("Refresh token expired");
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status === "BANNED") {
      throw new UnauthorizedException("Account is no longer active");
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokenPair(user.id, user.role, user.tokenVersion);
  }

  async logout(rawRefreshToken: string): Promise<void> {
    try {
      const payload = await this.verifyRefreshJwt(rawRefreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { id: payload.jti, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch {
      // Logging out with an already-invalid/expired token is a no-op, not an error.
    }
  }

  async getProfile(userId: string): Promise<PublicUser & { balance: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException("User not found");
    }
    const { balance } = await this.wallet.getWallet(userId);
    return { ...toPublicUser(user), balance };
  }

  /** Updates the caller's own profile (display name and/or avatar image). */
  async updateProfile(userId: string, data: { fullName?: string; avatarUrl?: string | null }): Promise<PublicUser> {
    let avatarUrl: string | null | undefined = undefined;
    if (data.avatarUrl !== undefined) {
      try {
        avatarUrl = normalizeAvatarUrl(data.avatarUrl);
      } catch (err) {
        throw new BadRequestException((err as Error).message);
      }
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      },
    });
    return toPublicUser(user);
  }

  // ---- Email verification (#9) ----------------------------------------------------------------

  /** Issue (or re-issue, respecting the resend cooldown) an email-verification OTP. */
  async issueEmailVerification(userId: string, email: string): Promise<{ ok: true; devOtp?: string }> {
    const recent = await this.prisma.emailVerification.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
    if (recent && !recent.consumedAt && Date.now() - recent.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
      return { ok: true };
    }
    await this.prisma.emailVerification.updateMany({ where: { userId, consumedAt: null }, data: { consumedAt: new Date() } });
    const otp = sixDigitOtp();
    const otpHash = await argon2.hash(otp);
    await this.prisma.emailVerification.create({ data: { userId, otpHash, expiresAt: new Date(Date.now() + EMAIL_OTP_TTL_MS) } });
    await this.mail.sendEmailVerificationOtp(email, otp);
    return process.env.NODE_ENV !== "production" ? { ok: true, devOtp: otp } : { ok: true };
  }

  /** Called from the authenticated "resend" endpoint. */
  async resendEmailVerification(userId: string): Promise<{ ok: true; devOtp?: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException("User not found");
    if (user.emailVerifiedAt) return { ok: true };
    return this.issueEmailVerification(user.id, user.email);
  }

  async verifyEmail(userId: string, otp: string): Promise<{ ok: true }> {
    const code = (otp || "").trim();
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException("User not found");
    if (user.emailVerifiedAt) return { ok: true };
    const rec = await this.prisma.emailVerification.findFirst({
      where: { userId, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!rec) throw new BadRequestException("Invalid or expired verification code");
    if (rec.attempts >= OTP_MAX_ATTEMPTS) {
      await this.prisma.emailVerification.update({ where: { id: rec.id }, data: { consumedAt: new Date() } });
      throw new BadRequestException("Too many attempts — request a new code");
    }
    if (!(await argon2.verify(rec.otpHash, code))) {
      await this.prisma.emailVerification.update({ where: { id: rec.id }, data: { attempts: { increment: 1 } } });
      throw new BadRequestException("Invalid or expired verification code");
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
      await tx.emailVerification.update({ where: { id: rec.id }, data: { consumedAt: new Date() } });
    });
    this.audit.record("EMAIL_VERIFIED", { actor: userId });
    return { ok: true };
  }

  // ---- TOTP two-factor (#8) -------------------------------------------------------------------

  /** Begin enrollment: generate a secret and return the otpauth URI for a QR code. Not active until
   * confirmed with a valid code via confirmMfa. */
  async beginMfaEnrollment(userId: string): Promise<{ secret: string; otpauthUri: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException("User not found");
    if (user.mfaEnabled) throw new ConflictException("Two-factor authentication is already enabled");
    const secret = generateTotpSecret();
    await this.prisma.user.update({ where: { id: userId }, data: { mfaSecret: encryptSecret(secret) } });
    return { secret, otpauthUri: totpAuthUri(secret, user.email) };
  }

  /** Confirm enrollment with a live code; returns one-time recovery codes (shown once). */
  async confirmMfa(userId: string, code: string): Promise<{ recoveryCodes: string[] }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.mfaSecret) throw new BadRequestException("Start MFA setup first");
    const secret = decryptSecret(user.mfaSecret);
    if (!secret || !verifyTotp(secret, code)) throw new BadRequestException("Invalid authentication code");
    const recoveryCodes = Array.from({ length: 8 }, () => randomUUID().replace(/-/g, "").slice(0, 10));
    const hashes = await Promise.all(recoveryCodes.map((c) => argon2.hash(c)));
    await this.prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true, mfaRecoveryCodes: hashes } });
    this.audit.record("MFA_ENABLED", { actor: userId });
    return { recoveryCodes };
  }

  /** Disable MFA — requires a valid current code (or recovery code) as step-up. */
  async disableMfa(userId: string, code: string): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.mfaEnabled) return { ok: true };
    if (!(await this.checkSecondFactor(user, code))) throw new UnauthorizedException("Invalid authentication code");
    await this.prisma.user.update({ where: { id: userId }, data: { mfaEnabled: false, mfaSecret: null, mfaRecoveryCodes: [] } });
    this.audit.record("MFA_DISABLED", { actor: userId });
    return { ok: true };
  }

  /** Full logout: revoke every refresh token AND bump tokenVersion so all access tokens die now. */
  async logoutAll(userId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } });
      await tx.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    });
  }

  private async issueTokenPair(userId: string, role: PublicUser["role"], tokenVersion: number): Promise<TokenPair> {
    const accessPayload: AccessTokenPayload = { sub: userId, role, ver: tokenVersion };
    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
      expiresIn: ACCESS_TOKEN_TTL,
    });

    const jti = randomUUID();
    const refreshPayload: RefreshTokenPayload = { sub: userId, jti };
    const refreshToken = await this.jwt.signAsync(refreshPayload, {
      secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
      expiresIn: REFRESH_TOKEN_TTL_SECONDS,
    });

    await this.prisma.refreshToken.create({
      data: {
        id: jti,
        userId,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  private async verifyRefreshJwt(rawRefreshToken: string): Promise<RefreshTokenPayload> {
    try {
      return await this.jwt.verifyAsync<RefreshTokenPayload>(rawRefreshToken, {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
      });
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }
  }

  /** Step 1 of password recovery: email a one-time code. Always returns the same generic result
   * whether or not the email exists, so it can't be used to probe which emails are registered.
   *
   * SECURITY: the code is NEVER returned in the API response in production — that would be an
   * account-takeover faucet. In non-production it may be echoed back as `devOtp` purely for local
   * testing; either way it's delivered by email (or the dev server log) as the real channel. */
  async requestPasswordReset(email: string): Promise<{ ok: true; emailSent: boolean; devOtp?: string }> {
    const clean = (email || "").trim().toLowerCase();
    const user = clean ? await this.prisma.user.findUnique({ where: { email: clean } }) : null;
    // Never issue a reset for a banned or system (treasury) account.
    if (!user || user.status === "BANNED" || user.isSystem) return { ok: true, emailSent: this.mail.live };

    // Per-account resend cooldown: don't let an attacker churn fresh codes (each new code gives 5
    // more guesses). If a code was issued very recently, no-op with the same generic response.
    const recent = await this.prisma.passwordReset.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    if (recent && Date.now() - recent.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
      return { ok: true, emailSent: this.mail.live };
    }

    // One active code at a time: burn any previous unconsumed codes for this user.
    await this.prisma.passwordReset.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    const otp = sixDigitOtp();
    const otpHash = await argon2.hash(otp);
    await this.prisma.passwordReset.create({
      data: { userId: user.id, otpHash, expiresAt: new Date(Date.now() + OTP_TTL_MS) },
    });
    await this.mail.sendPasswordResetOtp(user.email, otp);
    const devEcho = process.env.NODE_ENV !== "production" ? { devOtp: otp } : {};
    return { ok: true, emailSent: this.mail.live, ...devEcho };
  }

  /** Step 2: verify the code and set a new password. Consumes the code, and logs the user out of
   * all sessions (refresh tokens revoked) so a leaked old session can't survive a reset. */
  async resetPassword(email: string, otp: string, newPassword: string): Promise<{ ok: true }> {
    const clean = (email || "").trim().toLowerCase();
    const code = (otp || "").trim();
    if (!clean || !code) throw new UnauthorizedException("Invalid or expired reset code");
    await assertPasswordStrong(newPassword);

    const user = await this.prisma.user.findUnique({ where: { email: clean } });
    if (!user || user.isSystem) throw new UnauthorizedException("Invalid or expired reset code");

    const reset = await this.prisma.passwordReset.findFirst({
      where: { userId: user.id, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!reset) throw new UnauthorizedException("Invalid or expired reset code");
    if (reset.attempts >= OTP_MAX_ATTEMPTS) {
      await this.prisma.passwordReset.update({ where: { id: reset.id }, data: { consumedAt: new Date() } });
      throw new UnauthorizedException("Too many attempts — request a new reset code");
    }

    const valid = await argon2.verify(reset.otpHash, code);
    if (!valid) {
      await this.prisma.passwordReset.update({ where: { id: reset.id }, data: { attempts: { increment: 1 } } });
      throw new UnauthorizedException("Invalid or expired reset code");
    }

    const passwordHash = await argon2.hash(newPassword);
    await this.prisma.$transaction(async (tx) => {
      // Bumping tokenVersion instantly invalidates every outstanding access token; revoking the
      // refresh tokens ends every long-lived session. A leaked session can't survive a reset.
      await tx.user.update({ where: { id: user.id }, data: { passwordHash, tokenVersion: { increment: 1 } } });
      await tx.passwordReset.update({ where: { id: reset.id }, data: { consumedAt: new Date() } });
      await tx.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
    });
    this.audit.record("PASSWORD_RESET_COMPLETE", { actor: user.id });
    this.mail.sendSecurityNotice(user.email, "Password changed", "Your password was just changed. If this wasn't you, contact support immediately.");
    return { ok: true };
  }

  private async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

export interface PublicUser {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: "PLAYER" | "ADMIN";
  status: "ACTIVE" | "BANNED";
  createdAt: Date;
  emailVerified: boolean;
  mfaEnabled: boolean;
}

function toPublicUser(user: {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: "PLAYER" | "ADMIN";
  status: "ACTIVE" | "BANNED";
  createdAt: Date;
  emailVerifiedAt?: Date | null;
  mfaEnabled?: boolean;
}): PublicUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    emailVerified: !!user.emailVerifiedAt,
    mfaEnabled: !!user.mfaEnabled,
  };
}
