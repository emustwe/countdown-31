import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { RegisterDtoSchema, type RegisterDto } from "./dto/register.dto";
import { LoginDtoSchema, type LoginDto } from "./dto/login.dto";
import { UpdateProfileDtoSchema, type UpdateProfileDto } from "./dto/update-profile.dto";
import { ForgotPasswordDtoSchema, type ForgotPasswordDto, ResetPasswordDtoSchema, type ResetPasswordDto } from "./dto/forgot-password.dto";
import { VerifyEmailDtoSchema, type VerifyEmailDto, MfaConfirmDtoSchema, type MfaConfirmDto, MfaDisableDtoSchema, type MfaDisableDto } from "./dto/account-security.dto";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";
import type { AccessTokenPayload, TokenPair } from "./token.types";

// The long-lived refresh token lives ONLY in this httpOnly cookie — never in a response body or in
// browser JS — so an XSS can't steal it. The short-lived access token is returned in the body for
// the client to hold in memory and send as a Bearer header.
const REFRESH_COOKIE = "rt";
function refreshCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd, // Secure only in prod (dev/LAN is plain http)
    sameSite: "strict" as const,
    path: "/auth", // only sent to the auth endpoints that need it
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  };
}
function setRefreshCookie(res: Response, tokens: TokenPair): { accessToken: string } {
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOptions());
  return { accessToken: tokens.accessToken };
}

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async register(@Body(new ZodValidationPipe(RegisterDtoSchema)) dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { user, ...tokens } = await this.authService.register(dto);
    return { user, ...setRefreshCookie(res, tokens) };
  }

  @Post("login")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async login(@Body(new ZodValidationPipe(LoginDtoSchema)) dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { user, ...tokens } = await this.authService.login(dto);
    return { user, ...setRefreshCookie(res, tokens) };
  }

  @Post("refresh")
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rt = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    const tokens = await this.authService.refresh(rt ?? "");
    return setRefreshCookie(res, tokens);
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rt = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    if (rt) await this.authService.logout(rt);
    res.clearCookie(REFRESH_COOKIE, { path: "/auth" });
  }

  // Password recovery via emailed OTP.
  @Post("forgot-password")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  forgotPassword(@Body(new ZodValidationPipe(ForgotPasswordDtoSchema)) dto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post("reset-password")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  resetPassword(@Body(new ZodValidationPipe(ResetPasswordDtoSchema)) dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.email, dto.otp, dto.newPassword);
  }

  @Post("logout-all")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async logoutAll(@CurrentUser() user: AccessTokenPayload, @Res({ passthrough: true }) res: Response) {
    await this.authService.logoutAll(user.sub);
    res.clearCookie(REFRESH_COOKIE, { path: "/auth" });
  }

  // ---- Email verification --------------------------------------------------------------------
  @Post("verify-email/resend")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  resendVerification(@CurrentUser() user: AccessTokenPayload) {
    return this.authService.resendEmailVerification(user.sub);
  }

  @Post("verify-email")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verifyEmail(@CurrentUser() user: AccessTokenPayload, @Body(new ZodValidationPipe(VerifyEmailDtoSchema)) dto: VerifyEmailDto) {
    return this.authService.verifyEmail(user.sub, dto.otp);
  }

  // ---- Two-factor (TOTP) ---------------------------------------------------------------------
  @Post("mfa/begin")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  beginMfa(@CurrentUser() user: AccessTokenPayload) {
    return this.authService.beginMfaEnrollment(user.sub);
  }

  @Post("mfa/confirm")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  confirmMfa(@CurrentUser() user: AccessTokenPayload, @Body(new ZodValidationPipe(MfaConfirmDtoSchema)) dto: MfaConfirmDto) {
    return this.authService.confirmMfa(user.sub, dto.code);
  }

  @Post("mfa/disable")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  disableMfa(@CurrentUser() user: AccessTokenPayload, @Body(new ZodValidationPipe(MfaDisableDtoSchema)) dto: MfaDisableDto) {
    return this.authService.disableMfa(user.sub, dto.code);
  }

  @Get("me")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AccessTokenPayload) {
    return this.authService.getProfile(user.sub);
  }

  @Patch("me")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  updateMe(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(UpdateProfileDtoSchema)) dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(user.sub, dto);
  }
}
