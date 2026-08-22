import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { WalletService } from "./wallet.service";
import { MoneyMovementDtoSchema, type MoneyMovementDto, WithdrawDtoSchema, type WithdrawDto, VerifyDepositDtoSchema, type VerifyDepositDto } from "./dto/money-movement.dto";
import { PaginationDtoSchema, type PaginationDto } from "../../common/dto/pagination.dto";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/token.types";

@ApiTags("wallet")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("wallet")
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post("deposit")
  deposit(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(MoneyMovementDtoSchema)) dto: MoneyMovementDto,
  ) {
    return this.walletService.deposit(user.sub, dto.amount, dto.idempotencyKey);
  }

  @Post("withdraw")
  withdraw(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(WithdrawDtoSchema)) dto: WithdrawDto,
  ) {
    return this.walletService.withdraw(user.sub, dto.amount, dto.destinationAddress, dto.idempotencyKey, {
      password: dto.password,
      mfaCode: dto.mfaCode,
    });
  }

  @Post("deposit/verify")
  verifyDeposit(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(VerifyDepositDtoSchema)) dto: VerifyDepositDto,
  ) {
    return this.walletService.verifyDeposit(user.sub, dto.fromAddress);
  }

  @Get()
  getWallet(@CurrentUser() user: AccessTokenPayload) {
    return this.walletService.getWallet(user.sub);
  }

  @Get("transactions")
  getTransactions(
    @CurrentUser() user: AccessTokenPayload,
    @Query(new ZodValidationPipe(PaginationDtoSchema)) query: PaginationDto,
  ) {
    return this.walletService.getTransactions(user.sub, query.cursor, query.limit);
  }
}
