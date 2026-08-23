import { MiddlewareConsumer, Module, type NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { PrismaModule } from "./common/prisma/prisma.module";
import { MailModule } from "./common/mail/mail.module";
import { AuditModule } from "./common/audit/audit.module";
import { AuthThrottleModule } from "./common/auth-throttle/auth-throttle.module";
import { AccountSecurityModule } from "./common/account-security/account-security.module";
import { RetentionModule } from "./common/retention/retention.module";
import { RequestIdMiddleware } from "./common/middleware/request-id.middleware";
import { AuthModule } from "./modules/auth/auth.module";
import { WalletModule } from "./modules/wallet/wallet.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { CountdownModule } from "./modules/countdown/countdown.module";
import { SponsorsModule } from "./modules/sponsors/sponsors.module";
import { ShopModule } from "./modules/shop/shop.module";
import { PlatformConfigModule } from "./modules/platform-config/platform-config.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    MailModule,
    AuditModule,
    AuthThrottleModule,
    AccountSecurityModule,
    RetentionModule,
    AuthModule,
    WalletModule,
    NotificationsModule,
    PlatformConfigModule,
    CountdownModule,
    SponsorsModule,
    ShopModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes("*");
  }
}
