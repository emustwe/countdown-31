import type { Role } from "@prisma/client";

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  /** Token-version stamp. The JWT strategy rejects the token if it doesn't match the user's current
   * tokenVersion (bumped on logout-all / password reset / ban) so revocation is immediate. */
  ver?: number;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
