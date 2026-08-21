import cookieParser from "cookie-parser";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { AppModule } from "../../app.module";
import { AllExceptionsFilter } from "../filters/http-exception.filter";

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

  const app = moduleRef.createNestApplication();
  app.use(cookieParser()); // parse the httpOnly refresh cookie like production does
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();
  return app;
}
