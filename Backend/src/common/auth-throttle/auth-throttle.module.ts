import { Global, Module } from "@nestjs/common";
import { AuthThrottleService } from "./auth-throttle.service";

@Global()
@Module({
  providers: [AuthThrottleService],
  exports: [AuthThrottleService],
})
export class AuthThrottleModule {}
