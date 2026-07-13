import { Controller, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { GameService } from "../game/game.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

// Only the replay endpoint lives here for now (needed to make M5's spin pipeline
// verifiable end to end). Users/models/transactions/analytics/audit-log are added in M8.
@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin")
export class AdminController {
  constructor(private readonly gameService: GameService) {}

  @Post("spins/:id/replay")
  replaySpin(@Param("id") id: string) {
    return this.gameService.replaySpin(id);
  }
}
