import { Inject, Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { AccessTokenPayload } from "../token.types";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(@Inject(ConfigService) config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("JWT_ACCESS_SECRET"),
    });
  }

  validate(payload: AccessTokenPayload): AccessTokenPayload {
    return payload;
  }
}
