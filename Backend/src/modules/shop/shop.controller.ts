import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/token.types";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { ShopService } from "./shop.service";

const PurchaseSchema = z.object({ itemKey: z.string().min(1).max(80) }).strict();

// Signed-in player's shop: what they own + the flat item price + their balance, and the purchase
// endpoint (charges 0.5 USDT to the treasury and grants the item).
@UseGuards(JwtAuthGuard)
@Controller("shop")
export class ShopController {
  constructor(private readonly shop: ShopService) {}

  @Get()
  get(@CurrentUser() user: AccessTokenPayload) {
    return this.shop.getShop(user.sub);
  }

  @Post("purchase")
  purchase(@CurrentUser() user: AccessTokenPayload, @Body(new ZodValidationPipe(PurchaseSchema)) body: { itemKey: string }) {
    return this.shop.purchase(user.sub, body.itemKey.trim());
  }
}
