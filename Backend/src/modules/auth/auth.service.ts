import { randomUUID, createHash } from "node:crypto";
import {
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
import type { RegisterDto } from "./dto/register.dto";
import type { LoginDto } from "./dto/login.dto";
import type { AccessTokenPayload, RefreshTokenPayload, TokenPair } from "./token.types";

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly wallet: WalletService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: PublicUser } & TokenPair> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException("An account with this email already exists");
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email: dto.email, fullName: dto.fullName, passwordHash },
      });
      await this.wallet.createWalletForNewUser(tx, created.id);
      return created;
    });

    const tokens = await this.issueTokenPair(user.id, user.role);
    return { user: toPublicUser(user), ...tokens };
  }

  async login(dto: LoginDto): Promise<{ user: PublicUser } & TokenPair> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException("Invalid email or password");
    }
    if (user.status === "BANNED") {
      throw new ForbiddenException("This account has been banned");
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const tokens = await this.issueTokenPair(user.id, user.role);
    return { user: toPublicUser(user), ...tokens };
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

    return this.issueTokenPair(user.id, user.role);
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
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
        ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
      },
    });
    return toPublicUser(user);
  }

  private async issueTokenPair(userId: string, role: PublicUser["role"]): Promise<TokenPair> {
    const accessPayload: AccessTokenPayload = { sub: userId, role };
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
}

function toPublicUser(user: {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: "PLAYER" | "ADMIN";
  status: "ACTIVE" | "BANNED";
  createdAt: Date;
}): PublicUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
  };
}
