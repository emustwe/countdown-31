import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/token.types";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import {
  SponsorsService,
  type AdminCreatePromoInput,
  type SponsorCreatePromoInput,
  type UpdatePromoInput,
  type InquiryInput,
} from "./sponsors.service";
import { SponsorAuthGuard } from "./sponsor-auth.guard";
import {
  PromoCreateSchema,
  PromoUpdateSchema,
  SponsorCreateSchema,
  SponsorUpdateSchema,
  SponsorLoginSchema,
  ClaimSchema,
  InquiryCreateSchema,
  InquiryStatusSchema,
  AssignSponsorSchema,
  JoinSchema,
  VoteTimeSchema,
  ScheduleSchema,
  CosmeticsSchema,
} from "./dto/write.dto";

// Admin-only sponsor management.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin/sponsors")
export class AdminSponsorsController {
  constructor(private readonly sponsors: SponsorsService) {}

  @Post()
  create(@Body(new ZodValidationPipe(SponsorCreateSchema)) body: { name?: string; username?: string; password?: string }) {
    return this.sponsors.createSponsor(body?.name ?? "", body?.username, body?.password);
  }
  @Get()
  list() {
    return this.sponsors.listSponsors();
  }
  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(SponsorUpdateSchema)) body: { name?: string; username?: string; password?: string; status?: string },
  ) {
    return this.sponsors.updateSponsor(id, body ?? {});
  }
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.sponsors.deleteSponsor(id);
  }
}

// Admin-only promo/tournament management (public + private).
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
  create(@Body(new ZodValidationPipe(PromoCreateSchema)) body: AdminCreatePromoInput) {
    return this.sponsors.createByAdmin(body ?? {});
  }
  @Patch(":id")
  update(@Param("id") id: string, @Body(new ZodValidationPipe(PromoUpdateSchema)) body: UpdatePromoInput) {
    return this.sponsors.updateTournament(id, body ?? {});
  }
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.sponsors.deleteTournament(id);
  }
  @Post(":id/approve")
  approve(@Param("id") id: string) {
    return this.sponsors.setStatus(id, "APPROVED");
  }
  @Post(":id/reject")
  reject(@Param("id") id: string) {
    return this.sponsors.setStatus(id, "REJECTED");
  }
  // Admin confirms the prize was paid → finished tournament drops off the public tournaments screen.
  @Post(":id/prize-delivered")
  prizeDelivered(@Param("id") id: string) {
    return this.sponsors.markPrizeDelivered(id);
  }
  // GROUP tournaments: the group listing (each group + members + schedule).
  @Get(":id/groups")
  groups(@Param("id") id: string) {
    return this.sponsors.getGroups(id);
  }
  // Draw the groups automatically from the entrants (run after entry closes).
  @Post(":id/assign-groups")
  assignGroups(@Param("id") id: string) {
    return this.sponsors.assignGroups(id);
  }
  // Manually assign each stage group to a day.
  @Post(":id/schedule")
  schedule(@Param("id") id: string, @Body(new ZodValidationPipe(ScheduleSchema)) body: { schedule?: { groupId: string; day: number }[] }) {
    return this.sponsors.scheduleGroups(id, body?.schedule ?? []);
  }
}

// Admin-only inquiry (contact request) management.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin/inquiries")
export class AdminInquiriesController {
  constructor(private readonly sponsors: SponsorsService) {}

  @Get()
  list() {
    return this.sponsors.listInquiries();
  }
  @Patch(":id")
  setStatus(@Param("id") id: string, @Body(new ZodValidationPipe(InquiryStatusSchema)) body: { status?: string }) {
    return this.sponsors.setInquiryStatus(id, body?.status ?? "");
  }
  // Resolve a specific-tournament sponsorship request: create/assign a sponsor and attach the
  // tournament to them (auto-appears in that sponsor's dashboard).
  @Post(":id/assign-sponsor")
  assignSponsor(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(AssignSponsorSchema)) body: { name?: string; username?: string; password?: string; sponsorId?: string },
  ) {
    return this.sponsors.assignSponsorToInquiry(id, body ?? {});
  }
}

// Sponsor-facing: login (public) + their own dashboard (sponsor JWT).
@Controller("sponsor")
export class SponsorController {
  constructor(private readonly sponsors: SponsorsService) {}

  // Per-IP throttle on the public credential endpoint (mirrors /auth/login = 30/min); the existing
  // per-username account lockout is unchanged. Legit logins are far under this rate.
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post("login")
  login(@Body(new ZodValidationPipe(SponsorLoginSchema)) body: { username?: string; password?: string }) {
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
  createTournament(@Req() req: Request & { sponsor: { id: string } }, @Body(new ZodValidationPipe(PromoCreateSchema)) body: SponsorCreatePromoInput) {
    return this.sponsors.createBySponsor(req.sponsor.id, body ?? {});
  }
  @UseGuards(SponsorAuthGuard)
  @Post("claim")
  claim(@Req() req: Request & { sponsor: { id: string } }, @Body(new ZodValidationPipe(ClaimSchema)) body: { sponsorCode?: string }) {
    return this.sponsors.claimByCode(req.sponsor.id, body?.sponsorCode ?? "");
  }
  @UseGuards(SponsorAuthGuard)
  @Get("inquiries")
  inquiries(@Req() req: Request & { sponsor: { id: string } }) {
    return this.sponsors.listInquiriesForSponsor(req.sponsor.id);
  }
}

// Public + user-facing promo tournaments.
@Controller("promo-tournaments")
export class PublicPromoController {
  constructor(private readonly sponsors: SponsorsService) {}

  @Get()
  list() {
    return this.sponsors.listApproved();
  }
  // The signed-in user's joined tournaments.
  @UseGuards(JwtAuthGuard)
  @Get("mine/joined")
  mine(@CurrentUser() user: AccessTokenPayload) {
    return this.sponsors.myJoined(user.sub);
  }
  @Get(":id")
  detail(
    @Param("id") id: string,
    @Query("code") code: string | undefined,
    @Query("userId") _u: string | undefined,
  ) {
    // Public detail; joined-state is resolved on the authed variant below.
    return this.sponsors.getForUser(id, code, undefined);
  }
  // Grand Starting Wheel data: the entrant roster + the SEALED (deterministic) draw result, so every
  // spectator's kickoff wheel lands on the identical outcome. Public — the ceremony must always load.
  @Get(":id/roster")
  roster(@Param("id") id: string) {
    return this.sponsors.getRoster(id);
  }
  @UseGuards(JwtAuthGuard)
  @Get(":id/me")
  detailForMe(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id") id: string,
    @Query("code") code: string | undefined,
  ) {
    return this.sponsors.getForUser(id, code, user.sub);
  }
  @UseGuards(JwtAuthGuard)
  @Post(":id/join")
  join(@CurrentUser() user: AccessTokenPayload, @Param("id") id: string, @Body(new ZodValidationPipe(JoinSchema)) body: { joinCode?: string; skills?: string[] }) {
    return this.sponsors.joinTournament(user.sub, id, { joinCode: body?.joinCode, skills: body?.skills });
  }
  @UseGuards(JwtAuthGuard)
  @Post(":id/vote-time")
  voteTime(@CurrentUser() user: AccessTokenPayload, @Param("id") id: string, @Body(new ZodValidationPipe(VoteTimeSchema)) body: { slot?: string }) {
    return this.sponsors.voteStartTime(user.sub, id, (body?.slot ?? "").trim());
  }
}

// Public sponsorship page: opportunities to sponsor + contact/inquiry submission (guests allowed).
@Controller()
export class PublicSponsorshipController {
  constructor(private readonly sponsors: SponsorsService) {}

  @Get("sponsorship-opportunities")
  opportunities() {
    return this.sponsors.listSponsorshipOpportunities();
  }
  // Anonymous write — throttle to curb contact-form spam. 10/min is far above any human use.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("inquiries")
  createInquiry(@Body(new ZodValidationPipe(InquiryCreateSchema)) body: InquiryInput) {
    return this.sponsors.createInquiry(body ?? {});
  }
}

// Signed-in user's shop cosmetics (card design, etc.).
@UseGuards(JwtAuthGuard)
@Controller("me/cosmetics")
export class CosmeticsController {
  constructor(private readonly sponsors: SponsorsService) {}

  @Get()
  get(@CurrentUser() user: AccessTokenPayload) {
    return this.sponsors.getCosmetics(user.sub);
  }
  @Patch()
  update(@CurrentUser() user: AccessTokenPayload, @Body(new ZodValidationPipe(CosmeticsSchema)) body: Record<string, unknown>) {
    return this.sponsors.updateCosmetics(user.sub, body ?? {});
  }
}
