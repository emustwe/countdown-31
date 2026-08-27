import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../api-client";

export interface ShopAccountState {
  price: string;
  prices: Record<string, string>;
  currency: "USDT";
  owned: string[];
  balance: string;
}

export interface ShopPurchaseResult {
  owned: string[];
  balance: string;
  charged: string;
}

export function useShopAccount(enabled = true) {
  return useQuery({
    queryKey: ["shop-account"],
    queryFn: () => apiRequest<ShopAccountState>("/shop"),
    enabled,
  });
}

export function usePurchaseShopItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemKey: string) =>
      apiRequest<ShopPurchaseResult>("/shop/purchase", {
        method: "POST",
        body: { itemKey },
      }),
    onSuccess: (result) => {
      queryClient.setQueryData<ShopAccountState>(["shop-account"], (current) =>
        current ? { ...current, owned: result.owned, balance: result.balance } : current,
      );
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["cosmetics"] });
    },
  });
}
