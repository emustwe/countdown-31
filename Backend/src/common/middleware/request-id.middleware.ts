import { randomUUID } from "node:crypto";
import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

declare module "express" {
  interface Request {
    id?: string;
  }
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.headers["x-request-id"];
    req.id = typeof incoming === "string" ? incoming : randomUUID();
    res.setHeader("x-request-id", req.id);
    next();
  }
}
