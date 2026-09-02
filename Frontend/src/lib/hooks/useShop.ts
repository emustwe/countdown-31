"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../api-client";

export type ShopCategory = "skins" | "frames" | "skills" | "vault";

export interface ShopCatalogItem {
  id: string;
  name: string;
  category: ShopCategory;
  rarity: "Common" | "Epic" | "Mythic" | "Legendary";
  price: number;
  currency: "coins" | "gems";
  preview: string;
  description: string;
  unlocked?: boolean;
}

/** Public arcade marketplace catalog (coins & gems items), served from the database. */
export function useShopCatalog() {
  return useQuery({
    queryKey: ["shop-catalog"],
    queryFn: () => apiRequest<ShopCatalogItem[]>("/shop/catalog", { auth: false }),
    staleTime: 5 * 60 * 1000,
  });
}
