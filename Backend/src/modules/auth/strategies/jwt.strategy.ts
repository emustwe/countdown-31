import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../../common/prisma/prisma.service";
import type { AccessTokenPayload } from "../token.types";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    @Inject(ConfigService) config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("JWT_ACCESS_SECRET"),
    });
  }

  /**
   * Beyond signature+expiry, confirm the token is still valid *right now*: the user must still
   * exist, be active, and carry the same tokenVersion the token was minted with. Bumping
   * tokenVersion (logout-all, password reset, ban) therefore invalidates every outstanding access
   * token immediately instead of waiting out the 15-minute TTL. Costs one indexed lookup per request.
   */
  async validate(payload: AccessTokenPayload): Promise<AccessTokenPayload> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { status: true, tokenVersion: true, isSystem: true },
    });
    if (!user || user.isSystem || user.status === "BANNED") {
      throw new UnauthorizedException("Session is no longer valid");
    }
    if (typeof payload.ver === "number" && payload.ver !== user.tokenVersion) {
      throw new UnauthorizedException("Session has been revoked — please sign in again");
    }
    return payload;
  }
}
