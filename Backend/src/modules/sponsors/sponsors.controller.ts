import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Request } from "express";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
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
  CosmeticsSchema,
  TournamentCampaignManifestSchema,
  type TournamentCampaignManifestInput,
} from "./dto/write.dto";
import { acceptsCampaignFile, detectCampaignFile, type CampaignAssetKind } from "./campaign-assets";

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
  @Get(":id/campaign")
  campaign(@Param("id") id: string) {
    return this.sponsors.getCampaignForAdmin(id);
  }
  @Patch(":id/campaign/draft")
  saveCampaignDraft(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(TournamentCampaignManifestSchema)) body: TournamentCampaignManifestInput,
  ) {
    return this.sponsors.saveCampaignDraft(id, body, user.sub);
  }
  @Post(":id/campaign/publish")
  publishCampaign(@CurrentUser() user: AccessTokenPayload, @Param("id") id: string) {
    return this.sponsors.publishCampaign(id, user.sub);
  }
  @Post(":id/campaign/pause")
  pauseCampaign(@Param("id") id: string) {
    return this.sponsors.setCampaignPaused(id, true);
  }
  @Post(":id/campaign/resume")
  resumeCampaign(@Param("id") id: string) {
    return this.sponsors.setCampaignPaused(id, false);
  }
  @Post(":id/campaign/cause/pause")
  pauseCampaignCause(@Param("id") id: string) {
    return this.sponsors.setCampaignCausePaused(id, true);
  }
  @Post(":id/campaign/cause/resume")
  resumeCampaignCause(@Param("id") id: string) {
    return this.sponsors.setCampaignCausePaused(id, false);
  }
  @Get(":id/campaign/assets")
  campaignAssets(@Param("id") id: string) {
    return this.sponsors.listCampaignAssets(id);
  }
  @Post(":id/campaign/assets/:kind")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 12 * 1024 * 1024 } }))
  async uploadCampaignAsset(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id") id: string,
    @Param("kind") rawKind: string,
    @UploadedFile() file: { originalname: string; size: number; buffer: Buffer } | undefined,
  ) {
    if (!file) throw new BadRequestException("Choose a file to upload");
    const kind = rawKind.toUpperCase() as CampaignAssetKind;
    if (!["LOGO", "BACKGROUND_DESKTOP", "BACKGROUND_MOBILE"].includes(kind)) throw new BadRequestException("Unknown campaign asset type");
    const detected = detectCampaignFile(file.buffer);
    if (!detected || !acceptsCampaignFile(kind, detected)) {
      throw new BadRequestException(kind === "LOGO" ? "Use a PNG, JPG, WebP, GIF, MP4, or WebM logo" : "Use a JPG, PNG, or WebP background image");
    }
    await this.sponsors.getCampaignForAdmin(id);
    const directory = resolve(process.cwd(), "uploads", "tournament-campaigns", id);
    await mkdir(directory, { recursive: true });
    const fileName = `${randomUUID()}${detected.extension}`;
    const storagePath = resolve(directory, fileName);
    await writeFile(storagePath, file.buffer);
    // Keep stored URLs host-independent so LAN, localhost, and Tailscale clients resolve the same
    // asset against whichever API origin they are currently using.
    const url = `/uploads/tournament-campaigns/${id}/${fileName}`;
    return this.sponsors.recordCampaignAsset(id, {
      kind,
      url,
      storagePath,
      originalName: file.originalname.slice(0, 180),
      mimeType: detected.mimeType,
      bytes: file.size,
      createdBy: user.sub,
      mediaType: detected.mediaType,
    });
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
  @Get(":id/campaign/active")
  activeCampaign(@Param("id") id: string) {
    return this.sponsors.getActiveCampaign(id);
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
  join(@CurrentUser() user: AccessTokenPayload, @Param("id") id: string, @Body(new ZodValidationPipe(JoinSchema)) body: { joinCode?: string; teamCode?: string }) {
    return this.sponsors.joinTournament(user.sub, id, { joinCode: body?.joinCode, teamCode: body?.teamCode });
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
