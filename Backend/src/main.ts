import "reflect-metadata";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { NestFactory } from "@nestjs/core";
import { WinstonModule } from "nest-winston";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/http-exception.filter";
import { winstonConfig } from "./common/logger/winston.config";
import { corsOrigin } from "./common/web-origins";
import { resolve } from "node:path";

/** Fail fast at boot if required secrets are missing, and refuse dangerous production configs. */
function validateEnv(): void {
  const required = [
    "DATABASE_URL",
    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET",
    "CRED_SECRET",
    "SOLANA_TREASURY_ADDRESS",
  ];
  const missing = required.filter((k) => !process.env[k] || String(process.env[k]).length < 8);
  if (missing.length) {
    throw new Error(
      `Missing/weak required env vars: ${missing.join(", ")}. Set them before starting.`,
    );
  }
  if (process.env.NODE_ENV === "production") {
    if (process.env.ALLOW_MOCK_MONEY === "true")
      throw new Error("ALLOW_MOCK_MONEY must NOT be true in production (it's a money faucet).");
    if (process.env.EMAIL_ENABLED !== "true") {
      console.warn(
        "[config] EMAIL_ENABLED is not true — verification and password-reset emails will not be delivered.",
      );
    }
  }
  // Mainnet guardrail (#20): running against Solana mainnet moves REAL money, so it must be an
  // explicit, deliberate opt-in — never something you fall into by leaving a devnet flag unset.
  const cluster = (process.env.SOLANA_CLUSTER ?? "").toLowerCase();
  const rpc = (process.env.SOLANA_RPC_URL ?? "").toLowerCase();
  const looksMainnet = cluster.includes("mainnet") || rpc.includes("mainnet");
  if (looksMainnet && process.env.ALLOW_MAINNET !== "true") {
    throw new Error(
      "Refusing to start against Solana mainnet without ALLOW_MAINNET=true (this moves real funds).",
    );
  }
}

async function bootstrap(): Promise<void> {
  validateEnv();
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger(winstonConfig),
  });

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cookieParser());
  // Bound request bodies so oversized payloads can't be used to exhaust memory.
  const { json, static: serveStatic, urlencoded } = await import("express");
  app.use(json({ limit: "64kb" }));
  app.use(urlencoded({ extended: true, limit: "64kb" }));
  app.use("/uploads", serveStatic(resolve(process.cwd(), "uploads"), { maxAge: "1d" }));
  app.enableCors({
    origin: corsOrigin(),
    credentials: true,
  });
  app.useGlobalFilters(new AllExceptionsFilter());

  // API docs describe every endpoint and schema — useful in dev, but a reconnaissance aid in
  // production. Expose Swagger only outside production (or when SWAGGER_ENABLED=true is set
  // explicitly, e.g. behind an authenticated internal proxy).
  if (process.env.NODE_ENV !== "production" || process.env.SWAGGER_ENABLED === "true") {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("WM Tournaments — Platform API")
      .setDescription("Tournament platform API.")
      .setVersion("0.1.0")
      .addBearerAuth()
      .build();
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("docs", app, swaggerDocument);
  }

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
}

bootstrap();
