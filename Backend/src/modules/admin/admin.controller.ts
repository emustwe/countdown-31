import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AdminService } from "./admin.service";
import { ListUsersDtoSchema, type ListUsersDto } from "./dto/list-users.dto";
import { UpdateUserDtoSchema, type UpdateUserDto } from "./dto/update-user.dto";
import { SetActiveModelDtoSchema, type SetActiveModelDto } from "./dto/set-active-model.dto";
import {
  ListTransactionsAdminDtoSchema,
  type ListTransactionsAdminDto,
} from "./dto/list-transactions-admin.dto";
import { AnalyticsQueryDtoSchema, type AnalyticsQueryDto } from "./dto/analytics-query.dto";
import { PaginationDtoSchema, type PaginationDto } from "../../common/dto/pagination.dto";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/token.types";

@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("users")
  listUsers(@Query(new ZodValidationPipe(ListUsersDtoSchema)) query: ListUsersDto) {
    return this.adminService.listUsers(query);
  }

  @Patch("users/:id")
  updateUser(
    @CurrentUser() admin: AccessTokenPayload,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateUserDtoSchema)) dto: UpdateUserDto,
  ) {
    return this.adminService.updateUser(admin.sub, id, dto);
  }

  @Get("models")
  listModels() {
    return this.adminService.listModels();
  }

  @Patch("config/active-model")
  setActiveModel(
    @CurrentUser() admin: AccessTokenPayload,
    @Body(new ZodValidationPipe(SetActiveModelDtoSchema)) dto: SetActiveModelDto,
  ) {
    return this.adminService.setActiveModel(admin.sub, dto.modelId);
  }

  @Get("transactions")
  listTransactions(
    @Query(new ZodValidationPipe(ListTransactionsAdminDtoSchema)) query: ListTransactionsAdminDto,
  ) {
    return this.adminService.listTransactions(query);
  }

  @Get("analytics")
  getAnalytics(@Query(new ZodValidationPipe(AnalyticsQueryDtoSchema)) query: AnalyticsQueryDto) {
    return this.adminService.getAnalytics(query.days ?? 7);
  }

  @Get("audit-log")
  listAuditLog(@Query(new ZodValidationPipe(PaginationDtoSchema)) query: PaginationDto) {
    return this.adminService.listAuditLog(query.cursor, query.limit);
  }

  @Post("spins/:id/replay")
  replaySpin(@Param("id") id: string) {
    return this.adminService.replaySpin(id);
  }
}
