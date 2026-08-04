import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { SponsorsService } from "./sponsors.service";

/** Guards sponsor-only endpoints: requires a valid sponsor JWT (typ: "sponsor"). */
@Injectable()
export class SponsorAuthGuard implements CanActivate {
  constructor(private readonly sponsors: SponsorsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { sponsor?: { id: string } }>();
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException();
    try {
      const payload = await this.sponsors.verifyToken(token);
      req.sponsor = { id: payload.sub };
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
