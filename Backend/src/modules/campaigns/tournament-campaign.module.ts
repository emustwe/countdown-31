import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "../../common/prisma/prisma.module";
import { TournamentCampaignService } from "./tournament-campaign.service";
import { PublicCampaignController, AdminCampaignController } from "./tournament-campaign.controller";

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  controllers: [PublicCampaignController, AdminCampaignController],
  providers: [TournamentCampaignService],
  exports: [TournamentCampaignService],
})
export class TournamentCampaignModule {}
