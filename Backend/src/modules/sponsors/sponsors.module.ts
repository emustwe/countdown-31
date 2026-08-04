import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "../../common/prisma/prisma.module";
import { SponsorsService } from "./sponsors.service";
import { SponsorAuthGuard } from "./sponsor-auth.guard";
import {
  AdminSponsorsController,
  AdminPromoController,
  AdminInquiriesController,
  SponsorController,
  PublicPromoController,
  PublicSponsorshipController,
  CosmeticsController,
} from "./sponsors.controller";

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  controllers: [
    AdminSponsorsController,
    AdminPromoController,
    AdminInquiriesController,
    SponsorController,
    PublicPromoController,
    PublicSponsorshipController,
    CosmeticsController,
  ],
  providers: [SponsorsService, SponsorAuthGuard],
  exports: [SponsorsService],
})
export class SponsorsModule {}
