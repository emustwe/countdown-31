import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { SponsorsService } from "./sponsors.service";
import { SponsorAuthGuard } from "./sponsor-auth.guard";

// Admin-only sponsor & promo-tournament management.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin/sponsors")
export class AdminSponsorsController {
  constructor(private readonly sponsors: SponsorsService) {}

  @Post()
  create(@Body() body: { name?: string }) {
    return this.sponsors.createSponsor(body?.name ?? "");
  }
  @Get()
  list() {
    return this.sponsors.listSponsors();
  }
  @Post(":id/regenerate")
  regenerate(@Param("id") id: string) {
    return this.sponsors.regeneratePassword(id);
  }
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.sponsors.deleteSponsor(id);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin/promo-tournaments")
export class AdminPromoController {
  constructor(private readonly sponsors: SponsorsService) {}

  @Get("overview")
  overview() {
    return this.sponsors.overview();
  }
  @Get()
  list() {
    return this.sponsors.listAll();
  }
  @Post()
  create(@Body() body: { title?: string; description?: string; sponsorId?: string }) {
    return this.sponsors.createByAdmin(body?.title ?? "", body?.description ?? "", body?.sponsorId ?? null);
  }
  @Post(":id/approve")
  approve(@Param("id") id: string) {
    return this.sponsors.setStatus(id, "APPROVED");
  }
  @Post(":id/reject")
  reject(@Param("id") id: string) {
    return this.sponsors.setStatus(id, "REJECTED");
  }
}

// Sponsor-facing: login (public) + their own tournaments (sponsor JWT).
@Controller("sponsor")
export class SponsorController {
  constructor(private readonly sponsors: SponsorsService) {}

  @Post("login")
  login(@Body() body: { username?: string; password?: string }) {
    return this.sponsors.login(body?.username ?? "", body?.password ?? "");
  }

  @UseGuards(SponsorAuthGuard)
  @Get("me")
  me(@Req() req: Request & { sponsor: { id: string } }) {
    return this.sponsors.me(req.sponsor.id);
  }
  @UseGuards(SponsorAuthGuard)
  @Get("tournaments")
  myTournaments(@Req() req: Request & { sponsor: { id: string } }) {
    return this.sponsors.listForSponsor(req.sponsor.id);
  }
  @UseGuards(SponsorAuthGuard)
  @Post("tournaments")
  createTournament(@Req() req: Request & { sponsor: { id: string } }, @Body() body: { title?: string; description?: string }) {
    return this.sponsors.createBySponsor(req.sponsor.id, body?.title ?? "", body?.description ?? "");
  }
}

// Public: approved promo tournaments for the user Tournaments page (guests included).
@Controller("promo-tournaments")
export class PublicPromoController {
  constructor(private readonly sponsors: SponsorsService) {}

  @Get()
  list() {
    return this.sponsors.listApproved();
  }
}
