import { Body, Controller, Get, Param, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/token.types";
import { TournamentCampaignService, CAMPAIGN_UPLOAD_MAX_BYTES, type UploadedCampaignFile } from "./tournament-campaign.service";

// Public (no guard): the play screen reads the active campaign + posts telemetry.
@Controller("promo-tournaments")
export class PublicCampaignController {
  constructor(private readonly campaigns: TournamentCampaignService) {}

  @Get(":id/campaign/active")
  active(@Param("id") id: string) {
    return this.campaigns.getActive(id);
  }

  @Post(":id/campaign/events")
  events(@Param("id") id: string, @Body() body: any) {
    return this.campaigns.recordEvents(id, body);
  }
}

// Admin: the Campaign Studio (create/edit/review/publish/report + demo setup).
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin/promo-tournaments")
export class AdminCampaignController {
  constructor(private readonly campaigns: TournamentCampaignService) {}

  @Get(":id/campaign")
  get(@Param("id") id: string) {
    return this.campaigns.getAdminView(id);
  }

  @Patch(":id/campaign/draft")
  saveDraft(@Param("id") id: string, @Body() body: any) {
    return this.campaigns.saveDraft(id, body);
  }

  @Get(":id/campaign/assets")
  assets(@Param("id") id: string) {
    return this.campaigns.listAssets(id);
  }

  @Post(":id/campaign/assets/:kind")
  // Cap the upload at the interceptor so an oversized file is rejected BEFORE being buffered fully
  // into memory (the service still enforces the same limit). Same threshold → success path unchanged.
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: CAMPAIGN_UPLOAD_MAX_BYTES } }))
  uploadAsset(
    @Param("id") id: string,
    @Param("kind") kind: string,
    @UploadedFile() file: UploadedCampaignFile,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.campaigns.uploadAsset(id, kind, file, user.sub);
  }

  @Post(":id/campaign/submit-review")
  submitReview(@Param("id") id: string) {
    return this.campaigns.submitReview(id);
  }

  @Post(":id/campaign/versions/:vid/reviews")
  addReview(
    @Param("id") id: string,
    @Param("vid") vid: string,
    @Body() body: any,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.campaigns.addReview(id, vid, body, user.sub);
  }

  @Post(":id/campaign/publish")
  publish(@Param("id") id: string, @Body() body: any) {
    return this.campaigns.publish(id, body);
  }

  @Post(":id/campaign/versions/:vid/rollback")
  rollback(@Param("id") id: string, @Param("vid") vid: string) {
    return this.campaigns.rollback(id, vid);
  }

  @Post(":id/campaign/pause")
  pause(@Param("id") id: string) {
    return this.campaigns.setPaused(id, true);
  }

  @Post(":id/campaign/resume")
  resume(@Param("id") id: string) {
    return this.campaigns.setPaused(id, false);
  }

  @Post(":id/campaign/cause/pause")
  causePause(@Param("id") id: string) {
    return this.campaigns.setCausePaused(id, true);
  }

  @Post(":id/campaign/cause/resume")
  causeResume(@Param("id") id: string) {
    return this.campaigns.setCausePaused(id, false);
  }

  @Get(":id/campaign/report")
  report(@Param("id") id: string) {
    return this.campaigns.getReport(id);
  }

  @Get(":id/campaign/report/export")
  reportExport(@Param("id") id: string) {
    return this.campaigns.exportReport(id);
  }

  @Post("demo/setup")
  demoSetup() {
    return this.campaigns.demoSetup();
  }
}
