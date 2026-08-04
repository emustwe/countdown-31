import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { GameService } from "./game.service";
import { SpinDtoSchema, type SpinDto } from "./dto/spin.dto";
import { PracticeSpinDtoSchema, type PracticeSpinDto } from "./dto/practice-spin.dto";
import { FreeSpinDtoSchema, type FreeSpinDto } from "./dto/free-spin.dto";
import { PaginationDtoSchema, type PaginationDto } from "../../common/dto/pagination.dto";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/token.types";

@ApiTags("game")
@Controller("game")
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get("config")
  getConfig() {
    return this.gameService.getPublicConfig();
  }

  @Get("theme")
  getTheme() {
    return this.gameService.getThemeFamily();
  }

  @Post("spin")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 300, ttl: 60_000 } })
  spin(@CurrentUser() user: AccessTokenPayload, @Body(new ZodValidationPipe(SpinDtoSchema)) dto: SpinDto) {
    return this.gameService.spin(user.sub, dto.totalBet, dto.idempotencyKey);
  }

  @Post("practice/spin")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 300, ttl: 60_000 } })
  practiceSpin(@CurrentUser() user: AccessTokenPayload, @Body(new ZodValidationPipe(PracticeSpinDtoSchema)) dto: PracticeSpinDto) {
    return this.gameService.practiceSpin(user.sub, dto.totalBet, dto.balance);
  }

  @Post("free-spin")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  freeSpin(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(FreeSpinDtoSchema)) dto: FreeSpinDto,
  ) {
    return this.gameService.playNextFreeSpin(user.sub, dto.roundId);
  }

  @Get("rounds")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listRounds(
    @CurrentUser() user: AccessTokenPayload,
    @Query(new ZodValidationPipe(PaginationDtoSchema)) query: PaginationDto,
  ) {
    return this.gameService.listRounds(user.sub, query.cursor, query.limit);
  }

  @Get("rounds/:id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getRound(@CurrentUser() user: AccessTokenPayload, @Param("id") id: string) {
    return this.gameService.getRound(user.sub, id);
  }
}
