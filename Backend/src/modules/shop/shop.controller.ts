import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/token.types";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { ShopService } from "./shop.service";

const PurchaseSchema = z.object({ itemKey: z.string().min(1).max(80) }).strict();

// Signed-in player's shop: what they own, plus a free "claim" endpoint that grants an item. The
// catalog listing is public. Everything is free — there is no currency or balance.
@Controller("shop")
export class ShopController {
  constructor(private readonly shop: ShopService) {}

  // Public arcade marketplace catalog (coins & gems items shown on the Shop page).
  @Get("catalog")
  catalog() {
    return this.shop.getCatalog();
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  get(@CurrentUser() user: AccessTokenPayload) {
    return this.shop.getShop(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post("purchase")
  purchase(@CurrentUser() user: AccessTokenPayload, @Body(new ZodValidationPipe(PurchaseSchema)) body: { itemKey: string }) {
    return this.shop.purchase(user.sub, body.itemKey.trim());
  }
}
