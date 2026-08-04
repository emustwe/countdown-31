import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { TournamentsService } from "./tournaments.service";
import { GameService } from "../game/game.service";
import { CreateTournamentDtoSchema, type CreateTournamentDto } from "./dto/create-tournament.dto";
import { UpdateTournamentDtoSchema, type UpdateTournamentDto } from "./dto/update-tournament.dto";
import { AssignGroupsDtoSchema, type AssignGroupsDto } from "./dto/assign-groups.dto";
import { RescheduleRoundDtoSchema, type RescheduleRoundDto } from "./dto/reschedule-round.dto";
import { SpinDtoSchema, type SpinDto } from "../game/dto/spin.dto";
import { FreeSpinDtoSchema, type FreeSpinDto } from "../game/dto/free-spin.dto";
import { PaginationDtoSchema, type PaginationDto } from "../../common/dto/pagination.dto";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/token.types";

// Player-facing: browse open tournaments, join, play, and view leaderboards.
@ApiTags("tournaments")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("tournaments")
export class TournamentsController {
  constructor(
    private readonly tournaments: TournamentsService,
    private readonly game: GameService,
  ) {}

  @Get()
  listOpen() {
    return this.tournaments.listOpen();
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.tournaments.get(id);
  }

  @Get(":id/leaderboard")
  leaderboard(@Param("id") id: string) {
    return this.tournaments.leaderboard(id);
  }

  @Get("mine/history")
  myHistory(@CurrentUser() user: AccessTokenPayload) {
    return this.tournaments.myHistory(user.sub);
  }

  @Get(":id/me")
  myEntry(@CurrentUser() user: AccessTokenPayload, @Param("id") id: string) {
    return this.tournaments.myEntry(user.sub, id);
  }

  @Post(":id/join")
  join(@CurrentUser() user: AccessTokenPayload, @Param("id") id: string) {
    return this.tournaments.join(user.sub, id);
  }

  @Post(":id/rebuy")
  rebuy(@CurrentUser() user: AccessTokenPayload, @Param("id") id: string) {
    return this.tournaments.rebuy(user.sub, id);
  }

  // ---- bracket ----

  @Get(":id/bracket")
  bracket(@CurrentUser() user: AccessTokenPayload, @Param("id") id: string) {
    return this.tournaments.getBracket(user.sub, id);
  }

  @Post(":id/matches/:matchId/pick")
  pickSlot(@CurrentUser() user: AccessTokenPayload, @Param("id") id: string, @Param("matchId") matchId: string) {
    return this.tournaments.pickSlot(user.sub, id, matchId);
  }

  @Get("matches/:matchId/scoreboard")
  matchScoreboard(@CurrentUser() user: AccessTokenPayload, @Param("matchId") matchId: string) {
    return this.tournaments.matchScoreboard(user.sub, matchId, user.role === "ADMIN");
  }

  @Post("matches/:matchId/spin")
  @Throttle({ default: { limit: 300, ttl: 60_000 } })
  matchSpin(
    @CurrentUser() user: AccessTokenPayload,
    @Param("matchId") matchId: string,
    @Body(new ZodValidationPipe(SpinDtoSchema)) dto: SpinDto,
  ) {
    return this.game.spinInMatch(user.sub, matchId, dto.totalBet, dto.idempotencyKey);
  }

  @Post("matches/:matchId/free-spin")
  matchFreeSpin(
    @CurrentUser() user: AccessTokenPayload,
    @Param("matchId") _matchId: string,
    @Body(new ZodValidationPipe(FreeSpinDtoSchema)) dto: FreeSpinDto,
  ) {
    // The free-spin reveal is keyed only by roundId (ownership-checked); matchId is in the
    // path for routing symmetry with the other match endpoints.
    return this.game.playNextFreeSpin(user.sub, dto.roundId);
  }

  @Post(":id/spin")
  @Throttle({ default: { limit: 300, ttl: 60_000 } })
  spin(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(SpinDtoSchema)) dto: SpinDto,
  ) {
    return this.game.spinInTournament(user.sub, id, dto.totalBet, dto.idempotencyKey);
  }

  @Post(":id/free-spin")
  freeSpin(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id") _id: string,
    @Body(new ZodValidationPipe(FreeSpinDtoSchema)) dto: FreeSpinDto,
  ) {
    return this.game.playNextFreeSpin(user.sub, dto.roundId);
  }
}

// Admin-facing: create/manage tournaments from the dashboard.
@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin/tournaments")
export class TournamentsAdminController {
  constructor(private readonly tournaments: TournamentsService) {}

  @Post()
  create(
    @CurrentUser() admin: AccessTokenPayload,
    @Body(new ZodValidationPipe(CreateTournamentDtoSchema)) dto: CreateTournamentDto,
  ) {
    return this.tournaments.create(admin.sub, dto);
  }

  @Get()
  list(@Query(new ZodValidationPipe(PaginationDtoSchema)) query: PaginationDto) {
    return this.tournaments.listAdmin(query.cursor, query.limit);
  }

  @Patch(":id")
  update(
    @CurrentUser() admin: AccessTokenPayload,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateTournamentDtoSchema)) dto: UpdateTournamentDto,
  ) {
    return this.tournaments.update(admin.sub, id, dto);
  }

  @Post(":id/cancel")
  cancel(@CurrentUser() admin: AccessTokenPayload, @Param("id") id: string) {
    return this.tournaments.cancel(admin.sub, id);
  }

  @Post(":id/settle")
  settle(@CurrentUser() admin: AccessTokenPayload, @Param("id") id: string) {
    return this.tournaments.settle(admin.sub, id);
  }

  @Post(":id/rounds/:index/settle")
  settleRound(@CurrentUser() admin: AccessTokenPayload, @Param("id") id: string, @Param("index") index: string) {
    return this.tournaments.settleRound(admin.sub, id, Number(index));
  }

  // ---- group tournaments (WEEKLY / MONTHLY): admin grouping ----

  @Get(":id/rounds/:index/grouping")
  grouping(@Param("id") id: string, @Param("index") index: string) {
    return this.tournaments.getRoundGrouping(id, Number(index));
  }

  @Post(":id/rounds/:index/groups")
  assignGroups(
    @CurrentUser() admin: AccessTokenPayload,
    @Param("id") id: string,
    @Param("index") index: string,
    @Body(new ZodValidationPipe(AssignGroupsDtoSchema)) dto: AssignGroupsDto,
  ) {
    return this.tournaments.assignGroups(admin.sub, id, Number(index), dto.groups);
  }

  @Post(":id/rounds/:index/schedule")
  reschedule(
    @CurrentUser() admin: AccessTokenPayload,
    @Param("id") id: string,
    @Param("index") index: string,
    @Body(new ZodValidationPipe(RescheduleRoundDtoSchema)) dto: RescheduleRoundDto,
  ) {
    return this.tournaments.rescheduleRound(admin.sub, id, Number(index), dto.startAt);
  }

  // ---- re-buy-in approvals ----

  @Get(":id/rebuys")
  rebuyRequests(@Param("id") id: string) {
    return this.tournaments.listRebuyRequests(id);
  }

  @Post("rebuys/:requestId/approve")
  approveRebuy(@CurrentUser() admin: AccessTokenPayload, @Param("requestId") requestId: string) {
    return this.tournaments.decideRebuy(admin.sub, requestId, true);
  }

  @Post("rebuys/:requestId/reject")
  rejectRebuy(@CurrentUser() admin: AccessTokenPayload, @Param("requestId") requestId: string) {
    return this.tournaments.decideRebuy(admin.sub, requestId, false);
  }
}
