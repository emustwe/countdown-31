import "reflect-metadata";
import helmet from "helmet";
import { NestFactory } from "@nestjs/core";
import { WinstonModule } from "nest-winston";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/http-exception.filter";
import { winstonConfig } from "./common/logger/winston.config";
import { webOrigins } from "./common/web-origins";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger(winstonConfig),
  });

  app.use(helmet());
  app.enableCors({
    origin: webOrigins(),
    credentials: true,
  });
  app.useGlobalFilters(new AllExceptionsFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Aurora Ways — Slot Platform API")
    .setDescription("Demo, play-money slot platform. No real money, no payments.")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, swaggerDocument);

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
}

bootstrap();
