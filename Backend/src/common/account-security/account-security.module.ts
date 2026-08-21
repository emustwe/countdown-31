import { Global, Module } from "@nestjs/common";
import { AccountSecurityService } from "./account-security.service";

@Global()
@Module({
  providers: [AccountSecurityService],
  exports: [AccountSecurityService],
})
export class AccountSecurityModule {}
