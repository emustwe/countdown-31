import type { Role } from "@prisma/client";

export interface AccessTokenPayload {
  sub: string;
  role: Role;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
