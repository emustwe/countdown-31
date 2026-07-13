import { Global, Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { SIDE_EFFECTS_QUEUE } from "./queue.constants";

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.getOrThrow<string>("REDIS_URL") },
      }),
    }),
    BullModule.registerQueue({ name: SIDE_EFFECTS_QUEUE }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
