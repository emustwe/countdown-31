import * as winston from "winston";
import { utilities as nestWinstonModuleUtilities } from "nest-winston";

const isProduction = process.env.NODE_ENV === "production";

export const winstonConfig: winston.LoggerOptions = {
  level: isProduction ? "info" : "debug",
  format: isProduction
    ? winston.format.combine(winston.format.timestamp(), winston.format.json())
    : winston.format.combine(
        winston.format.timestamp(),
        nestWinstonModuleUtilities.format.nestLike("SlotPlatform", {
          colors: true,
          prettyPrint: true,
        }),
      ),
  transports: [new winston.transports.Console()],
};
